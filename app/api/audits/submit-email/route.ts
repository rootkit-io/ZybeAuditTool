import { NextResponse } from "next/server";
import { apiError, validationError } from "@/lib/api/responses";
import { attachLeadAndReport, getAuditRequestById } from "@/lib/audits/repository";
import { enhanceAuditReportWithAi } from "@/lib/audits/ai-report-service";
import { checkRateLimit } from "@/lib/audits/rate-limit";
import { getClientIp, hashIp } from "@/lib/audits/request";
import { generateAuditReport } from "@/lib/audits/scoring";
import type { AuditPreview, DeepCrawlData, BusinessIntelligence } from "@/lib/audits/types";
import { normalizeWebsiteUrl } from "@/lib/audits/url";
import { submitEmailSchema } from "@/lib/audits/validation";
import { validateServerEnv } from "@/lib/env";
import { deliverAuditEmails } from "@/lib/email/delivery";
import { trackAnalyticsEvent } from "@/lib/analytics";

export async function POST(request: Request) {
  let ipHash: string;

  try {
    validateServerEnv();
    ipHash = hashIp(getClientIp(request.headers));
  } catch (error) {
    console.error("server_env_invalid", {
      error: error instanceof Error ? error.message : "unknown"
    });
    return apiError("Server configuration error", 500, "SERVER_CONFIG_ERROR");
  }

  const rateLimit = await checkRateLimit(`audit:email:${ipHash}`, 10, 60_000);

  if (!rateLimit.ok) {
    return apiError("Too many email submissions. Try again in a minute.", 429, "RATE_LIMITED", {
      "Retry-After": String(rateLimit.retryAfterSeconds)
    });
  }

  const body = await request.json().catch(() => null);
  const parsed = submitEmailSchema.safeParse(body);

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  trackAnalyticsEvent("email_submitted", {
    auditRequestId: parsed.data.auditRequestId,
    consentToContact: parsed.data.consentToContact
  });

  try {
    const existing = await getAuditRequestById(parsed.data.auditRequestId);

    if (!existing) {
      return apiError("Audit request not found", 404, "AUDIT_NOT_FOUND");
    }

    if (existing.status === "report_ready" && existing.reportJson) {
      return NextResponse.json({
        reportUrl: `/audit/${existing.reportToken}`,
        report: existing.reportJson
      });
    }

    const normalized = normalizeWebsiteUrl(existing.websiteUrl);

    if (!normalized.ok) {
      return apiError("Stored audit URL is no longer valid", 500, "STORED_URL_INVALID");
    }

    const preview = existing.previewJson as AuditPreview | null;

    // Build deterministic report from observed signals
    const deterministicReport = generateAuditReport(normalized.value, preview?.observedSignals);

    // Include deep crawl data if available (may still be running)
    const rawCrawlData = existing.deepCrawlData as Record<string, unknown> | null;
    let deepCrawlData: DeepCrawlData | null = null;
    let businessIntel: BusinessIntelligence | null = null;

    if (rawCrawlData) {
      // Extract business intel from crawl data if present
      if (rawCrawlData._businessIntel) {
        businessIntel = rawCrawlData._businessIntel as BusinessIntelligence;
        delete rawCrawlData._businessIntel;
      }
      deepCrawlData = rawCrawlData as unknown as DeepCrawlData;

      if (deepCrawlData && deepCrawlData.pages?.length > 0) {
        deterministicReport.deepCrawlData = deepCrawlData;
      }
      if (businessIntel) {
        deterministicReport.businessIntel = businessIntel;
      }
    }

    // Enhance with AI (Mistral via OpenAI-compatible API)
    const report = await enhanceAuditReportWithAi(deterministicReport);

    trackAnalyticsEvent("report_generated", {
      auditRequestId: parsed.data.auditRequestId,
      normalizedDomain: normalized.value.normalizedDomain,
      score: report.overallScore,
      aiReportSource: report.aiReportSource,
      hasDeepCrawlData: !!deepCrawlData
    });

    const auditRequest = await attachLeadAndReport({
      auditRequestId: parsed.data.auditRequestId,
      email: parsed.data.email,
      name: parsed.data.name,
      company: parsed.data.company,
      phone: parsed.data.phone,
      consentToContact: parsed.data.consentToContact,
      report
    });

    // Send emails in background (fire-and-forget)
    deliverAuditEmails({
      auditRequestId: auditRequest.id,
      leadId: auditRequest.leadId,
      reportToken: auditRequest.reportToken,
      report,
      lead: {
        email: parsed.data.email,
        name: parsed.data.name,
        company: parsed.data.company,
        phone: parsed.data.phone,
        consentToContact: parsed.data.consentToContact
      }
    }).catch((error) => {
      console.error("audit_email_delivery_failed", {
        auditRequestId: auditRequest.id,
        error: error instanceof Error ? error.message : "unknown"
      });
    });

    return NextResponse.json({
      reportUrl: `/audit/${auditRequest.reportToken}`,
      report
    });
  } catch (error) {
    console.error("audit_email_submit_failed", {
      auditRequestId: parsed.data.auditRequestId,
      error: error instanceof Error ? error.message : "unknown"
    });
    return apiError("Could not save your report. Please try again.", 500);
  }
}
