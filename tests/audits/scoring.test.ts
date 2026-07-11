import { describe, expect, it } from "vitest";
import { generateAuditPreview, generateAuditReport } from "@/lib/audits/scoring";

describe("audit scoring", () => {
  it("creates deterministic preview results", () => {
    const input = {
      websiteUrl: "https://example.com/",
      normalizedDomain: "example.com"
    };

    expect(generateAuditPreview(input)).toEqual(generateAuditPreview(input));
  });

  it("labels non-observed recommendations as possible opportunities", () => {
    const report = generateAuditReport({
      websiteUrl: "https://example.com/",
      normalizedDomain: "example.com"
    });

    expect(report.recommendations.some((recommendation) => recommendation.label === "possible opportunity")).toBe(true);
  });

  it("flags http as an observed technical issue", () => {
    const preview = generateAuditPreview({
      websiteUrl: "http://example.com/",
      normalizedDomain: "example.com"
    });

    expect(preview.topIssues[0]).toMatchObject({
      title: "HTTPS is not enabled",
      observed: true
    });
  });

  it("uses observed homepage checks in scoring and issues", () => {
    const preview = generateAuditPreview(
      {
        websiteUrl: "https://example.com/",
        normalizedDomain: "example.com"
      },
      {
        fetchStatus: "success",
        reachable: true,
        requestedUrl: "https://example.com/",
        finalUrl: "https://example.com/",
        statusCode: 200,
        redirected: false,
        redirectCount: 0,
        htmlSizeLimitBytes: 256000,
        titleExists: false,
        metaDescriptionExists: false,
        h1Exists: false,
        headingCounts: { h1: 0, h2: 1, h3: 0, h4: 0, h5: 0, h6: 0 },
        internalLinkCount: 2,
        externalLinkCount: 0,
        contactLinkDetected: false,
        ctaKeywordDetected: false,
        formDetected: false,
        socialLinkDetected: false,
        robotTxtAvailable: false,
        sitemapXmlAvailable: false,
        checkedAt: "2026-07-05T00:00:00.000Z"
      }
    );

    expect(preview.observedSignals?.fetchStatus).toBe("success");
    expect(preview.topIssues.some((issue) => issue.title === "Page title is missing")).toBe(true);
    expect(preview.categories["SEO basics"]).toBeLessThan(
      generateAuditPreview({
        websiteUrl: "https://example.com/",
        normalizedDomain: "example.com"
      }).categories["SEO basics"]
    );
  });

  it("falls back cleanly when homepage fetch fails", () => {
    const report = generateAuditReport(
      {
        websiteUrl: "https://example.com/",
        normalizedDomain: "example.com"
      },
      {
        fetchStatus: "failed",
        reachable: false,
        requestedUrl: "https://example.com/",
        redirected: false,
        redirectCount: 0,
        htmlSizeLimitBytes: 256000,
        failureReason: "timeout",
        checkedAt: "2026-07-05T00:00:00.000Z"
      }
    );

    expect(report.topIssues[0]).toMatchObject({
      title: "Homepage could not be fully checked",
      observed: true
    });
    expect(report.methodologyNote).toContain("fell back");
  });
});
