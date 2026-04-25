
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS payout_interval_hours INTEGER NOT NULL DEFAULT 24;

CREATE TABLE IF NOT EXISTS public.fx_rates (
  currency TEXT PRIMARY KEY,
  rate NUMERIC NOT NULL CHECK (rate > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fx_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone read fx_rates" ON public.fx_rates;
CREATE POLICY "anyone read fx_rates" ON public.fx_rates FOR SELECT USING (true);

DROP POLICY IF EXISTS "admins manage fx_rates" ON public.fx_rates;
CREATE POLICY "admins manage fx_rates" ON public.fx_rates FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.fx_rates (currency, rate) VALUES
  ('USD',1),('EUR',0.92),('GBP',0.79),('CAD',1.36),('AUD',1.52),
  ('NZD',1.65),('CHF',0.88),('JPY',155),('CNY',7.25),('HKD',7.82),
  ('SGD',1.35),('INR',83.5),('PKR',278),('BDT',110),('LKR',305),
  ('NPR',133),('IDR',16200),('MYR',4.7),('THB',36.5),('VND',25400),
  ('PHP',57.5),('KHR',4100),('LAK',21800),('MMK',2100),('TWD',32),
  ('KRW',1370),('NGN',1500),('GHS',15.5),('KES',129),('UGX',3750),
  ('TZS',2680),('RWF',1320),('ZAR',18.5),('ZMW',26),('ZWG',13.5),
  ('XOF',605),('XAF',605),('CDF',2800),('ETB',122),('EGP',49),
  ('MAD',9.95),('DZD',134),('TND',3.13),('LYD',4.85),('SDG',600),
  ('AED',3.67),('SAR',3.75),('QAR',3.64),('KWD',0.31),('BHD',0.38),
  ('OMR',0.385),('JOD',0.71),('ILS',3.7),('TRY',38.5),('LBP',89500),
  ('IRR',42000),('IQD',1310),('YER',250),('AFN',70),
  ('BRL',5.85),('ARS',980),('CLP',945),('COP',4150),('PEN',3.78),
  ('UYU',41),('VES',38),('MXN',19.5),('GTQ',7.75),('HNL',24.7),
  ('NIO',36.8),('CRC',510),('PAB',1),('DOP',60),('JMD',158),
  ('TTD',6.78),('BBD',2),('XCD',2.7),('BSD',1),('HTG',132),
  ('CUP',24),('GYD',209),('SRD',32),
  ('RUB',95),('UAH',41),('PLN',4.05),('CZK',23.4),('HUF',365),
  ('RON',4.6),('BGN',1.81),('SEK',10.7),('NOK',10.9),('DKK',6.88),
  ('ISK',138),('RSD',108),('HRK',6.95),('MKD',56.5),('BAM',1.81),
  ('ALL',92),('GEL',2.7),('AMD',388),('AZN',1.7),('KZT',495),
  ('UZS',12700),('KGS',87),('TJS',10.7),('TMT',3.5),('MNT',3400),
  ('BYN',3.27),('MDL',17.8),
  ('FJD',2.27),('PGK',3.92),('NAD',18.5),('LSL',18.5),('SZL',18.5),
  ('BWP',13.6),('MUR',46),('SCR',14.3),('MGA',4500),('MWK',1735),
  ('MZN',64),('AOA',920),('GMD',70),('GNF',8600),('SLE',22.5),
  ('LRD',195),('CVE',102),('KMF',453),('DJF',178),('ERN',15),
  ('SOS',571),('SSP',130),('BTN',83.5),('MVR',15.4),('BND',1.35),
  ('BZD',2),('PYG',7800),('BOB',6.91),('SYP',13000),('MRU',39.8)
ON CONFLICT (currency) DO UPDATE SET rate = EXCLUDED.rate, updated_at = now();

CREATE OR REPLACE FUNCTION public.run_daily_payouts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_row RECORD; v_product RECORD; v_payout NUMERIC; v_count INTEGER := 0; v_currency TEXT;
  v_interval INTERVAL;
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
    v_payout := v_product.daily_income;
    UPDATE public.profiles SET earned = earned + v_payout WHERE user_id = v_row.user_id;
    UPDATE public.user_products SET
      days_paid = days_paid + 1,
      total_earned = total_earned + v_payout,
      last_payout_at = now(),
      status = CASE WHEN days_paid + 1 >= v_product.cycle_days THEN 'expired'::user_product_status ELSE status END
    WHERE id = v_row.id;
    SELECT currency INTO v_currency FROM public.profiles WHERE user_id=v_row.user_id;
    INSERT INTO public.transactions(user_id,kind,amount,currency,reference_id,note)
    VALUES (v_row.user_id,'daily_earning',v_payout,COALESCE(v_currency,'USD'),v_row.id,'Income: '||v_product.name);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END $function$;
