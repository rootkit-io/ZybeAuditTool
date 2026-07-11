import { describe, expect, it } from "vitest";
import { buildInternalLeadNotificationEmail, buildUserReportEmail, type ReportEmailContext } from "@/lib/email/templates";
import type { AuditReport } from "@/lib/audits/types";

const report: AuditReport = {
  websiteUrl: "https://example.com/",
  normalizedDomain: "example.com",
  overallScore: 72,
  categories: {
    "Design & branding": 70,
    Messaging: 68,
    "SEO basics": 61,
    "Mobile readiness": 76,
    "Conversion readiness": 64,
    "Trust signals": 72,
    "AI/chatbot opportunity": 78,
    "Lead generation readiness": 66,
    "Performance & speed": 50,
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
      title: "Primary CTA may be unclear",
      detail: "Observed homepage buttons and links did not contain common action phrases.",
      category: "Conversion readiness",
      severity: "medium",
      observed: true
    }
  ],
  summary: "Observed homepage checks were used.",
  recommendations: [],
  generatedAt: "2026-07-05T00:00:00.000Z",
  methodologyNote: "Safe homepage checks.",
  aiReport: {
    executiveSummary: "Example summary with useful next steps.",
    overallScoreExplanation: "Score explanation.",
    topIssues: [],
    categoryBreakdown: [],
    quickWins: ["Add a homepage meta description.", "Clarify the main CTA."],
    deeperRecommendations: [],
    zybeServiceOpportunities: [],
    callToAction: "Review these items first."
  },
  aiReportSource: "deterministic_fallback"
};

const context: ReportEmailContext = {
  report,
  reportUrl: "https://audit.zybesocial.com/audit/report_token",
  lead: {
    email: "person@example.com",
    name: "Person",
    company: "Example Co",
    phone: "555-0100",
    consentToContact: true
  }
};

describe("email templates", () => {
  it("builds useful user report email", () => {
    const email = buildUserReportEmail(context);

    expect(email.subject).toBe("Your Zybe Social website audit for example.com");
    expect(email.text).toContain("Overall score: 72");
    expect(email.text).toContain("https://audit.zybesocial.com/audit/report_token");
    expect(email.text).toContain("Privacy/consent note");
    expect(email.text).toContain("change contact preferences");
    expect(email.html).not.toContain("<script");
  });

  it("builds internal lead notification email", () => {
    const email = buildInternalLeadNotificationEmail(context);

    expect(email.subject).toBe("New website audit lead: example.com");
    expect(email.text).toContain("Email: person@example.com");
    expect(email.text).toContain("Company: Example Co");
    expect(email.text).toContain("Consent to contact: yes");
    expect(email.text).toContain("Meta description is missing");
    expect(email.text).not.toContain("<html><body>raw</body></html>");
  });
});
