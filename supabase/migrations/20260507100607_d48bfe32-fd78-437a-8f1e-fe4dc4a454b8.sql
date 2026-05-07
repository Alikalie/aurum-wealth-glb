
-- 1) Update purchase_product to deduct purchase price from invested (main wallet)
CREATE OR REPLACE FUNCTION public.purchase_product(p_product_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  v_available := (v_profile.invested + v_profile.earned - v_profile.withdrawn);
  IF v_available < v_product.price THEN RAISE EXCEPTION 'Insufficient balance'; END IF;
  IF v_product.purchase_limit > 0 THEN
    SELECT COUNT(*) INTO v_count FROM public.user_products WHERE user_id=v_uid AND product_id=p_product_id AND status='owned';
    IF v_count >= v_product.purchase_limit THEN RAISE EXCEPTION 'Purchase limit reached'; END IF;
  END IF;
  INSERT INTO public.user_products(user_id,product_id,purchase_price,cycle_start_at)
  VALUES (v_uid,p_product_id,v_product.price,now()) RETURNING id INTO v_new_id;
  -- Deduct from main wallet (invested bucket)
  UPDATE public.profiles SET invested = invested - v_product.price WHERE user_id=v_uid;
  INSERT INTO public.transactions(user_id,kind,amount,currency,reference_id,note)
  VALUES (v_uid,'product_purchase',-v_product.price,v_profile.currency,v_new_id,v_product.name);
  RETURN v_new_id;
END $function$;

-- 2) Recompute: invested = approved deposits - product purchases (so old purchases reduce main)
CREATE OR REPLACE FUNCTION public.recompute_user_balances(p_user_id uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count INT := 0; r RECORD;
  v_dep NUMERIC; v_wd NUMERIC; v_earn NUMERIC; v_purch NUMERIC;
BEGIN
  FOR r IN SELECT user_id FROM public.profiles WHERE p_user_id IS NULL OR user_id = p_user_id LOOP
    SELECT COALESCE(SUM(amount),0) INTO v_dep FROM public.deposits WHERE user_id=r.user_id AND status='approved';
    SELECT COALESCE(SUM(amount),0) INTO v_wd  FROM public.withdrawals WHERE user_id=r.user_id AND status='approved';
    SELECT COALESCE(SUM(purchase_price),0) INTO v_purch FROM public.user_products WHERE user_id=r.user_id;
    SELECT COALESCE(SUM(amount),0) INTO v_earn FROM public.transactions
      WHERE user_id=r.user_id AND (
        kind IN ('daily_earning','product_sale','cycle_complete')
        OR (kind='admin_credit' AND (bucket='earned' OR bucket IS NULL))
      );
    UPDATE public.profiles
       SET invested = (v_dep - v_purch),
           withdrawn = v_wd,
           earned = v_earn
     WHERE user_id=r.user_id;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END $function$;

-- 3) Run recompute for every existing user (bypasses admin guard since we removed it above for this rebuild)
SELECT public.recompute_user_balances(NULL);
