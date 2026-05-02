-- Repoint withdrawals to the OLDEST payment_method per user, then delete the rest
WITH ranked AS (
  SELECT id, user_id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC) AS rn FROM public.payment_methods
),
keepers AS (SELECT user_id, id AS keep_id FROM ranked WHERE rn=1)
UPDATE public.withdrawals w
   SET payment_method_id = k.keep_id
  FROM public.payment_methods pm
  JOIN keepers k ON k.user_id = pm.user_id
 WHERE w.payment_method_id = pm.id AND pm.id <> k.keep_id;

DELETE FROM public.payment_methods pm
USING (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC) AS rn
  FROM public.payment_methods
) ranked
WHERE pm.id = ranked.id AND ranked.rn > 1;

-- Super admin
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS is_super BOOLEAN NOT NULL DEFAULT FALSE;
WITH first_admin AS (SELECT id FROM public.user_roles WHERE role='admin' ORDER BY created_at ASC LIMIT 1)
UPDATE public.user_roles SET is_super=TRUE WHERE id IN (SELECT id FROM first_admin);

CREATE OR REPLACE FUNCTION public.is_super_admin(_uid UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_uid AND role='admin' AND is_super=TRUE)
$$;

CREATE OR REPLACE FUNCTION public.promote_to_admin(_target UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN RAISE EXCEPTION 'Super admin only'; END IF;
  INSERT INTO public.user_roles(user_id, role, is_super) VALUES (_target,'admin',FALSE) ON CONFLICT DO NOTHING;
END $$;

CREATE OR REPLACE FUNCTION public.demote_admin(_target UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN RAISE EXCEPTION 'Super admin only'; END IF;
  IF _target = auth.uid() THEN RAISE EXCEPTION 'Cannot demote yourself'; END IF;
  DELETE FROM public.user_roles WHERE user_id=_target AND role='admin' AND is_super=FALSE;
END $$;

-- Payment methods
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS payment_locked_until TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS payment_methods_one_per_user ON public.payment_methods(user_id);

CREATE OR REPLACE FUNCTION public.lock_payment_for_90_days()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  UPDATE public.profiles
    SET payment_edit_locked = TRUE,
        payment_locked_until = now() + INTERVAL '90 days'
    WHERE user_id = NEW.user_id;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_lock_payment_90 ON public.payment_methods;
CREATE TRIGGER trg_lock_payment_90 AFTER INSERT ON public.payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.lock_payment_for_90_days();

-- Affiliate applications
CREATE TABLE IF NOT EXISTS public.affiliate_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  full_name TEXT NOT NULL,
  country TEXT NOT NULL,
  promo_code TEXT NOT NULL,
  payment_account TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.affiliate_applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users insert own application" ON public.affiliate_applications;
DROP POLICY IF EXISTS "users view own application" ON public.affiliate_applications;
DROP POLICY IF EXISTS "admins manage applications" ON public.affiliate_applications;
CREATE POLICY "users insert own application" ON public.affiliate_applications FOR INSERT WITH CHECK (auth.uid()=user_id);
CREATE POLICY "users view own application" ON public.affiliate_applications FOR SELECT USING (auth.uid()=user_id OR has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage applications" ON public.affiliate_applications FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.is_affiliate_eligible(_uid UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT (SELECT COUNT(*) FROM public.user_products WHERE user_id=_uid) >= 5
$$;

ALTER TABLE public.affiliates ADD COLUMN IF NOT EXISTS available_balance NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.affiliates ADD COLUMN IF NOT EXISTS payment_account TEXT;
ALTER TABLE public.affiliates ADD COLUMN IF NOT EXISTS payment_account_locked BOOLEAN NOT NULL DEFAULT TRUE;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='affiliates_user_id_key') THEN
    ALTER TABLE public.affiliates ADD CONSTRAINT affiliates_user_id_key UNIQUE (user_id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='affiliates_code_key') THEN
    ALTER TABLE public.affiliates ADD CONSTRAINT affiliates_code_key UNIQUE (code);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.affiliate_withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  payment_account TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.affiliate_withdrawals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user insert own aff wd" ON public.affiliate_withdrawals;
DROP POLICY IF EXISTS "user view own aff wd" ON public.affiliate_withdrawals;
DROP POLICY IF EXISTS "admins manage aff wd" ON public.affiliate_withdrawals;
CREATE POLICY "user insert own aff wd" ON public.affiliate_withdrawals FOR INSERT WITH CHECK (auth.uid()=user_id AND amount >= 30);
CREATE POLICY "user view own aff wd" ON public.affiliate_withdrawals FOR SELECT USING (auth.uid()=user_id OR has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage aff wd" ON public.affiliate_withdrawals FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.validate_aff_withdrawal()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_bal NUMERIC;
BEGIN
  IF NEW.amount < 30 THEN RAISE EXCEPTION 'Minimum affiliate withdrawal is $30'; END IF;
  SELECT available_balance INTO v_bal FROM public.affiliates WHERE user_id=NEW.user_id;
  IF v_bal IS NULL OR v_bal < NEW.amount THEN
    RAISE EXCEPTION 'Insufficient affiliate balance. Available: $%', COALESCE(v_bal,0);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_validate_aff_wd ON public.affiliate_withdrawals;
CREATE TRIGGER trg_validate_aff_wd BEFORE INSERT ON public.affiliate_withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.validate_aff_withdrawal();

CREATE OR REPLACE FUNCTION public.on_aff_withdrawal_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.status='approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    UPDATE public.affiliates SET available_balance = available_balance - NEW.amount WHERE user_id=NEW.user_id;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_on_aff_wd_status ON public.affiliate_withdrawals;
CREATE TRIGGER trg_on_aff_wd_status AFTER UPDATE ON public.affiliate_withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.on_aff_withdrawal_status();

-- Promo code rewards
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS promo_code_used TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS promo_signup_bonus_paid BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS first_deposit_bonus_paid BOOLEAN NOT NULL DEFAULT FALSE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_promo TEXT; v_aff RECORD; v_currency TEXT; v_rate NUMERIC; v_bonus_local NUMERIC;
BEGIN
  v_currency := COALESCE(NEW.raw_user_meta_data->>'currency','USD');
  v_promo := UPPER(TRIM(COALESCE(NEW.raw_user_meta_data->>'promo_code','')));

  INSERT INTO public.profiles (
    user_id, email, full_name, first_name, last_name, phone,
    country_code, country_name, currency, language, promo_code_used
  ) VALUES (
    NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name',''),
    COALESCE(NEW.raw_user_meta_data->>'first_name',''),
    COALESCE(NEW.raw_user_meta_data->>'last_name',''),
    COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone, ''),
    COALESCE(NEW.raw_user_meta_data->>'country_code',''),
    COALESCE(NEW.raw_user_meta_data->>'country_name',''),
    v_currency,
    COALESCE(NEW.raw_user_meta_data->>'language','en'),
    NULLIF(v_promo,'')
  ) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id,'user') ON CONFLICT DO NOTHING;

  IF v_promo <> '' THEN
    SELECT * INTO v_aff FROM public.affiliates WHERE code = v_promo LIMIT 1;
    IF FOUND AND v_aff.user_id <> NEW.id THEN
      INSERT INTO public.referrals(referrer_id, referred_user_id, code)
        VALUES (v_aff.user_id, NEW.id, v_promo) ON CONFLICT DO NOTHING;
      SELECT rate INTO v_rate FROM public.fx_rates WHERE currency = v_currency;
      v_bonus_local := ROUND(1 * COALESCE(v_rate,1), 2);
      UPDATE public.profiles SET earned = earned + v_bonus_local, promo_signup_bonus_paid = TRUE
        WHERE user_id = NEW.id;
      INSERT INTO public.transactions(user_id,kind,amount,currency,bucket,note)
      VALUES (NEW.id,'admin_credit',v_bonus_local,v_currency,'earned','Welcome promo bonus ($1)');
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.on_deposit_approved()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE u_currency TEXT; v_ref RECORD; v_bonus_usd NUMERIC := 3;
BEGIN
  IF NEW.status='approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    UPDATE public.profiles SET invested = invested + NEW.amount WHERE user_id=NEW.user_id;
    SELECT currency INTO u_currency FROM public.profiles WHERE user_id=NEW.user_id;
    INSERT INTO public.transactions(user_id,kind,amount,currency,reference_id,note)
    VALUES (NEW.user_id,'deposit',NEW.amount,COALESCE(u_currency,'USD'),NEW.id,'Deposit approved');

    SELECT * INTO v_ref FROM public.referrals WHERE referred_user_id = NEW.user_id;
    IF FOUND AND NOT v_ref.first_deposit_bonus_paid THEN
      INSERT INTO public.affiliates(user_id, code, available_balance, total_commission)
        VALUES (v_ref.referrer_id, v_ref.code, v_bonus_usd, v_bonus_usd)
      ON CONFLICT (user_id) DO UPDATE
        SET available_balance = public.affiliates.available_balance + v_bonus_usd,
            total_commission  = public.affiliates.total_commission  + v_bonus_usd;
      UPDATE public.referrals SET first_deposit_bonus_paid = TRUE,
             total_commission = total_commission + v_bonus_usd
       WHERE id = v_ref.id;
      INSERT INTO public.transactions(user_id,kind,amount,currency,reference_id,note)
      VALUES (v_ref.referrer_id,'admin_credit',v_bonus_usd,'USD',NEW.id,
              'Affiliate promo bonus ($3) — first deposit by referred user');
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_handle_new_user ON auth.users;
CREATE TRIGGER trg_handle_new_user AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS trg_on_deposit_approved ON public.deposits;
CREATE TRIGGER trg_on_deposit_approved AFTER UPDATE ON public.deposits
  FOR EACH ROW EXECUTE FUNCTION public.on_deposit_approved();

UPDATE public.profiles p SET payment_locked_until = COALESCE(payment_locked_until, pm.created_at + INTERVAL '90 days')
FROM public.payment_methods pm WHERE pm.user_id = p.user_id AND p.payment_edit_locked = TRUE AND p.payment_locked_until IS NULL;
