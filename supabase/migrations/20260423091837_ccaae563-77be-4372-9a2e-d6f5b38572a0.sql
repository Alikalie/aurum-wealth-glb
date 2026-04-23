
-- ============ ROLES ============
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $$;

CREATE POLICY "users see own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ TIMESTAMP HELPER ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  country_code TEXT,
  country_name TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  currency_locked_until TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '60 days'),
  payment_edit_locked BOOLEAN NOT NULL DEFAULT false,
  invested NUMERIC NOT NULL DEFAULT 0,
  earned NUMERIC NOT NULL DEFAULT 0,
  withdrawn NUMERIC NOT NULL DEFAULT 0,
  theme TEXT NOT NULL DEFAULT 'dark',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own profile" ON public.profiles FOR SELECT USING (auth.uid()=user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid()=user_id);
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE USING (auth.uid()=user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins delete profiles" ON public.profiles FOR DELETE USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile + default user role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, country_code, country_name, currency)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'country_code', ''),
    COALESCE(NEW.raw_user_meta_data->>'country_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'currency', 'USD')
  ) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ PAYMENT METHODS ============
CREATE TYPE public.payment_method_type AS ENUM ('mobile_money','bank','paypal');

CREATE TABLE public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  method_type payment_method_type NOT NULL,
  provider_name TEXT,
  account_holder_name TEXT NOT NULL,
  account_number TEXT,
  paypal_email TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own pm" ON public.payment_methods FOR SELECT USING (auth.uid()=user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "users insert own pm" ON public.payment_methods FOR INSERT WITH CHECK (auth.uid()=user_id);
-- Update only if profile.payment_edit_locked is false OR caller is admin
CREATE POLICY "users update own pm if unlocked" ON public.payment_methods FOR UPDATE USING (
  public.has_role(auth.uid(),'admin') OR
  (auth.uid()=user_id AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id=auth.uid() AND p.payment_edit_locked=false))
);
CREATE POLICY "admins delete pm" ON public.payment_methods FOR DELETE USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER pm_updated_at BEFORE UPDATE ON public.payment_methods FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ ADMIN PAYMENT ACCOUNTS (deposit instructions shown to users) ============
CREATE TABLE public.admin_payment_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  method_type payment_method_type NOT NULL,
  label TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  instructions TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_payment_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read admin accounts" ON public.admin_payment_accounts FOR SELECT USING (true);
CREATE POLICY "admins manage admin accounts" ON public.admin_payment_accounts FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER apa_updated_at BEFORE UPDATE ON public.admin_payment_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ DEPOSITS ============
CREATE TYPE public.txn_status AS ENUM ('pending','approved','rejected','cancelled');

CREATE TABLE public.deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  method_type payment_method_type NOT NULL,
  admin_account_id UUID REFERENCES public.admin_payment_accounts(id),
  proof_url TEXT,
  status txn_status NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users view own deposits" ON public.deposits FOR SELECT USING (auth.uid()=user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "users insert own deposits" ON public.deposits FOR INSERT WITH CHECK (auth.uid()=user_id AND status='pending');
CREATE POLICY "users cancel own pending" ON public.deposits FOR UPDATE USING (
  public.has_role(auth.uid(),'admin') OR (auth.uid()=user_id AND status='pending')
);
CREATE TRIGGER dep_updated_at BEFORE UPDATE ON public.deposits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: when deposit becomes 'approved', credit profile.invested
CREATE OR REPLACE FUNCTION public.on_deposit_approved()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status='approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    UPDATE public.profiles SET invested = invested + NEW.amount WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER deposits_apply AFTER UPDATE ON public.deposits FOR EACH ROW EXECUTE FUNCTION public.on_deposit_approved();

-- ============ WITHDRAWALS ============
CREATE TABLE public.withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  payment_method_id UUID REFERENCES public.payment_methods(id),
  status txn_status NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

-- Validate withdrawal amount <= available balance (earned - withdrawn) at insert time
CREATE OR REPLACE FUNCTION public.validate_withdrawal()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE available NUMERIC;
BEGIN
  SELECT (earned - withdrawn) INTO available FROM public.profiles WHERE user_id = NEW.user_id;
  IF available IS NULL OR NEW.amount > available THEN
    RAISE EXCEPTION 'Insufficient available balance';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER wd_validate BEFORE INSERT ON public.withdrawals FOR EACH ROW EXECUTE FUNCTION public.validate_withdrawal();

CREATE POLICY "users view own withdrawals" ON public.withdrawals FOR SELECT USING (auth.uid()=user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "users insert own withdrawals" ON public.withdrawals FOR INSERT WITH CHECK (auth.uid()=user_id AND status='pending');
CREATE POLICY "users cancel own pending wd" ON public.withdrawals FOR UPDATE USING (
  public.has_role(auth.uid(),'admin') OR (auth.uid()=user_id AND status='pending')
);
CREATE TRIGGER wd_updated_at BEFORE UPDATE ON public.withdrawals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.on_withdrawal_approved()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status='approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    UPDATE public.profiles SET withdrawn = withdrawn + NEW.amount WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER withdrawals_apply AFTER UPDATE ON public.withdrawals FOR EACH ROW EXECUTE FUNCTION public.on_withdrawal_approved();

-- ============ PRODUCTS (admin catalog) ============
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL CHECK (price >= 0),
  expected_return_pct NUMERIC NOT NULL DEFAULT 0,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read products" ON public.products FOR SELECT USING (true);
CREATE POLICY "admins manage products" ON public.products FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER prod_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ USER PRODUCTS (purchases) ============
CREATE TYPE public.user_product_status AS ENUM ('owned','sold');

CREATE TABLE public.user_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  purchase_price NUMERIC NOT NULL,
  sale_price NUMERIC,
  status user_product_status NOT NULL DEFAULT 'owned',
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sold_at TIMESTAMPTZ
);
ALTER TABLE public.user_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users view own up" ON public.user_products FOR SELECT USING (auth.uid()=user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "users insert own up" ON public.user_products FOR INSERT WITH CHECK (auth.uid()=user_id);
CREATE POLICY "users sell own up" ON public.user_products FOR UPDATE USING (auth.uid()=user_id OR public.has_role(auth.uid(),'admin'));

-- When a user_product flips to 'sold', credit earned with sale_price
CREATE OR REPLACE FUNCTION public.on_product_sold()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status='sold' AND (OLD.status IS DISTINCT FROM 'sold') THEN
    UPDATE public.profiles SET earned = earned + COALESCE(NEW.sale_price, NEW.purchase_price)
      WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER up_apply AFTER UPDATE ON public.user_products FOR EACH ROW EXECUTE FUNCTION public.on_product_sold();

-- ============ SUPPORT & PRIVACY (single-row admin-managed content) ============
CREATE TABLE public.support_content (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  body TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.support_content (id, body) VALUES (1, 'Support content has not been published yet.') ON CONFLICT DO NOTHING;
ALTER TABLE public.support_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read support" ON public.support_content FOR SELECT USING (true);
CREATE POLICY "admins write support" ON public.support_content FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.privacy_content (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  body TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.privacy_content (id, body) VALUES (1, 'Privacy policy has not been published yet.') ON CONFLICT DO NOTHING;
ALTER TABLE public.privacy_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read privacy" ON public.privacy_content FOR SELECT USING (true);
CREATE POLICY "admins write privacy" ON public.privacy_content FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ STORAGE: payment proofs ============
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-proofs','payment-proofs', true) ON CONFLICT DO NOTHING;
CREATE POLICY "anyone read proofs" ON storage.objects FOR SELECT USING (bucket_id = 'payment-proofs');
CREATE POLICY "users upload own proofs" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'payment-proofs' AND auth.uid()::text = (storage.foldername(name))[1]
);
