-- Fix product purchase to compare/deduct using user's currency converted from USD price.
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
  v_rate NUMERIC;
  v_price_local NUMERIC;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_product FROM public.products WHERE id=p_product_id AND is_active=true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product not available'; END IF;
  SELECT * INTO v_profile FROM public.profiles WHERE user_id=v_uid;
  IF v_profile.is_blocked THEN RAISE EXCEPTION 'Account blocked'; END IF;

  -- Convert USD product price to user's currency using fx_rates
  SELECT rate INTO v_rate FROM public.fx_rates WHERE currency = COALESCE(v_profile.currency,'USD');
  v_price_local := ROUND(v_product.price * COALESCE(v_rate, 1), 2);

  v_available := (v_profile.invested + v_profile.earned - v_profile.withdrawn);
  IF v_available < v_price_local THEN
    RAISE EXCEPTION 'Insufficient balance. Required: %, Available: %', v_price_local, v_available;
  END IF;
  IF v_product.purchase_limit > 0 THEN
    SELECT COUNT(*) INTO v_count FROM public.user_products WHERE user_id=v_uid AND product_id=p_product_id AND status='owned';
    IF v_count >= v_product.purchase_limit THEN RAISE EXCEPTION 'Purchase limit reached'; END IF;
  END IF;
  INSERT INTO public.user_products(user_id,product_id,purchase_price,cycle_start_at)
  VALUES (v_uid,p_product_id,v_price_local,now()) RETURNING id INTO v_new_id;
  -- Deduct in user's local currency
  UPDATE public.profiles SET invested = invested - v_price_local WHERE user_id=v_uid;
  INSERT INTO public.transactions(user_id,kind,amount,currency,reference_id,note)
  VALUES (v_uid,'product_purchase',-v_price_local,COALESCE(v_profile.currency,'USD'),v_new_id,v_product.name);
  RETURN v_new_id;
END $function$;