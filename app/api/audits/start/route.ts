import { NextResponse } from "next/server";
import { generateAuditPreview } from "@/lib/audits/scoring";
import { checkRateLimit } from "@/lib/audits/rate-limit";
import { getClientIp, hashIp, safeUserAgent } from "@/lib/audits/request";
import { normalizeWebsiteUrl } from "@/lib/audits/url";
import { startAuditSchema } from "@/lib/audits/validation";
import { createAuditRequest } from "@/lib/audits/repository";
import { apiError, validationError } from "@/lib/api/responses";
import { validateServerEnv } from "@/lib/env";
import { safeFetchHomepage } from "@/lib/audits/safe-fetch";
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

  trackAnalyticsEvent("audit_started", { ipHash });

  const rateLimit = await checkRateLimit(`audit:start:${ipHash}`, 12, 60_000);

  if (!rateLimit.ok) {
    return apiError("Too many audit attempts. Try again in a minute.", 429, "RATE_LIMITED", {
      "Retry-After": String(rateLimit.retryAfterSeconds)
    });
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

  try {
    // Phase 1: Fast HTTP fetch for instant preview
    const observedSignals = await safeFetchHomepage(normalized.value.websiteUrl);
    const preview = generateAuditPreview(normalized.value, observedSignals);
    const auditRequest = await createAuditRequest({
      ...normalized.value,
      overallScore: preview.overallScore,
      preview,
      ipHash,
      userAgent: safeUserAgent(request.headers)
    });

    // Phase 2: Fire-and-forget background deep crawl (results arrive while user fills email)
    // We import dynamically to avoid pulling in firecrawl deps at module level
    const { runBackgroundCrawl } = await import("@/lib/audits/deep-crawl");
    const repo = await import("@/lib/audits/repository");

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    runBackgroundCrawl(auditRequest.id, normalized.value.websiteUrl, normalized.value.normalizedDomain, async (id, status, data) => {
      return repo.updateCrawlStatus(id, status as any, data as any);
    }).catch(
      (err) => {
        console.error("background_crawl_trigger_failed", {
          auditRequestId: auditRequest.id,
          error: err instanceof Error ? err.message : "unknown"
        });
      }
    );

    // Return preview immediately — no waiting for deep crawl
    trackAnalyticsEvent("audit_preview_created", {
      auditRequestId: auditRequest.id,
      normalizedDomain: normalized.value.normalizedDomain,
      score: preview.overallScore,
      fetchStatus: observedSignals.fetchStatus
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
