ALTER TABLE public.audit_requests
  ADD COLUMN IF NOT EXISTS "reportToken" TEXT;

UPDATE public.audit_requests
SET "reportToken" = md5(random()::text || clock_timestamp()::text || "id")
WHERE "reportToken" IS NULL;

ALTER TABLE public.audit_requests
  ALTER COLUMN "reportToken" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "audit_requests_reportToken_key"
  ON public.audit_requests("reportToken");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'audit_requests_overallScore_range'
  ) THEN
    ALTER TABLE public.audit_requests
      ADD CONSTRAINT "audit_requests_overallScore_range"
      CHECK ("overallScore" IS NULL OR ("overallScore" >= 0 AND "overallScore" <= 100))
      NOT VALID;
  END IF;
END $$;

REVOKE ALL PRIVILEGES ON TABLE public.leads FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.audit_requests FROM PUBLIC, anon, authenticated;
