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
      title: "HTTPS should be enabled",
      observed: true
    });
  });
});
