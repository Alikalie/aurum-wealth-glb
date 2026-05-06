-- 1. Super-super admin column
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS is_super_super BOOLEAN NOT NULL DEFAULT FALSE;

-- Promote the oldest super admin to super-super
UPDATE public.user_roles
   SET is_super_super = TRUE
 WHERE id = (
   SELECT id FROM public.user_roles
    WHERE role='admin' AND is_super = TRUE
    ORDER BY created_at ASC
    LIMIT 1
 );

-- 2. Helper function
CREATE OR REPLACE FUNCTION public.is_super_super_admin(_uid UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.user_roles
     WHERE user_id=_uid AND role='admin' AND is_super_super=TRUE
  )
$$;

-- 3. Promote (id) — super-super can also create supers
CREATE OR REPLACE FUNCTION public.promote_to_admin(_target UUID, _make_super BOOLEAN DEFAULT FALSE)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF _make_super THEN
    IF NOT public.is_super_super_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Only the super-super admin can create super admins';
    END IF;
  ELSE
    IF NOT (public.is_super_admin(auth.uid()) OR public.is_super_super_admin(auth.uid())) THEN
      RAISE EXCEPTION 'Super admin only';
    END IF;
  END IF;
  INSERT INTO public.user_roles(user_id, role, is_super)
  VALUES (_target, 'admin', _make_super)
  ON CONFLICT (user_id, role)
  DO UPDATE SET is_super = (public.user_roles.is_super OR _make_super);
END $$;

-- 4. Promote by email
CREATE OR REPLACE FUNCTION public.promote_admin_by_email(_email TEXT, _make_super BOOLEAN DEFAULT FALSE)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_uid UUID;
BEGIN
  SELECT user_id INTO v_uid FROM public.profiles
   WHERE lower(email) = lower(trim(_email)) LIMIT 1;
  IF v_uid IS NULL THEN RAISE EXCEPTION 'No user found with email %', _email; END IF;
  PERFORM public.promote_to_admin(v_uid, _make_super);
END $$;

-- 5. Demote — never demote super-super; only super-super can demote a super
CREATE OR REPLACE FUNCTION public.demote_admin(_target UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_super_admin(auth.uid()) OR public.is_super_super_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF _target = auth.uid() THEN RAISE EXCEPTION 'Cannot demote yourself'; END IF;
  IF EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_target AND is_super_super=TRUE) THEN
    RAISE EXCEPTION 'Cannot demote the super-super admin';
  END IF;
  IF EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_target AND is_super=TRUE)
     AND NOT public.is_super_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only the super-super admin can demote a super admin';
  END IF;
  DELETE FROM public.user_roles
   WHERE user_id=_target AND role='admin' AND is_super_super=FALSE;
END $$;

-- 6. Default app settings
INSERT INTO public.app_settings(key, value)
SELECT 'support_contacts',
       '{"whatsapp":"","email":"","phone":"","whatsapp_group":"","whatsapp_channel":"","telegram_channel":""}'::jsonb
 WHERE NOT EXISTS (SELECT 1 FROM public.app_settings WHERE key='support_contacts');

INSERT INTO public.app_settings(key, value)
SELECT 'service_status', '{"enabled":true,"blocked_countries":[]}'::jsonb
 WHERE NOT EXISTS (SELECT 1 FROM public.app_settings WHERE key='service_status');