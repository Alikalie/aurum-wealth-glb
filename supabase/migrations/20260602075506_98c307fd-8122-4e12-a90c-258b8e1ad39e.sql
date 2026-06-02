
-- 1) Withdraw: deduct immediately on insert (pending), refund on rejection
CREATE OR REPLACE FUNCTION public.on_withdrawal_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE u_currency TEXT;
BEGIN
  UPDATE public.profiles SET withdrawn = withdrawn + NEW.amount WHERE user_id = NEW.user_id;
  SELECT currency INTO u_currency FROM public.profiles WHERE user_id=NEW.user_id;
  INSERT INTO public.transactions(user_id,kind,amount,currency,reference_id,note)
  VALUES (NEW.user_id,'withdrawal',-NEW.amount,COALESCE(u_currency,'USD'),NEW.id,'Withdrawal requested — funds held');
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_withdrawal_insert ON public.withdrawals;
CREATE TRIGGER trg_withdrawal_insert AFTER INSERT ON public.withdrawals
FOR EACH ROW EXECUTE FUNCTION public.on_withdrawal_insert();

-- Approved: no balance change (already deducted at request), just log
CREATE OR REPLACE FUNCTION public.on_withdrawal_approved()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE u_currency TEXT;
BEGIN
  IF NEW.status='approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    SELECT currency INTO u_currency FROM public.profiles WHERE user_id=NEW.user_id;
    INSERT INTO public.transactions(user_id,kind,amount,currency,reference_id,note)
    VALUES (NEW.user_id,'withdrawal',0,COALESCE(u_currency,'USD'),NEW.id,'Withdrawal approved (funds were held at request)');
  END IF;
  RETURN NEW;
END $$;

-- Rejected: refund (subtract from withdrawn)
CREATE OR REPLACE FUNCTION public.on_withdrawal_rejected()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE u_currency TEXT;
BEGIN
  IF NEW.status='rejected' AND (OLD.status IS DISTINCT FROM 'rejected') THEN
    UPDATE public.profiles SET withdrawn = GREATEST(0, withdrawn - NEW.amount) WHERE user_id = NEW.user_id;
    SELECT currency INTO u_currency FROM public.profiles WHERE user_id=NEW.user_id;
    INSERT INTO public.transactions(user_id,kind,amount,currency,reference_id,note)
    VALUES (NEW.user_id,'withdrawal',NEW.amount,COALESCE(u_currency,'USD'),NEW.id,
      COALESCE('Withdrawal rejected — refunded. '||NEW.admin_note,'Withdrawal rejected — refunded'));
  END IF;
  RETURN NEW;
END $$;

-- Reconciliation: count pending + approved as withdrawn
CREATE OR REPLACE FUNCTION public.recompute_user_balances(p_user_id uuid DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_count INT := 0; r RECORD; v_dep NUMERIC; v_wd NUMERIC; v_earn NUMERIC; v_purch NUMERIC;
BEGIN
  FOR r IN SELECT user_id FROM public.profiles WHERE p_user_id IS NULL OR user_id = p_user_id LOOP
    SELECT COALESCE(SUM(amount),0) INTO v_dep FROM public.deposits WHERE user_id=r.user_id AND status='approved';
    SELECT COALESCE(SUM(amount),0) INTO v_wd  FROM public.withdrawals WHERE user_id=r.user_id AND status IN ('pending','approved');
    SELECT COALESCE(SUM(purchase_price),0) INTO v_purch FROM public.user_products WHERE user_id=r.user_id;
    SELECT COALESCE(SUM(amount),0) INTO v_earn FROM public.transactions
      WHERE user_id=r.user_id AND (kind IN ('daily_earning','product_sale','cycle_complete') OR (kind='admin_credit' AND (bucket='earned' OR bucket IS NULL)));
    UPDATE public.profiles SET invested=(v_dep - v_purch), withdrawn=v_wd, earned=v_earn WHERE user_id=r.user_id;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END $$;

-- Re-sync all balances so pending withdrawals are deducted retroactively
SELECT public.recompute_user_balances(NULL);

-- 2) Ensure master service switch is saved & ENABLED with no blocked countries
INSERT INTO public.app_settings(key, value, updated_at)
VALUES ('service_status', '{"enabled": true, "blocked_countries": []}'::jsonb, now())
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
