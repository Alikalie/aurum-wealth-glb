
CREATE OR REPLACE FUNCTION public.on_affiliate_application_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    INSERT INTO public.affiliates(user_id, code, payment_account, payment_account_locked)
    VALUES (NEW.user_id, NEW.promo_code, NEW.payment_account, TRUE)
    ON CONFLICT (user_id) DO UPDATE
      SET code = EXCLUDED.code,
          payment_account = EXCLUDED.payment_account,
          payment_account_locked = TRUE;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_on_affiliate_application_approved ON public.affiliate_applications;
CREATE TRIGGER trg_on_affiliate_application_approved
AFTER UPDATE ON public.affiliate_applications
FOR EACH ROW EXECUTE FUNCTION public.on_affiliate_application_approved();
