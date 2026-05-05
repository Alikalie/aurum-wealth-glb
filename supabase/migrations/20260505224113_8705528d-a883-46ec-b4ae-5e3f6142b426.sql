
-- 1. Drop duplicate triggers (keep one canonical name per event)
DROP TRIGGER IF EXISTS trg_admin_credit ON public.admin_credits;
DROP TRIGGER IF EXISTS deposits_apply ON public.deposits;
DROP TRIGGER IF EXISTS deposits_approved ON public.deposits;
DROP TRIGGER IF EXISTS trg_deposit_approved ON public.deposits;
DROP TRIGGER IF EXISTS deposits_rejected ON public.deposits;
DROP TRIGGER IF EXISTS up_apply ON public.user_products;
DROP TRIGGER IF EXISTS withdrawals_apply ON public.withdrawals;
DROP TRIGGER IF EXISTS withdrawals_approved ON public.withdrawals;
DROP TRIGGER IF EXISTS withdrawals_rejected ON public.withdrawals;
DROP TRIGGER IF EXISTS wd_validate ON public.withdrawals;
DROP TRIGGER IF EXISTS withdrawals_validate ON public.withdrawals;

-- 2. De-duplicate transactions rows created by the duplicate triggers
DELETE FROM public.transactions t
USING public.transactions t2
WHERE t.ctid > t2.ctid
  AND t.user_id = t2.user_id
  AND t.kind = t2.kind
  AND t.amount = t2.amount
  AND COALESCE(t.reference_id::text,'') = COALESCE(t2.reference_id::text,'')
  AND COALESCE(t.note,'') = COALESCE(t2.note,'')
  AND abs(extract(epoch FROM (t.created_at - t2.created_at))) < 5;

-- 3. Recompute balances for ALL users (no admin check, run as definer-equivalent here)
DO $$
DECLARE r RECORD; v_dep NUMERIC; v_wd NUMERIC; v_earn NUMERIC; v_purchase NUMERIC;
BEGIN
  FOR r IN SELECT user_id FROM public.profiles LOOP
    SELECT COALESCE(SUM(amount),0) INTO v_dep FROM public.deposits WHERE user_id=r.user_id AND status='approved';
    SELECT COALESCE(SUM(amount),0) INTO v_wd  FROM public.withdrawals WHERE user_id=r.user_id AND status='approved';
    SELECT COALESCE(SUM(amount),0) INTO v_earn FROM public.transactions
       WHERE user_id=r.user_id AND (kind IN ('daily_earning','product_sale','cycle_complete')
            OR (kind='admin_credit' AND (bucket='earned' OR bucket IS NULL)));
    SELECT COALESCE(SUM(purchase_price),0) INTO v_purchase FROM public.user_products
       WHERE user_id=r.user_id AND status IN ('owned','expired','sold');
    -- invested = approved deposits MINUS what user has spent on products (product purchases reduce main wallet)
    UPDATE public.profiles
      SET invested = GREATEST(0, v_dep - v_purchase),
          earned = v_earn,
          withdrawn = v_wd
      WHERE user_id = r.user_id;
  END LOOP;
END $$;

-- 4. Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  kind TEXT NOT NULL DEFAULT 'info',
  reference_table TEXT,
  reference_id UUID,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users view own notifications" ON public.notifications;
CREATE POLICY "users view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "users update own notifications" ON public.notifications;
CREATE POLICY "users update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "admins insert notifications" ON public.notifications;
CREATE POLICY "admins insert notifications" ON public.notifications FOR INSERT WITH CHECK (has_role(auth.uid(),'admin'));

-- 5. Notification trigger functions
CREATE OR REPLACE FUNCTION public.notify_request_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_title TEXT; v_body TEXT; v_kind TEXT;
BEGIN
  IF NEW.status NOT IN ('approved','rejected') OR (OLD.status IS NOT DISTINCT FROM NEW.status) THEN RETURN NEW; END IF;
  v_kind := NEW.status;
  IF TG_TABLE_NAME = 'deposits' THEN
    v_title := CASE WHEN NEW.status='approved' THEN 'Deposit approved' ELSE 'Deposit rejected' END;
    v_body  := CASE WHEN NEW.status='approved' THEN 'Your deposit of $' || NEW.amount || ' was approved and credited.' ELSE 'Your deposit was rejected.' END;
  ELSIF TG_TABLE_NAME = 'withdrawals' THEN
    v_title := CASE WHEN NEW.status='approved' THEN 'Withdrawal approved' ELSE 'Withdrawal rejected' END;
    v_body  := CASE WHEN NEW.status='approved' THEN 'Your withdrawal of $' || NEW.amount || ' was approved.' ELSE 'Your withdrawal request was rejected.' END;
  ELSIF TG_TABLE_NAME = 'affiliate_applications' THEN
    v_title := CASE WHEN NEW.status='approved' THEN 'Affiliate application approved' ELSE 'Affiliate application rejected' END;
    v_body  := CASE WHEN NEW.status='approved' THEN 'You are now an Aurum affiliate. Promo code: ' || NEW.promo_code ELSE 'Your affiliate application was declined.' END;
  ELSIF TG_TABLE_NAME = 'affiliate_withdrawals' THEN
    v_title := CASE WHEN NEW.status='approved' THEN 'Affiliate withdrawal approved' ELSE 'Affiliate withdrawal rejected' END;
    v_body  := CASE WHEN NEW.status='approved' THEN 'Your commission withdrawal of $' || NEW.amount || ' was approved.' ELSE 'Your commission withdrawal was rejected.' END;
  ELSE RETURN NEW; END IF;
  IF NEW.admin_note IS NOT NULL AND length(trim(NEW.admin_note)) > 0 THEN
    v_body := v_body || E'\n\nAdmin note: ' || NEW.admin_note;
  END IF;
  INSERT INTO public.notifications(user_id,title,body,kind,reference_table,reference_id)
  VALUES (NEW.user_id, v_title, v_body, v_kind, TG_TABLE_NAME, NEW.id);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_deposits ON public.deposits;
CREATE TRIGGER trg_notify_deposits AFTER UPDATE ON public.deposits FOR EACH ROW EXECUTE FUNCTION public.notify_request_status();
DROP TRIGGER IF EXISTS trg_notify_withdrawals ON public.withdrawals;
CREATE TRIGGER trg_notify_withdrawals AFTER UPDATE ON public.withdrawals FOR EACH ROW EXECUTE FUNCTION public.notify_request_status();
DROP TRIGGER IF EXISTS trg_notify_aff_apps ON public.affiliate_applications;
CREATE TRIGGER trg_notify_aff_apps AFTER UPDATE ON public.affiliate_applications FOR EACH ROW EXECUTE FUNCTION public.notify_request_status();
DROP TRIGGER IF EXISTS trg_notify_aff_wd ON public.affiliate_withdrawals;
CREATE TRIGGER trg_notify_aff_wd AFTER UPDATE ON public.affiliate_withdrawals FOR EACH ROW EXECUTE FUNCTION public.notify_request_status();
