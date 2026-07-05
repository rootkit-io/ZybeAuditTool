import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearRateLimitForTests } from "@/lib/audits/rate-limit";

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
  });
});
