
-- Update payment lock duration from 90 days to 365 days
CREATE OR REPLACE FUNCTION public.lock_payment_for_90_days()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.profiles
    SET payment_edit_locked = TRUE,
        payment_locked_until = now() + INTERVAL '365 days'
    WHERE user_id = NEW.user_id;
  RETURN NEW;
END $function$;

-- Backfill existing locked methods to 365-day window from creation
UPDATE public.profiles p
SET payment_locked_until = (
  SELECT pm.created_at + INTERVAL '365 days'
  FROM public.payment_methods pm
  WHERE pm.user_id = p.user_id
  ORDER BY pm.created_at ASC LIMIT 1
)
WHERE p.payment_edit_locked = TRUE
  AND EXISTS (SELECT 1 FROM public.payment_methods pm WHERE pm.user_id = p.user_id);

-- Admin RPC: edit affiliate payment account (overrides lock)
CREATE OR REPLACE FUNCTION public.admin_update_affiliate_payment(_user_id uuid, _new_account text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  UPDATE public.affiliates SET payment_account = _new_account WHERE user_id = _user_id;
END $function$;

-- Admin RPC: edit user payment method directly (used while locked)
CREATE OR REPLACE FUNCTION public.admin_update_payment_method(_pm_id uuid, _provider_name text, _account_holder_name text, _account_number text, _paypal_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  UPDATE public.payment_methods
    SET provider_name = COALESCE(_provider_name, provider_name),
        account_holder_name = COALESCE(_account_holder_name, account_holder_name),
        account_number = _account_number,
        paypal_email = _paypal_email,
        updated_at = now()
   WHERE id = _pm_id;
END $function$;
