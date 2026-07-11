import { aiAuditReportSchema } from "./ai-report-schema";
import { buildAiReportPrompt, validateAiReportGrounding } from "./ai-report-prompt";
import { createAuditAiProviderFromEnv, type AuditAiProvider } from "./ai-provider";
import type { AiAuditReport, AuditCategory, AuditReport } from "./types";

export async function enhanceAuditReportWithAi(
  report: AuditReport,
  provider: AuditAiProvider | null = createAuditAiProviderFromEnv()
): Promise<AuditReport> {
  if (!provider) {
    return withFallbackAiReport(report);
  }

  try {
    const prompt = buildAiReportPrompt(report);
    const raw = await provider.generateReportJson(prompt);
    const parsed = aiAuditReportSchema.safeParse(raw);

    if (!parsed.success) {
      return withFallbackAiReport(report);
    }

    // Validate grounding with lenient matching
    const aiItems = [...parsed.data.topIssues, ...parsed.data.deeperRecommendations];
    if (!validateAiReportGrounding(report, aiItems)) {
      return withFallbackAiReport(report);
    }

    return {
      ...report,
      aiReport: parsed.data,
      aiReportSource: "ai"
    };
  } catch {
    return withFallbackAiReport(report);
  }
}

export function withFallbackAiReport(report: AuditReport): AuditReport {
  return {
    ...report,
    aiReport: buildDeterministicWrittenReport(report),
    aiReportSource: "deterministic_fallback"
  };
}

export function buildDeterministicWrittenReport(report: AuditReport): AiAuditReport {
  const observedIssues = report.topIssues.filter((issue) => issue.observed);
  const possibleIssues = report.topIssues.filter((issue) => !issue.observed);
  const weakestCategories = Object.entries(report.categories)
    .sort(([, a], [, b]) => a - b)
    .slice(0, 3);

  const hasDeepCrawl = report.deepCrawlData && report.deepCrawlData.pages.length > 1;
  const loadedTechnologies = report.deepCrawlData?.technologies || [];

  return {
    executiveSummary:
      observedIssues.length > 0
        ? `${report.normalizedDomain} has ${observedIssues.length} confirmed issue area${observedIssues.length === 1 ? "" : "s"} to address first.${hasDeepCrawl ? ` A deep crawl of ${report.deepCrawlData!.totalPagesCrawled} pages found ${loadedTechnologies.length} different technologies in use.` : ""} The recommendations below focus on practical improvements that can help visitors understand the offer and take the next step.`
        : `${report.normalizedDomain} has a workable foundation. The recommendations below focus on practical opportunities that should be reviewed against the live business goals.`,
    overallScoreExplanation: `The overall score of ${report.overallScore} combines ${report.observedSignals ? "40+ real homepage signals" : "available data"} with category scores. It is a directional readiness score, not a scare-based grade.`,
    topIssues: report.topIssues.map((issue) => ({
      title: issue.title,
      category: issue.category,
      observed: issue.observed,
      explanation: issue.detail,
      recommendedAction: issue.observed
        ? "Address this item first because it is confirmed by the homepage analysis."
        : "Review this as a possible opportunity before treating it as a confirmed issue."
    })),
    categoryBreakdown: Object.entries(report.categories).map(([category, score]) => ({
      category: category as AuditCategory,
      score,
      summary: `${category} scored ${score}. ${score < 60 ? "This area needs attention." : score < 75 ? "This area has room for improvement." : "This area is in good shape."}`,
      evidence: categoryEvidence(report, category)
    })),
    quickWins: [
      ...observedIssues.slice(0, 3).map((issue) => issue.title),
      ...possibleIssues.slice(0, 2).map((issue) => `Review possible opportunity: ${issue.category}`),
      ...(hasDeepCrawl ? [`Deep crawl analyzed ${report.deepCrawlData!.totalPagesCrawled} pages`] : [])
    ].slice(0, 5),
    deeperRecommendations: report.recommendations.slice(0, 5).map((recommendation) => ({
      title: recommendation.title,
      category: recommendation.category,
      observed: recommendation.label === "recommended fix",
      explanation: recommendation.detail,
      recommendedAction:
        recommendation.label === "recommended fix"
          ? "Turn this into a small implementation task and verify the improvement after launch."
          : "Use this as a planning prompt for a manual review before investing implementation time."
    })),
    zybeServiceOpportunities: weakestCategories.map(([category]) => ({
      service: serviceForCategory(category),
      relevance: `Relevant because ${category.toLowerCase()} is one of the lower-scoring areas in this audit.`
    })),
    callToAction:
      "Use this report as a starting checklist. If you want help prioritizing the fixes, Zybe Social can review the site with you and turn the highest-impact items into a practical implementation plan."
  };
}

function categoryEvidence(report: AuditReport, category: string): string[] {
  const evidence = report.topIssues
    .filter((issue) => issue.category === category)
    .map((issue) => `${issue.observed ? "Confirmed" : "Possible"}: ${issue.title}`);

  return evidence.length > 0 ? evidence : ["No specific issue from the top issue list for this category."];
}

function serviceForCategory(category: string): string {
  switch (category) {
    case "Design & branding":
      return "Graphic design / branding / social creatives";
    case "AI/chatbot opportunity":
      return "AI chatbots and automation";
    case "Lead generation readiness":
      return "Public business data lead generation";
    case "Conversion readiness":
    case "Messaging":
    case "SEO basics":
    case "Mobile readiness":
    case "Technical hygiene":
    case "Performance & speed":
      return "Custom website development";
    default:
      return "Tech consulting";
  }
}
