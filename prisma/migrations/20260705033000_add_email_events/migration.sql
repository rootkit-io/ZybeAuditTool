CREATE TYPE "EmailEventType" AS ENUM ('user_report', 'internal_lead_notification');
CREATE TYPE "EmailEventStatus" AS ENUM ('sent', 'failed', 'skipped');

CREATE TABLE "email_events" (
  "id" TEXT NOT NULL,
  "auditRequestId" TEXT NOT NULL,
  "leadId" TEXT,
  "type" "EmailEventType" NOT NULL,
  "status" "EmailEventStatus" NOT NULL,
  "recipientEmailHash" TEXT NOT NULL,
  "recipientDomain" TEXT,
  "provider" TEXT NOT NULL,
  "providerMessageId" TEXT,
  "errorCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "email_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "email_events_auditRequestId_idx" ON "email_events"("auditRequestId");
CREATE INDEX "email_events_leadId_idx" ON "email_events"("leadId");
CREATE INDEX "email_events_type_idx" ON "email_events"("type");
CREATE INDEX "email_events_status_idx" ON "email_events"("status");
CREATE INDEX "email_events_createdAt_idx" ON "email_events"("createdAt");

ALTER TABLE "email_events"
  ADD CONSTRAINT "email_events_auditRequestId_fkey"
  FOREIGN KEY ("auditRequestId") REFERENCES "audit_requests"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "email_events"
  ADD CONSTRAINT "email_events_leadId_fkey"
  FOREIGN KEY ("leadId") REFERENCES "leads"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.email_events FROM PUBLIC, anon, authenticated;
