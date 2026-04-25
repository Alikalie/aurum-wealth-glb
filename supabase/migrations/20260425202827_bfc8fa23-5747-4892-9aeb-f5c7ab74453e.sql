-- Add foreign keys from deposits/withdrawals to profiles so PostgREST can embed
ALTER TABLE public.deposits
  ADD CONSTRAINT deposits_user_profile_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

ALTER TABLE public.withdrawals
  ADD CONSTRAINT withdrawals_user_profile_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Notify users on rejection by inserting a transactions ledger entry with the admin note
CREATE OR REPLACE FUNCTION public.on_deposit_rejected()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE u_currency TEXT;
BEGIN
  IF NEW.status='rejected' AND (OLD.status IS DISTINCT FROM 'rejected') THEN
    SELECT currency INTO u_currency FROM public.profiles WHERE user_id=NEW.user_id;
    INSERT INTO public.transactions(user_id,kind,amount,currency,reference_id,note)
    VALUES (NEW.user_id,'deposit',0,COALESCE(u_currency,'USD'),NEW.id,
      COALESCE('Deposit rejected: ' || NEW.admin_note, 'Deposit rejected'));
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.on_withdrawal_rejected()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE u_currency TEXT;
BEGIN
  IF NEW.status='rejected' AND (OLD.status IS DISTINCT FROM 'rejected') THEN
    SELECT currency INTO u_currency FROM public.profiles WHERE user_id=NEW.user_id;
    INSERT INTO public.transactions(user_id,kind,amount,currency,reference_id,note)
    VALUES (NEW.user_id,'withdrawal',0,COALESCE(u_currency,'USD'),NEW.id,
      COALESCE('Withdrawal rejected: ' || NEW.admin_note, 'Withdrawal rejected'));
  END IF;
  RETURN NEW;
END $$;

-- Triggers
DROP TRIGGER IF EXISTS trg_deposit_approved ON public.deposits;
CREATE TRIGGER trg_deposit_approved
  AFTER UPDATE ON public.deposits
  FOR EACH ROW EXECUTE FUNCTION public.on_deposit_approved();

DROP TRIGGER IF EXISTS trg_deposit_rejected ON public.deposits;
CREATE TRIGGER trg_deposit_rejected
  AFTER UPDATE ON public.deposits
  FOR EACH ROW EXECUTE FUNCTION public.on_deposit_rejected();

DROP TRIGGER IF EXISTS trg_withdrawal_approved ON public.withdrawals;
CREATE TRIGGER trg_withdrawal_approved
  AFTER UPDATE ON public.withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.on_withdrawal_approved();

DROP TRIGGER IF EXISTS trg_withdrawal_rejected ON public.withdrawals;
CREATE TRIGGER trg_withdrawal_rejected
  AFTER UPDATE ON public.withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.on_withdrawal_rejected();

DROP TRIGGER IF EXISTS trg_validate_withdrawal ON public.withdrawals;
CREATE TRIGGER trg_validate_withdrawal
  BEFORE INSERT ON public.withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.validate_withdrawal();

DROP TRIGGER IF EXISTS trg_admin_credit ON public.admin_credits;
CREATE TRIGGER trg_admin_credit
  AFTER INSERT ON public.admin_credits
  FOR EACH ROW EXECUTE FUNCTION public.apply_admin_credit();

DROP TRIGGER IF EXISTS trg_product_sold ON public.user_products;
CREATE TRIGGER trg_product_sold
  AFTER UPDATE ON public.user_products
  FOR EACH ROW EXECUTE FUNCTION public.on_product_sold();

DROP TRIGGER IF EXISTS trg_assign_account_number ON public.profiles;
CREATE TRIGGER trg_assign_account_number
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.assign_account_number();