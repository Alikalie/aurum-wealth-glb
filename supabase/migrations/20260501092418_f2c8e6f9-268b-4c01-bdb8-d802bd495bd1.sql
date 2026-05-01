CREATE OR REPLACE FUNCTION public.bump_referral_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.affiliates SET total_referrals = total_referrals + 1 WHERE user_id = NEW.referrer_id;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS referrals_bump ON public.referrals;
CREATE TRIGGER referrals_bump AFTER INSERT ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.bump_referral_count();