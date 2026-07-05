import { NextResponse } from "next/server";
import { generateAuditPreview } from "@/lib/audits/scoring";
import { checkRateLimit } from "@/lib/audits/rate-limit";
import { getClientIp, hashIp, safeUserAgent } from "@/lib/audits/request";
import { normalizeWebsiteUrl } from "@/lib/audits/url";
import { startAuditSchema } from "@/lib/audits/validation";
import { createAuditRequest } from "@/lib/audits/repository";
import { apiError, validationError } from "@/lib/api/responses";

export async function POST(request: Request) {
  const ip = getClientIp(request.headers);
  const ipHash = hashIp(ip);
  const rateLimit = checkRateLimit(`audit:start:${ipHash}`, 8, 60_000);

  if (!rateLimit.ok) {
    return apiError("Too many audit attempts. Try again in a minute.", 429);
  }

  const body = await request.json().catch(() => null);
  const parsed = startAuditSchema.safeParse(body);

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const normalized = normalizeWebsiteUrl(parsed.data.websiteUrl);

  if (!normalized.ok) {
    return apiError(normalized.error, 400);
  }

  const preview = generateAuditPreview(normalized.value);

  try {
    const auditRequest = await createAuditRequest({
      ...normalized.value,
      overallScore: preview.overallScore,
      preview,
      ipHash,
      userAgent: safeUserAgent(request.headers)
    });

    return NextResponse.json(
      {
        auditRequestId: auditRequest.id,
        preview
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("audit_start_failed", {
      normalizedDomain: normalized.value.normalizedDomain,
      error: error instanceof Error ? error.message : "unknown"
    });

    return apiError("Could not create audit preview. Please try again.", 500);
  }
}
