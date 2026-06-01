
-- 1) Add locked_bonus column (non-withdrawable signup bonus tracker)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS locked_bonus NUMERIC NOT NULL DEFAULT 0;

-- 2) Convert daily payouts into the user's local currency (so days_paid/days persistence reaches admin-set target in their currency)
CREATE OR REPLACE FUNCTION public.run_daily_payouts()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_row RECORD; v_product RECORD; v_payout NUMERIC; v_count INTEGER := 0;
  v_currency TEXT; v_rate NUMERIC; v_interval INTERVAL;
BEGIN
  FOR v_row IN SELECT up.* FROM public.user_products up WHERE up.status='owned'
  LOOP
    SELECT * INTO v_product FROM public.products WHERE id=v_row.product_id;
    v_interval := make_interval(hours => GREATEST(1, COALESCE(v_product.payout_interval_hours, 24)));
    IF v_row.last_payout_at IS NOT NULL AND v_row.last_payout_at > now() - v_interval + interval '1 minute' THEN
      CONTINUE;
    END IF;
    IF v_row.days_paid >= v_product.cycle_days THEN
      UPDATE public.user_products SET status='expired' WHERE id=v_row.id;
      CONTINUE;
    END IF;
    SELECT currency INTO v_currency FROM public.profiles WHERE user_id=v_row.user_id;
    SELECT rate INTO v_rate FROM public.fx_rates WHERE currency = COALESCE(v_currency,'USD');
    v_payout := ROUND(v_product.daily_income * COALESCE(v_rate,1), 2);
    UPDATE public.profiles SET earned = earned + v_payout WHERE user_id = v_row.user_id;
    UPDATE public.user_products SET
      days_paid = days_paid + 1,
      total_earned = total_earned + v_payout,
      last_payout_at = now(),
      status = CASE WHEN days_paid + 1 >= v_product.cycle_days THEN 'expired'::user_product_status ELSE status END
    WHERE id = v_row.id;
    INSERT INTO public.transactions(user_id,kind,amount,currency,reference_id,note)
    VALUES (v_row.user_id,'daily_earning',v_payout,COALESCE(v_currency,'USD'),v_row.id,'Income: '||v_product.name);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END $function$;

-- 3) Update handle_new_user: $1 USD bonus, locked from withdrawal, never double-paid
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_promo TEXT; v_aff RECORD; v_currency TEXT; v_rate NUMERIC; v_bonus_local NUMERIC;
  v_existing BOOLEAN;
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
    SELECT promo_signup_bonus_paid INTO v_existing FROM public.profiles WHERE user_id = NEW.id;
    IF NOT COALESCE(v_existing,false) THEN
      SELECT * INTO v_aff FROM public.affiliates WHERE code = v_promo LIMIT 1;
      IF FOUND AND v_aff.user_id <> NEW.id THEN
        INSERT INTO public.referrals(referrer_id, referred_user_id, code)
          VALUES (v_aff.user_id, NEW.id, v_promo) ON CONFLICT DO NOTHING;
        SELECT rate INTO v_rate FROM public.fx_rates WHERE currency = v_currency;
        v_bonus_local := ROUND(1 * COALESCE(v_rate,1), 2);  -- always $1 USD equivalent
        UPDATE public.profiles
           SET earned = earned + v_bonus_local,
               locked_bonus = locked_bonus + v_bonus_local,
               promo_signup_bonus_paid = TRUE
         WHERE user_id = NEW.id;
        INSERT INTO public.transactions(user_id,kind,amount,currency,bucket,note)
        VALUES (NEW.id,'admin_credit',v_bonus_local,v_currency,'earned','Welcome promo bonus ($1, non-withdrawable)');
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $function$;

-- 4) Block withdrawing locked bonus
CREATE OR REPLACE FUNCTION public.validate_withdrawal()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_main NUMERIC; v_currency TEXT; v_rate NUMERIC; v_usd NUMERIC; v_locked NUMERIC;
BEGIN
  SELECT (invested + earned - withdrawn - COALESCE(locked_bonus,0)),
         currency, COALESCE(locked_bonus,0)
    INTO v_main, v_currency, v_locked
    FROM public.profiles WHERE user_id = NEW.user_id;
  IF v_main IS NULL OR NEW.amount > v_main THEN
    RAISE EXCEPTION 'Insufficient withdrawable balance. Available: % (signup bonus % is locked and not withdrawable)', COALESCE(v_main,0), v_locked;
  END IF;
  SELECT rate INTO v_rate FROM public.fx_rates WHERE currency = COALESCE(v_currency,'USD');
  v_usd := CASE WHEN v_rate IS NULL OR v_rate = 0 THEN NEW.amount ELSE NEW.amount / v_rate END;
  IF v_usd < 2 THEN
    RAISE EXCEPTION 'Minimum withdrawal is $2 USD';
  END IF;
  RETURN NEW;
END $function$;

-- 5) Backfill locked_bonus for existing users who already received the promo bonus
UPDATE public.profiles p
   SET locked_bonus = ROUND(1 * COALESCE((SELECT rate FROM public.fx_rates WHERE currency = p.currency),1), 2)
 WHERE promo_signup_bonus_paid = TRUE AND locked_bonus = 0;
