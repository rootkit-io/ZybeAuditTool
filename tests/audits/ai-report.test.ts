import { describe, expect, it } from "vitest";
import { aiAuditReportSchema } from "@/lib/audits/ai-report-schema";
import { buildAiReportPrompt } from "@/lib/audits/ai-report-prompt";
import { enhanceAuditReportWithAi } from "@/lib/audits/ai-report-service";
import type { AuditAiProvider } from "@/lib/audits/ai-provider";
import type { AuditReport } from "@/lib/audits/types";

const baseReport: AuditReport = {
  websiteUrl: "https://example.com/?utm_source=private",
  normalizedDomain: "example.com",
  overallScore: 71,
  categories: {
    "Design & branding": 72,
    Messaging: 65,
    "SEO basics": 58,
    "Mobile readiness": 74,
    "Conversion readiness": 61,
    "Trust signals": 70,
    "AI/chatbot opportunity": 76,
    "Lead generation readiness": 62,
    "Technical hygiene": 80
  },
  topIssues: [
    {
      title: "Meta description is missing",
      detail: "Observed homepage HTML did not include a meta description.",
      category: "SEO basics",
      severity: "medium",
      observed: true
    },
    {
      title: "Conversion readiness could likely improve",
      detail: "Possible opportunity: this area often affects qualified leads and should be reviewed manually.",
      category: "Conversion readiness",
      severity: "low",
      observed: false
    }
  ],
  observedSignals: {
    fetchStatus: "success",
    reachable: true,
    requestedUrl: "https://example.com/",
    finalUrl: "https://example.com/",
    statusCode: 200,
    redirected: false,
    redirectCount: 0,
    htmlSizeBytes: 4000,
    htmlSizeLimitBytes: 256000,
    contentType: "text/html",
    titleExists: true,
    metaDescriptionExists: false,
    h1Exists: true,
    headingCounts: { h1: 1, h2: 2, h3: 0, h4: 0, h5: 0, h6: 0 },
    internalLinkCount: 5,
    externalLinkCount: 2,
    contactLinkDetected: true,
    ctaKeywordDetected: false,
    formDetected: false,
    socialLinkDetected: true,
    robotsTxtAvailable: true,
    sitemapXmlAvailable: false,
    checkedAt: "2026-07-05T00:00:00.000Z"
  },
  summary: "Observed homepage checks were used.",
  recommendations: [
    {
      title: "Fix: Meta description is missing",
      detail: "Observed homepage HTML did not include a meta description.",
      category: "SEO basics",
      label: "recommended fix"
    },
    {
      title: "Clarify the primary conversion action",
      detail: "Possible opportunity: make the next step obvious.",
      category: "Conversion readiness",
      label: "possible opportunity"
    }
  ],
  generatedAt: "2026-07-05T00:00:00.000Z",
  methodologyNote: "Safe homepage-only fetch."
};

const validAiJson = {
  executiveSummary:
    "The homepage has a useful foundation, but the observed metadata and conversion signals leave practical room for improvement without requiring a full rebuild.",
  overallScoreExplanation:
    "The score reflects observed homepage checks plus category scores. Missing metadata and unclear conversion signals lowered the readiness score.",
  topIssues: [
    {
      title: "Meta description is missing",
      category: "SEO basics",
      observed: true,
      explanation: "The supplied observed signals show the meta description was missing.",
      recommendedAction: "Add a concise meta description that explains the offer and audience."
    }
  ],
  categoryBreakdown: [
    {
      category: "SEO basics",
      score: 58,
      summary: "SEO basics need attention because an observed meta description is missing.",
      evidence: ["Observed metaDescriptionExists=false"]
    }
  ],
  quickWins: ["Add a concise homepage meta description.", "Review the homepage CTA language."],
  deeperRecommendations: [
    {
      title: "Meta description is missing",
      category: "SEO basics",
      observed: true,
      explanation: "This was observed in the supplied homepage signals.",
      recommendedAction: "Write a specific description for the homepage."
    },
    {
      title: "Clarify the primary conversion action",
      category: "Conversion readiness",
      observed: false,
      explanation: "This is a possible opportunity based on category scores and CTA signals.",
      recommendedAction: "Review button and link copy before deciding what to change."
    }
  ],
  zybeServiceOpportunities: [
    {
      service: "Custom website development",
      relevance: "Relevant if the business wants help improving metadata and conversion paths."
    }
  ],
  callToAction: "Use these items as a first checklist. Zybe Social can help prioritize the fixes if useful."
};

describe("AI report generation", () => {
  it("builds prompt input without raw HTML or URL query strings", () => {
    const prompt = buildAiReportPrompt({
      ...baseReport,
      observedSignals: {
        ...baseReport.observedSignals!,
        failureReason: "<html><body>raw</body></html>"
      }
    });

    expect(prompt.payload.website.submittedUrl).toBe("https://example.com/");
    expect(prompt.user).not.toContain("utm_source");
    expect(prompt.user).not.toContain("<html>");
  });

  it("validates structured AI JSON", () => {
    expect(aiAuditReportSchema.safeParse(validAiJson).success).toBe(true);
    expect(aiAuditReportSchema.safeParse({ executiveSummary: "too short" }).success).toBe(false);
  });

  it("stores AI report when provider returns valid grounded JSON", async () => {
    const provider: AuditAiProvider = {
      generateReportJson: async () => validAiJson
    };

    const report = await enhanceAuditReportWithAi(baseReport, provider);

    expect(report.aiReportSource).toBe("ai");
    expect(report.aiReport?.topIssues[0].title).toBe("Meta description is missing");
  });

  it("falls back when provider fails", async () => {
    const provider: AuditAiProvider = {
      generateReportJson: async () => {
        throw new Error("provider_down");
      }
    };

    const report = await enhanceAuditReportWithAi(baseReport, provider);

    expect(report.aiReportSource).toBe("deterministic_fallback");
    expect(report.aiReport?.executiveSummary).toContain("example.com");
  });

  it("falls back when AI returns invalid JSON shape", async () => {
    const provider: AuditAiProvider = {
      generateReportJson: async () => ({ executiveSummary: "not enough" })
    };

    const report = await enhanceAuditReportWithAi(baseReport, provider);

    expect(report.aiReportSource).toBe("deterministic_fallback");
  });

  it("falls back when AI invents observed issue titles", async () => {
    const provider: AuditAiProvider = {
      generateReportJson: async () => ({
        ...validAiJson,
        topIssues: [
          {
            title: "Homepage loads slowly",
            category: "Technical hygiene",
            observed: true,
            explanation: "This claims an observed speed problem that was not supplied.",
            recommendedAction: "Optimize performance."
          }
        ]
      })
    };

    const report = await enhanceAuditReportWithAi(baseReport, provider);

    expect(report.aiReportSource).toBe("deterministic_fallback");
  });
});
