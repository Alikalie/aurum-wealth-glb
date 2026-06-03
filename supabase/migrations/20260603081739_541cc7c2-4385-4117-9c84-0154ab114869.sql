
-- AI consultant usage tracking
CREATE TABLE public.ai_consultations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  question TEXT NOT NULL,
  response TEXT,
  used_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.ai_consultations TO authenticated;
GRANT ALL ON public.ai_consultations TO service_role;

ALTER TABLE public.ai_consultations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own ai_consultations" ON public.ai_consultations
  FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'));

CREATE POLICY "users insert own ai_consultations" ON public.ai_consultations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_ai_consultations_user_date ON public.ai_consultations(user_id, used_at DESC);

-- Admin broadcast / direct notification
CREATE OR REPLACE FUNCTION public.admin_send_notification(
  _target_user_id UUID,
  _title TEXT,
  _body TEXT,
  _kind TEXT DEFAULT 'info'
) RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count INT := 0;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  IF _target_user_id IS NULL THEN
    INSERT INTO public.notifications(user_id, title, body, kind)
    SELECT user_id, _title, _body, COALESCE(_kind,'info') FROM public.profiles;
    GET DIAGNOSTICS v_count = ROW_COUNT;
  ELSE
    INSERT INTO public.notifications(user_id, title, body, kind)
    VALUES (_target_user_id, _title, _body, COALESCE(_kind,'info'));
    v_count := 1;
  END IF;
  RETURN v_count;
END $$;
