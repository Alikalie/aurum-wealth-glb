-- ============ PROFILES additions ============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS account_number BIGINT UNIQUE;

-- Sequence for account numbers starting at 100001
CREATE SEQUENCE IF NOT EXISTS public.account_number_seq START 100001;

-- Backfill existing profiles
UPDATE public.profiles SET account_number = nextval('public.account_number_seq') WHERE account_number IS NULL;

-- Make sure new profiles get one
CREATE OR REPLACE FUNCTION public.assign_account_number()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.account_number IS NULL THEN
    NEW.account_number := nextval('public.account_number_seq');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_assign_account_number ON public.profiles;
CREATE TRIGGER trg_assign_account_number BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.assign_account_number();

-- Update handle_new_user to capture first/last name + language + phone
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id, email, full_name, first_name, last_name, phone,
    country_code, country_name, currency, language
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone, ''),
    COALESCE(NEW.raw_user_meta_data->>'country_code', ''),
    COALESCE(NEW.raw_user_meta_data->>'country_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'currency', 'USD'),
    COALESCE(NEW.raw_user_meta_data->>'language', 'en')
  ) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ ADMIN PAYMENT ACCOUNTS: country support ============
ALTER TABLE public.admin_payment_accounts
  ADD COLUMN IF NOT EXISTS country_code TEXT;

-- ============ PRODUCTS: cycle fields ============
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS cycle_days INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS daily_income NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS purchase_limit INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS resale_enabled BOOLEAN NOT NULL DEFAULT true;

-- ============ USER_PRODUCTS: cycle tracking + resale ============
ALTER TABLE public.user_products
  ADD COLUMN IF NOT EXISTS cycle_start_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS days_paid INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_earned NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_payout_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS listed_for_sale BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS listing_price NUMERIC,
  ADD COLUMN IF NOT EXISTS listed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS bought_from_user UUID;

-- Add 'expired' to user_product_status if missing
DO $$ BEGIN
  ALTER TYPE public.user_product_status ADD VALUE IF NOT EXISTS 'expired';
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============ TRANSACTIONS LEDGER ============
DO $$ BEGIN
  CREATE TYPE public.txn_kind AS ENUM ('deposit','withdrawal','daily_earning','admin_credit','product_purchase','product_sale','cycle_complete');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  kind public.txn_kind NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  bucket TEXT,
  reference_id UUID,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tx_user ON public.transactions(user_id, created_at DESC);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users view own transactions" ON public.transactions;
CREATE POLICY "users view own transactions" ON public.transactions
FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "admins insert transactions" ON public.transactions;
CREATE POLICY "admins insert transactions" ON public.transactions
FOR INSERT WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ ADMIN CREDITS ============
CREATE TABLE IF NOT EXISTS public.admin_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  bucket TEXT NOT NULL CHECK (bucket IN ('invested','earned','withdrawn')),
  amount NUMERIC NOT NULL,
  note TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_credits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins manage credits" ON public.admin_credits;
CREATE POLICY "admins manage credits" ON public.admin_credits
FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "users view own credits" ON public.admin_credits;
CREATE POLICY "users view own credits" ON public.admin_credits
FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- Apply admin credit to balance + log transaction
CREATE OR REPLACE FUNCTION public.apply_admin_credit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE u_currency TEXT;
BEGIN
  SELECT currency INTO u_currency FROM public.profiles WHERE user_id = NEW.user_id;
  IF NEW.bucket='invested' THEN
    UPDATE public.profiles SET invested = invested + NEW.amount WHERE user_id=NEW.user_id;
  ELSIF NEW.bucket='earned' THEN
    UPDATE public.profiles SET earned = earned + NEW.amount WHERE user_id=NEW.user_id;
  ELSIF NEW.bucket='withdrawn' THEN
    UPDATE public.profiles SET withdrawn = withdrawn + NEW.amount WHERE user_id=NEW.user_id;
  END IF;
  INSERT INTO public.transactions(user_id,kind,amount,currency,bucket,reference_id,note)
  VALUES (NEW.user_id,'admin_credit',NEW.amount,COALESCE(u_currency,'USD'),NEW.bucket,NEW.id,NEW.note);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_apply_admin_credit ON public.admin_credits;
CREATE TRIGGER trg_apply_admin_credit AFTER INSERT ON public.admin_credits
FOR EACH ROW EXECUTE FUNCTION public.apply_admin_credit();

-- ============ Update existing trigger functions to log transactions ============
CREATE OR REPLACE FUNCTION public.on_deposit_approved()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE u_currency TEXT;
BEGIN
  IF NEW.status='approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    UPDATE public.profiles SET invested = invested + NEW.amount WHERE user_id = NEW.user_id;
    SELECT currency INTO u_currency FROM public.profiles WHERE user_id=NEW.user_id;
    INSERT INTO public.transactions(user_id,kind,amount,currency,reference_id,note)
    VALUES (NEW.user_id,'deposit',NEW.amount,COALESCE(u_currency,'USD'),NEW.id,'Deposit approved');
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.on_withdrawal_approved()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE u_currency TEXT;
BEGIN
  IF NEW.status='approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    UPDATE public.profiles SET withdrawn = withdrawn + NEW.amount WHERE user_id = NEW.user_id;
    SELECT currency INTO u_currency FROM public.profiles WHERE user_id=NEW.user_id;
    INSERT INTO public.transactions(user_id,kind,amount,currency,reference_id,note)
    VALUES (NEW.user_id,'withdrawal',-NEW.amount,COALESCE(u_currency,'USD'),NEW.id,'Withdrawal approved');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_deposit_approved ON public.deposits;
CREATE TRIGGER trg_deposit_approved AFTER UPDATE ON public.deposits
FOR EACH ROW EXECUTE FUNCTION public.on_deposit_approved();

DROP TRIGGER IF EXISTS trg_withdrawal_approved ON public.withdrawals;
CREATE TRIGGER trg_withdrawal_approved AFTER UPDATE ON public.withdrawals
FOR EACH ROW EXECUTE FUNCTION public.on_withdrawal_approved();

-- ============ Product purchase function (called from app) ============
CREATE OR REPLACE FUNCTION public.purchase_product(p_product_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_product RECORD;
  v_profile RECORD;
  v_available NUMERIC;
  v_count INTEGER;
  v_new_id UUID;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_product FROM public.products WHERE id=p_product_id AND is_active=true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product not available'; END IF;
  SELECT * INTO v_profile FROM public.profiles WHERE user_id=v_uid;
  IF v_profile.is_blocked THEN RAISE EXCEPTION 'Account blocked'; END IF;
  v_available := v_profile.invested - COALESCE((SELECT SUM(purchase_price) FROM public.user_products WHERE user_id=v_uid AND status='owned'),0);
  IF v_available < v_product.price THEN RAISE EXCEPTION 'Insufficient invested balance'; END IF;
  IF v_product.purchase_limit > 0 THEN
    SELECT COUNT(*) INTO v_count FROM public.user_products WHERE user_id=v_uid AND product_id=p_product_id AND status='owned';
    IF v_count >= v_product.purchase_limit THEN RAISE EXCEPTION 'Purchase limit reached'; END IF;
  END IF;
  INSERT INTO public.user_products(user_id,product_id,purchase_price,cycle_start_at)
  VALUES (v_uid,p_product_id,v_product.price,now()) RETURNING id INTO v_new_id;
  INSERT INTO public.transactions(user_id,kind,amount,currency,reference_id,note)
  VALUES (v_uid,'product_purchase',-v_product.price,v_profile.currency,v_new_id,v_product.name);
  RETURN v_new_id;
END $$;

-- ============ Buy resale (continues remaining cycle) ============
CREATE OR REPLACE FUNCTION public.buy_resale(p_user_product_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_up RECORD;
  v_product RECORD;
  v_buyer RECORD;
  v_seller RECORD;
  v_available NUMERIC;
  v_new_id UUID;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_up FROM public.user_products WHERE id=p_user_product_id AND listed_for_sale=true AND status='owned';
  IF NOT FOUND THEN RAISE EXCEPTION 'Listing not available'; END IF;
  IF v_up.user_id = v_uid THEN RAISE EXCEPTION 'Cannot buy your own listing'; END IF;
  SELECT * INTO v_product FROM public.products WHERE id=v_up.product_id;
  SELECT * INTO v_buyer FROM public.profiles WHERE user_id=v_uid;
  SELECT * INTO v_seller FROM public.profiles WHERE user_id=v_up.user_id;
  IF v_buyer.is_blocked THEN RAISE EXCEPTION 'Account blocked'; END IF;
  v_available := v_buyer.invested - COALESCE((SELECT SUM(purchase_price) FROM public.user_products WHERE user_id=v_uid AND status='owned'),0);
  IF v_available < v_up.listing_price THEN RAISE EXCEPTION 'Insufficient balance'; END IF;
  -- Money: buyer's invested decreases, seller's earned increases
  UPDATE public.profiles SET invested = invested - v_up.listing_price WHERE user_id=v_uid;
  UPDATE public.profiles SET earned = earned + v_up.listing_price WHERE user_id=v_up.user_id;
  -- Mark seller's record as sold
  UPDATE public.user_products SET status='sold', sale_price=v_up.listing_price, sold_at=now()
    WHERE id=p_user_product_id;
  -- Create new owned record for buyer continuing the cycle
  INSERT INTO public.user_products(user_id,product_id,purchase_price,cycle_start_at,days_paid,total_earned,last_payout_at,bought_from_user)
  VALUES (v_uid,v_up.product_id,v_up.listing_price,v_up.cycle_start_at,v_up.days_paid,0,v_up.last_payout_at,v_up.user_id)
  RETURNING id INTO v_new_id;
  -- Transactions
  INSERT INTO public.transactions(user_id,kind,amount,currency,reference_id,note)
  VALUES (v_uid,'product_purchase',-v_up.listing_price,v_buyer.currency,v_new_id,'Resale: '||v_product.name);
  INSERT INTO public.transactions(user_id,kind,amount,currency,reference_id,note)
  VALUES (v_up.user_id,'product_sale',v_up.listing_price,v_seller.currency,p_user_product_id,'Sold: '||v_product.name);
  RETURN v_new_id;
END $$;

-- ============ List for sale / unlist ============
CREATE OR REPLACE FUNCTION public.list_product_for_sale(p_user_product_id UUID, p_price NUMERIC)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_uid UUID := auth.uid(); v_up RECORD; v_prod RECORD;
BEGIN
  SELECT * INTO v_up FROM public.user_products WHERE id=p_user_product_id AND user_id=v_uid AND status='owned';
  IF NOT FOUND THEN RAISE EXCEPTION 'Not your product'; END IF;
  SELECT * INTO v_prod FROM public.products WHERE id=v_up.product_id;
  IF NOT v_prod.resale_enabled THEN RAISE EXCEPTION 'Resale not allowed for this product'; END IF;
  IF p_price <= 0 THEN RAISE EXCEPTION 'Invalid price'; END IF;
  UPDATE public.user_products SET listed_for_sale=true, listing_price=p_price, listed_at=now()
    WHERE id=p_user_product_id;
END $$;

CREATE OR REPLACE FUNCTION public.unlist_product(p_user_product_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  UPDATE public.user_products SET listed_for_sale=false, listing_price=NULL, listed_at=NULL
    WHERE id=p_user_product_id AND user_id=auth.uid() AND status='owned';
END $$;

-- ============ Cron daily payout function ============
CREATE OR REPLACE FUNCTION public.run_daily_payouts()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_row RECORD; v_product RECORD; v_payout NUMERIC; v_count INTEGER := 0; v_currency TEXT;
BEGIN
  FOR v_row IN
    SELECT up.* FROM public.user_products up
    WHERE up.status='owned'
      AND (up.last_payout_at IS NULL OR up.last_payout_at < now() - interval '23 hours')
  LOOP
    SELECT * INTO v_product FROM public.products WHERE id=v_row.product_id;
    IF v_row.days_paid >= v_product.cycle_days THEN
      UPDATE public.user_products SET status='expired' WHERE id=v_row.id;
      CONTINUE;
    END IF;
    v_payout := v_product.daily_income;
    UPDATE public.profiles SET earned = earned + v_payout WHERE user_id = v_row.user_id;
    UPDATE public.user_products SET
      days_paid = days_paid + 1,
      total_earned = total_earned + v_payout,
      last_payout_at = now(),
      status = CASE WHEN days_paid + 1 >= v_product.cycle_days THEN 'expired'::user_product_status ELSE status END
    WHERE id = v_row.id;
    SELECT currency INTO v_currency FROM public.profiles WHERE user_id=v_row.user_id;
    INSERT INTO public.transactions(user_id,kind,amount,currency,reference_id,note)
    VALUES (v_row.user_id,'daily_earning',v_payout,COALESCE(v_currency,'USD'),v_row.id,'Daily income: '||v_product.name);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END $$;

-- Block check helper
CREATE OR REPLACE FUNCTION public.is_blocked(_uid UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT COALESCE((SELECT is_blocked FROM public.profiles WHERE user_id=_uid),false)
$$;

-- Add policy: users marked blocked can't insert deposits/withdrawals/products
DROP POLICY IF EXISTS "users insert own deposits" ON public.deposits;
CREATE POLICY "users insert own deposits" ON public.deposits
FOR INSERT WITH CHECK (auth.uid()=user_id AND status='pending' AND NOT public.is_blocked(auth.uid()));

DROP POLICY IF EXISTS "users insert own withdrawals" ON public.withdrawals;
CREATE POLICY "users insert own withdrawals" ON public.withdrawals
FOR INSERT WITH CHECK (auth.uid()=user_id AND status='pending' AND NOT public.is_blocked(auth.uid()));

-- Allow signed-in users to view listed resale products from anyone
DROP POLICY IF EXISTS "anyone view listed resale" ON public.user_products;
CREATE POLICY "anyone view listed resale" ON public.user_products
FOR SELECT USING (listed_for_sale=true AND status='owned');

-- Schedule cron job (every hour, will only pay due ones)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Drop existing schedule if any
DO $$ BEGIN
  PERFORM cron.unschedule('aurum-daily-payouts');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule('aurum-daily-payouts','0 * * * *', $cron$ SELECT public.run_daily_payouts(); $cron$);