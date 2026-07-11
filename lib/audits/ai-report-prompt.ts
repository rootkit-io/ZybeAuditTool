import type { AuditReport } from "./types";

export type AiReportPrompt = { system: string; user: string; };

export function buildAiReportPrompt(report: AuditReport): AiReportPrompt {
  const dc = report.deepCrawlData;
  const bi = report.businessIntel;

  const signals = report.observedSignals ? Object.fromEntries(
    Object.entries(report.observedSignals).filter(([k]) => !["fetchStatus", "failureReason", "checkedAt", "htmlSizeLimitBytes"].includes(k))
  ) : {};

  return {
    system: [
      "You are a senior digital analyst. You write comprehensive, insightful website audit reports.",
      "You analyze ALL provided data carefully and produce detailed analysis.",
      "Rules:",
      "- Use ONLY the facts provided. Do NOT invent or assume data.",
      "- For issues/observations: only mark as observed=true if the homepage signals CONFIRM it (e.g., title missing, no viewport meta).",
      "- For the competitive landscape: use the provided competitor data. If none found, say 'No direct competitors identified from available data.'",
      "- For SEO niche analysis: base strengths and gaps on the actual signals data provided.",
      "- Be specific and detailed. Avoid generic statements.",
      "- Return ONLY valid JSON matching the required schema."
    ].join("\n"),
    user: JSON.stringify({
      website: {
        url: report.websiteUrl,
        domain: report.normalizedDomain
      },
      homepageSignals: signals,
      categoryScores: report.categories,
      detectedIssues: report.topIssues.map(i => ({
        title: i.title, detail: i.detail, category: i.category, severity: i.severity, observed: i.observed
      })),
      deepCrawl: dc ? {
        pagesCrawled: dc.totalPagesCrawled,
        pageTypes: dc.detectedPageTypes,
        hasBlog: dc.hasBlog,
        hasRecentBlogPosts: dc.hasRecentBlogPosts,
        hasPricingPage: dc.hasPricingPage,
        hasAboutPage: dc.hasAboutPage,
        technologies: dc.technologies.map(t => t.name),
        socialProfiles: dc.socialProfiles,
        performanceMs: dc.performanceSummary
      } : null,
      businessIntelligence: bi ? {
        description: bi.businessDescription,
        industry: bi.industry,
        targetAudience: bi.targetAudience,
        valueProposition: bi.valueProposition,
        productsServices: bi.productsServices,
        competitors: bi.competitors,
        estimatedSize: bi.estimatedSize,
        reach: bi.geographicReach,
        businessModel: bi.businessModel
      } : null,
      instructions: {
        requiredSections: [
          "businessProfile (summarize what this business does based on ALL data)",
          "executiveSummary",
          "overallScoreExplanation",
          "topIssues (only mark observed=true if signals confirm it)",
          "categoryBreakdown",
          "competitiveLandscape (use provided competitor data)",
          "seoNicheAnalysis (analyze SEO strengths/gaps for their specific industry)",
          "contentAnalysis (evaluate messaging quality, uniqueness, clarity)",
          "quickWins",
          "zybeServiceOpportunities"
        ],
        style: "Be thorough and insightful. Write like a senior consultant analyzing a business."
      }
    })
  };
}

export function validateAiReportGrounding(
  report: AuditReport,
  aiItems: Array<{ title: string; observed: boolean }>
): boolean {
  const observedKeywords = report.topIssues
    .filter(i => i.observed)
    .map(i => i.title.toLowerCase().replace(/[^a-z0-9]/g, ""));

  for (const item of aiItems) {
    if (!item.observed) continue;
    const aiKey = item.title.toLowerCase().replace(/[^a-z0-9]/g, "");
    const matches = observedKeywords.some(kw => {
      const aiWords = aiKey.split(/\s+/).filter(w => w.length > 3);
      const obsWords = kw.split(/\s+/).filter(w => w.length > 3);
      const matchCount = aiWords.filter(w => obsWords.includes(w)).length;
      return matchCount >= Math.min(2, Math.min(aiWords.length, obsWords.length));
    });
    if (!matches) return false;
  }
  return true;
}
