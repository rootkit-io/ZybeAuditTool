import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearRateLimitForTests } from "@/lib/audits/rate-limit";
import type { AuditReport } from "@/lib/audits/types";

vi.mock("@/lib/audits/safe-fetch", () => ({
  safeFetchHomepage: vi.fn(async () => ({
    fetchStatus: "success",
    reachable: true,
    requestedUrl: "https://example.com/",
    finalUrl: "https://example.com/",
    statusCode: 200,
    redirected: false,
    redirectCount: 0,
    htmlSizeBytes: 5000,
    htmlSizeLimitBytes: 256000,
    contentType: "text/html",
    titleExists: true,
    titleLength: 12,
    metaDescriptionExists: true,
    metaDescriptionLength: 40,
    h1Exists: true,
    headingCounts: { h1: 1, h2: 2, h3: 0, h4: 0, h5: 0, h6: 0 },
    internalLinkCount: 4,
    externalLinkCount: 1,
    contactLinkDetected: true,
    ctaKeywordDetected: true,
    formDetected: true,
    socialLinkDetected: true,
    robotsTxtAvailable: true,
    sitemapXmlAvailable: true,
    checkedAt: "2026-07-05T00:00:00.000Z"
  }))
}));

vi.mock("@/lib/audits/ai-report-service", () => ({
  enhanceAuditReportWithAi: vi.fn(async (report: AuditReport) => ({
    ...report,
    aiReportSource: "deterministic_fallback",
    aiReport: {
      executiveSummary: "Fallback executive summary for API flow testing. This keeps the report useful without requiring an AI provider.",
      overallScoreExplanation: "Fallback score explanation for API flow testing.",
      topIssues: report.topIssues.map((issue) => ({
        title: issue.title,
        category: issue.category,
        observed: issue.observed,
        explanation: issue.detail,
        recommendedAction: "Review this item and prioritize based on business impact."
      })),
      categoryBreakdown: Object.entries(report.categories).map(([category, score]) => ({
        category,
        score,
        summary: `${category} scored ${score}.`,
        evidence: ["API test evidence"]
      })),
      quickWins: ["Review the highest-priority observed issue."],
      deeperRecommendations: report.recommendations.map((recommendation) => ({
        title: recommendation.title,
        category: recommendation.category,
        observed: recommendation.label === "recommended fix",
        explanation: recommendation.detail,
        recommendedAction: "Turn this into a scoped implementation task."
      })),
      zybeServiceOpportunities: [],
      callToAction: "Use this report as a practical starting point."
    }
  }))
}));

vi.mock("@/lib/email/delivery", () => ({
  deliverAuditEmails: vi.fn(async () => undefined)
}));

vi.mock("@/lib/audits/repository", () => ({
  createAuditRequest: vi.fn(async (input) => ({
    id: "audit_12345678",
    reportToken: "report_public_token",
    previewJson: input.preview
  })),
  getAuditRequestById: vi.fn(async () => ({
    id: "audit_12345678",
    reportToken: "report_public_token",
    websiteUrl: "https://example.com/",
    normalizedDomain: "example.com",
    status: "preview_created",
    overallScore: 78,
    previewJson: {
      observedSignals: {
        fetchStatus: "success",
        reachable: true,
        requestedUrl: "https://example.com/",
        finalUrl: "https://example.com/",
        statusCode: 200,
        redirected: false,
        redirectCount: 0,
        htmlSizeLimitBytes: 256000,
        titleExists: true,
        metaDescriptionExists: true,
        h1Exists: true,
        contactLinkDetected: true,
        ctaKeywordDetected: true,
        formDetected: true,
        checkedAt: "2026-07-05T00:00:00.000Z"
      }
    },
    reportJson: null,
    createdAt: new Date()
  })),
  attachLeadAndReport: vi.fn(async (input) => ({
    id: input.auditRequestId,
    reportToken: "report_public_token",
    normalizedDomain: "example.com",
    reportJson: input.report
  })),
  getAuditReportByToken: vi.fn()
}));

describe("audit API routes", () => {
  beforeEach(() => {
    clearRateLimitForTests();
  });

  it("creates a preview audit", async () => {
    const { POST } = await import("@/app/api/audits/start/route");
    const response = await POST(
      new Request("http://test.local/api/audits/start", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.10" },
        body: JSON.stringify({ websiteUrl: "https://example.com" })
      })
    );
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.auditRequestId).toBe("audit_12345678");
    expect(data.preview.normalizedDomain).toBe("example.com");
    expect(data.preview.observedSignals.fetchStatus).toBe("success");
  });

  it("still creates fallback preview when homepage fetch fails", async () => {
    const { safeFetchHomepage } = await import("@/lib/audits/safe-fetch");
    vi.mocked(safeFetchHomepage).mockResolvedValueOnce({
      fetchStatus: "failed",
      reachable: false,
      requestedUrl: "https://example.com/",
      redirected: false,
      redirectCount: 0,
      htmlSizeLimitBytes: 256000,
      failureReason: "timeout",
      checkedAt: "2026-07-05T00:00:00.000Z"
    });

    const { POST } = await import("@/app/api/audits/start/route");
    const response = await POST(
      new Request("http://test.local/api/audits/start", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.14" },
        body: JSON.stringify({ websiteUrl: "https://example.com" })
      })
    );
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.preview.observedSignals).toMatchObject({
      fetchStatus: "failed",
      failureReason: "timeout"
    });
  });

  it("rejects invalid start URLs", async () => {
    const { POST } = await import("@/app/api/audits/start/route");
    const response = await POST(
      new Request("http://test.local/api/audits/start", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.11" },
        body: JSON.stringify({ websiteUrl: "file:///etc/passwd" })
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: "VALIDATION_ERROR"
    });
  });

  it("rate limits repeated start attempts", async () => {
    const { POST } = await import("@/app/api/audits/start/route");

    for (let attempt = 0; attempt < 8; attempt += 1) {
      await POST(
        new Request("http://test.local/api/audits/start", {
          method: "POST",
          headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.99" },
          body: JSON.stringify({ websiteUrl: "https://example.com" })
        })
      );
    }

    const response = await POST(
      new Request("http://test.local/api/audits/start", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.99" },
        body: JSON.stringify({ websiteUrl: "https://example.com" })
      })
    );
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
    expect(data.code).toBe("RATE_LIMITED");
  });

  it("requires consent before attaching email", async () => {
    const { POST } = await import("@/app/api/audits/submit-email/route");
    const response = await POST(
      new Request("http://test.local/api/audits/submit-email", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.12" },
        body: JSON.stringify({
          auditRequestId: "audit_12345678",
          email: "person@example.com",
          consentToContact: false
        })
      })
    );

    expect(response.status).toBe(400);
  });

  it("unlocks report after valid email submission", async () => {
    const { POST } = await import("@/app/api/audits/submit-email/route");
    const response = await POST(
      new Request("http://test.local/api/audits/submit-email", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.13" },
        body: JSON.stringify({
          auditRequestId: "audit_12345678",
          email: "person@example.com",
          name: "Person",
          company: "Example Co",
          phone: "",
          consentToContact: true
        })
      })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.reportUrl).toBe("/audit/report_public_token");
    expect(data.report.normalizedDomain).toBe("example.com");
    expect(data.report.observedSignals.fetchStatus).toBe("success");
    expect(data.report.aiReportSource).toBe("deterministic_fallback");
  });

  it("still returns report if email delivery fails", async () => {
    const { deliverAuditEmails } = await import("@/lib/email/delivery");
    vi.mocked(deliverAuditEmails).mockRejectedValueOnce(new Error("resend_down"));

    const { POST } = await import("@/app/api/audits/submit-email/route");
    const response = await POST(
      new Request("http://test.local/api/audits/submit-email", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.15" },
        body: JSON.stringify({
          auditRequestId: "audit_12345678",
          email: "person@example.com",
          consentToContact: true
        })
      })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.reportUrl).toBe("/audit/report_public_token");
  });
});
