CREATE TYPE "AuditRequestStatus" AS ENUM ('preview_created', 'email_submitted', 'report_ready', 'failed');

CREATE TABLE "leads" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "company" TEXT,
  "phone" TEXT,
  "consentToContact" BOOLEAN NOT NULL DEFAULT false,
  "source" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_requests" (
  "id" TEXT NOT NULL,
  "websiteUrl" TEXT NOT NULL,
  "normalizedDomain" TEXT NOT NULL,
  "leadId" TEXT,
  "status" "AuditRequestStatus" NOT NULL DEFAULT 'preview_created',
  "overallScore" INTEGER,
  "previewJson" JSONB NOT NULL,
  "reportJson" JSONB,
  "ipHash" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "audit_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "leads_email_key" ON "leads"("email");
CREATE INDEX "leads_email_idx" ON "leads"("email");
CREATE INDEX "audit_requests_normalizedDomain_idx" ON "audit_requests"("normalizedDomain");
CREATE INDEX "audit_requests_status_idx" ON "audit_requests"("status");
CREATE INDEX "audit_requests_createdAt_idx" ON "audit_requests"("createdAt");
CREATE INDEX "audit_requests_leadId_idx" ON "audit_requests"("leadId");

ALTER TABLE "audit_requests"
  ADD CONSTRAINT "audit_requests_leadId_fkey"
  FOREIGN KEY ("leadId") REFERENCES "leads"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
