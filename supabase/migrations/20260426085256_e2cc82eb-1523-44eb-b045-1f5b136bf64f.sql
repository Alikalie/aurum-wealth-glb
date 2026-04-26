-- News posts
CREATE TABLE public.news_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  deadline_at TIMESTAMPTZ,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.news_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read published news" ON public.news_posts FOR SELECT USING (is_published = true OR has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage news" ON public.news_posts FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER news_posts_updated BEFORE UPDATE ON public.news_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Audit logs
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL,
  action TEXT NOT NULL,
  target_table TEXT NOT NULL,
  target_id UUID,
  target_user_id UUID,
  amount NUMERIC,
  note TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read audit" ON public.audit_logs FOR SELECT USING (has_role(auth.uid(),'admin'));
CREATE POLICY "admins write audit" ON public.audit_logs FOR INSERT WITH CHECK (has_role(auth.uid(),'admin'));
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_target_user ON public.audit_logs(target_user_id);

-- Audit trigger function for deposits & withdrawals
CREATE OR REPLACE FUNCTION public.log_request_review()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IN ('approved','rejected') AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.audit_logs(actor_id, action, target_table, target_id, target_user_id, amount, note, metadata)
    VALUES (
      COALESCE(NEW.reviewed_by, auth.uid()),
      TG_TABLE_NAME || '_' || NEW.status,
      TG_TABLE_NAME,
      NEW.id,
      NEW.user_id,
      NEW.amount,
      NEW.admin_note,
      jsonb_build_object('status', NEW.status, 'reviewed_at', COALESCE(NEW.reviewed_at, now()))
    );
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER audit_deposit_review AFTER UPDATE ON public.deposits FOR EACH ROW EXECUTE FUNCTION public.log_request_review();
CREATE TRIGGER audit_withdrawal_review AFTER UPDATE ON public.withdrawals FOR EACH ROW EXECUTE FUNCTION public.log_request_review();

-- Audit admin credits too
CREATE OR REPLACE FUNCTION public.log_admin_credit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.audit_logs(actor_id, action, target_table, target_id, target_user_id, amount, note, metadata)
  VALUES (NEW.created_by, 'admin_credit', 'admin_credits', NEW.id, NEW.user_id, NEW.amount, NEW.note, jsonb_build_object('bucket', NEW.bucket));
  RETURN NEW;
END $$;
CREATE TRIGGER audit_admin_credit AFTER INSERT ON public.admin_credits FOR EACH ROW EXECUTE FUNCTION public.log_admin_credit();

-- Update deposit-approved trigger: credit to "earned" bucket so it counts toward Main balance & is investable + withdrawable
CREATE OR REPLACE FUNCTION public.on_deposit_approved()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u_currency TEXT;
BEGIN
  IF NEW.status='approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    -- Credit deposits to invested bucket (used as the "main" balance for investing & withdrawals)
    UPDATE public.profiles SET invested = invested + NEW.amount WHERE user_id = NEW.user_id;
    SELECT currency INTO u_currency FROM public.profiles WHERE user_id=NEW.user_id;
    INSERT INTO public.transactions(user_id,kind,amount,currency,reference_id,note)
    VALUES (NEW.user_id,'deposit',NEW.amount,COALESCE(u_currency,'USD'),NEW.id,'Deposit approved');
  END IF;
  RETURN NEW;
END $$;

-- New withdrawal rule: Main = invested + earned - withdrawn, must be >= 2 USD-equivalent
CREATE OR REPLACE FUNCTION public.validate_withdrawal()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_main NUMERIC;
  v_currency TEXT;
  v_rate NUMERIC;
  v_usd NUMERIC;
BEGIN
  SELECT (invested + earned - withdrawn), currency INTO v_main, v_currency FROM public.profiles WHERE user_id = NEW.user_id;
  IF v_main IS NULL OR NEW.amount > v_main THEN
    RAISE EXCEPTION 'Insufficient balance. Available: %', COALESCE(v_main,0);
  END IF;
  -- Convert amount in user's currency back to USD using fx_rates (rate = currency per USD)
  SELECT rate INTO v_rate FROM public.fx_rates WHERE currency = COALESCE(v_currency,'USD');
  v_usd := CASE WHEN v_rate IS NULL OR v_rate = 0 THEN NEW.amount ELSE NEW.amount / v_rate END;
  IF v_usd < 2 THEN
    RAISE EXCEPTION 'Minimum withdrawal is $2 USD';
  END IF;
  RETURN NEW;
END $$;

-- Withdrawal approved should subtract from "main" — keep using withdrawn bucket which already nets against invested+earned
-- (no change to on_withdrawal_approved needed)

-- Update purchase_product to use combined balance (invested + earned - withdrawn - sum(active product prices))
CREATE OR REPLACE FUNCTION public.purchase_product(p_product_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
  v_available := (v_profile.invested + v_profile.earned - v_profile.withdrawn)
                 - COALESCE((SELECT SUM(purchase_price) FROM public.user_products WHERE user_id=v_uid AND status='owned'),0);
  IF v_available < v_product.price THEN RAISE EXCEPTION 'Insufficient balance'; END IF;
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

-- Same for buy_resale
CREATE OR REPLACE FUNCTION public.buy_resale(p_user_product_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_up RECORD; v_product RECORD; v_buyer RECORD; v_seller RECORD;
  v_available NUMERIC; v_new_id UUID;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_up FROM public.user_products WHERE id=p_user_product_id AND listed_for_sale=true AND status='owned';
  IF NOT FOUND THEN RAISE EXCEPTION 'Listing not available'; END IF;
  IF v_up.user_id = v_uid THEN RAISE EXCEPTION 'Cannot buy your own listing'; END IF;
  SELECT * INTO v_product FROM public.products WHERE id=v_up.product_id;
  SELECT * INTO v_buyer FROM public.profiles WHERE user_id=v_uid;
  SELECT * INTO v_seller FROM public.profiles WHERE user_id=v_up.user_id;
  IF v_buyer.is_blocked THEN RAISE EXCEPTION 'Account blocked'; END IF;
  v_available := (v_buyer.invested + v_buyer.earned - v_buyer.withdrawn)
                 - COALESCE((SELECT SUM(purchase_price) FROM public.user_products WHERE user_id=v_uid AND status='owned'),0);
  IF v_available < v_up.listing_price THEN RAISE EXCEPTION 'Insufficient balance'; END IF;
  UPDATE public.profiles SET invested = invested - v_up.listing_price WHERE user_id=v_uid;
  UPDATE public.profiles SET earned = earned + v_up.listing_price WHERE user_id=v_up.user_id;
  UPDATE public.user_products SET status='sold', sale_price=v_up.listing_price, sold_at=now()
    WHERE id=p_user_product_id;
  INSERT INTO public.user_products(user_id,product_id,purchase_price,cycle_start_at,days_paid,total_earned,last_payout_at,bought_from_user)
  VALUES (v_uid,v_up.product_id,v_up.listing_price,v_up.cycle_start_at,v_up.days_paid,0,v_up.last_payout_at,v_up.user_id)
  RETURNING id INTO v_new_id;
  INSERT INTO public.transactions(user_id,kind,amount,currency,reference_id,note)
  VALUES (v_uid,'product_purchase',-v_up.listing_price,v_buyer.currency,v_new_id,'Resale: '||v_product.name);
  INSERT INTO public.transactions(user_id,kind,amount,currency,reference_id,note)
  VALUES (v_up.user_id,'product_sale',v_up.listing_price,v_seller.currency,p_user_product_id,'Sold: '||v_product.name);
  RETURN v_new_id;
END $$;

-- News images bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('news-images','news-images',true) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "news images public read" ON storage.objects FOR SELECT USING (bucket_id='news-images');
CREATE POLICY "admins upload news" ON storage.objects FOR INSERT WITH CHECK (bucket_id='news-images' AND has_role(auth.uid(),'admin'));
CREATE POLICY "admins update news" ON storage.objects FOR UPDATE USING (bucket_id='news-images' AND has_role(auth.uid(),'admin'));
CREATE POLICY "admins delete news" ON storage.objects FOR DELETE USING (bucket_id='news-images' AND has_role(auth.uid(),'admin'));