-- 1. App settings (affiliate toggle + commission %)
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read settings" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "admins write settings" ON public.app_settings FOR ALL
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

INSERT INTO public.app_settings(key,value) VALUES
  ('affiliate_enabled','false'::jsonb),
  ('affiliate_commission_pct','5'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 2. Affiliates (one row per user with their code)
CREATE TABLE IF NOT EXISTS public.affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  total_referrals INT NOT NULL DEFAULT 0,
  total_commission NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read affiliate codes" ON public.affiliates FOR SELECT USING (true);
CREATE POLICY "users insert own affiliate" ON public.affiliates FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admins manage affiliates" ON public.affiliates FOR ALL
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- 3. Referrals
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL,
  referred_user_id UUID NOT NULL UNIQUE,
  code TEXT NOT NULL,
  total_commission NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users view own referrals" ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_user_id OR has_role(auth.uid(),'admin'));
CREATE POLICY "anyone insert referral" ON public.referrals FOR INSERT
  WITH CHECK (auth.uid() = referred_user_id);
CREATE POLICY "admins manage referrals" ON public.referrals FOR ALL
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- 4. Update deposit-approved trigger to pay referral commission
CREATE OR REPLACE FUNCTION public.on_deposit_approved()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  u_currency TEXT;
  v_enabled BOOLEAN;
  v_pct NUMERIC;
  v_ref RECORD;
  v_commission NUMERIC;
  v_ref_currency TEXT;
BEGIN
  IF NEW.status='approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    UPDATE public.profiles SET invested = invested + NEW.amount WHERE user_id = NEW.user_id;
    SELECT currency INTO u_currency FROM public.profiles WHERE user_id=NEW.user_id;
    INSERT INTO public.transactions(user_id,kind,amount,currency,reference_id,note)
    VALUES (NEW.user_id,'deposit',NEW.amount,COALESCE(u_currency,'USD'),NEW.id,'Deposit approved');

    -- Affiliate commission
    SELECT (value::text)::boolean INTO v_enabled FROM public.app_settings WHERE key='affiliate_enabled';
    SELECT (value::text)::numeric INTO v_pct FROM public.app_settings WHERE key='affiliate_commission_pct';
    IF COALESCE(v_enabled,false) AND COALESCE(v_pct,0) > 0 THEN
      SELECT * INTO v_ref FROM public.referrals WHERE referred_user_id = NEW.user_id;
      IF FOUND THEN
        v_commission := ROUND(NEW.amount * v_pct / 100.0, 2);
        IF v_commission > 0 THEN
          UPDATE public.profiles SET earned = earned + v_commission WHERE user_id = v_ref.referrer_id;
          SELECT currency INTO v_ref_currency FROM public.profiles WHERE user_id = v_ref.referrer_id;
          INSERT INTO public.transactions(user_id,kind,amount,currency,reference_id,note)
          VALUES (v_ref.referrer_id,'admin_credit',v_commission,COALESCE(v_ref_currency,'USD'),NEW.id,
                  'Affiliate commission ('||v_pct||'%) from deposit');
          UPDATE public.referrals SET total_commission = total_commission + v_commission WHERE id = v_ref.id;
          UPDATE public.affiliates SET total_commission = total_commission + v_commission WHERE user_id = v_ref.referrer_id;
        END IF;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;

-- 5. Recompute balances from source records (admin only)
CREATE OR REPLACE FUNCTION public.recompute_user_balances(p_user_id UUID DEFAULT NULL)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_count INT := 0;
  r RECORD;
  v_dep NUMERIC; v_wd NUMERIC; v_earn NUMERIC;
BEGIN
  IF NOT has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  FOR r IN SELECT user_id FROM public.profiles WHERE p_user_id IS NULL OR user_id = p_user_id LOOP
    SELECT COALESCE(SUM(amount),0) INTO v_dep FROM public.deposits WHERE user_id=r.user_id AND status='approved';
    SELECT COALESCE(SUM(amount),0) INTO v_wd  FROM public.withdrawals WHERE user_id=r.user_id AND status='approved';
    -- earned = daily payouts + product sales + affiliate commissions + admin credits to earned
    SELECT COALESCE(SUM(amount),0) INTO v_earn FROM public.transactions
      WHERE user_id=r.user_id AND kind IN ('daily_earning','product_sale','cycle_complete')
         OR (user_id=r.user_id AND kind='admin_credit' AND (bucket='earned' OR bucket IS NULL));
    UPDATE public.profiles SET invested=v_dep, withdrawn=v_wd, earned=v_earn WHERE user_id=r.user_id;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END $$;

-- 6. Triggers (idempotent)
DROP TRIGGER IF EXISTS deposits_approved ON public.deposits;
CREATE TRIGGER deposits_approved AFTER UPDATE ON public.deposits
  FOR EACH ROW EXECUTE FUNCTION public.on_deposit_approved();
DROP TRIGGER IF EXISTS deposits_rejected ON public.deposits;
CREATE TRIGGER deposits_rejected AFTER UPDATE ON public.deposits
  FOR EACH ROW EXECUTE FUNCTION public.on_deposit_rejected();
DROP TRIGGER IF EXISTS withdrawals_approved ON public.withdrawals;
CREATE TRIGGER withdrawals_approved AFTER UPDATE ON public.withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.on_withdrawal_approved();
DROP TRIGGER IF EXISTS withdrawals_rejected ON public.withdrawals;
CREATE TRIGGER withdrawals_rejected AFTER UPDATE ON public.withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.on_withdrawal_rejected();
DROP TRIGGER IF EXISTS withdrawals_validate ON public.withdrawals;
CREATE TRIGGER withdrawals_validate BEFORE INSERT ON public.withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.validate_withdrawal();