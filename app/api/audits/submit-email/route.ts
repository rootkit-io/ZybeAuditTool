import { NextResponse } from "next/server";
import { apiError, validationError } from "@/lib/api/responses";
import { attachLeadAndReport, getAuditReport } from "@/lib/audits/repository";
import { checkRateLimit } from "@/lib/audits/rate-limit";
import { getClientIp, hashIp } from "@/lib/audits/request";
import { generateAuditReport } from "@/lib/audits/scoring";
import { normalizeWebsiteUrl } from "@/lib/audits/url";
import { submitEmailSchema } from "@/lib/audits/validation";

export async function POST(request: Request) {
  const ipHash = hashIp(getClientIp(request.headers));
  const rateLimit = checkRateLimit(`audit:email:${ipHash}`, 6, 60_000);

  if (!rateLimit.ok) {
    return apiError("Too many email submissions. Try again in a minute.", 429);
  }

  const body = await request.json().catch(() => null);
  const parsed = submitEmailSchema.safeParse(body);

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  try {
    const existing = await getAuditReport(parsed.data.auditRequestId);

    if (!existing) {
      return apiError("Audit request not found", 404);
    }

    const normalized = normalizeWebsiteUrl(existing.websiteUrl);

    if (!normalized.ok) {
      return apiError("Stored audit URL is no longer valid", 500);
    }

    const report = generateAuditReport(normalized.value);
    const auditRequest = await attachLeadAndReport({
      auditRequestId: parsed.data.auditRequestId,
      email: parsed.data.email,
      name: parsed.data.name,
      company: parsed.data.company,
      phone: parsed.data.phone,
      consentToContact: parsed.data.consentToContact,
      report
    });

    return NextResponse.json({
      reportUrl: `/audit/${auditRequest.id}`,
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
