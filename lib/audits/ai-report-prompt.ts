import type { AuditReport, DeepCrawlData } from "./types";

export type AiReportPromptPayload = {
  website: {
    submittedUrl: string;
    normalizedDomain: string;
  };
  homepageSignals: Record<string, unknown>;
  categoryScores: Record<string, number>;
  detectedIssues: Array<{ title: string; detail: string; category: string; severity: string; observed: boolean }>;
  deepCrawlData?: DeepCrawlData;
};

export type AiReportPrompt = {
  system: string;
  user: string;
  payload: AiReportPromptPayload;
};

export function buildAiReportPrompt(report: AuditReport): AiReportPrompt {
  const payload = buildAiPromptPayload(report);

  return {
    system: [
      "You write practical website audit reports for business owners.",
      "Use only the JSON facts supplied by the user.",
      "Do not browse, infer hidden page content, or invent facts.",
      "Never say something was observed unless it appears in the provided signals or detectedIssues.",
      "Separate observed issues from possible opportunities clearly.",
      "Avoid fake urgency, fear-based language, and exaggerated claims.",
      "Mention Zybe Social services only where they naturally match the supplied issues or opportunities.",
      "Return only valid JSON matching the requested keys."
    ].join(" "),
    user: JSON.stringify({
      instructions: {
        requiredSections: [
          "executiveSummary",
          "overallScoreExplanation",
          "topIssues",
          "categoryBreakdown",
          "quickWins",
          "deeperRecommendations",
          "zybeServiceOpportunities",
          "callToAction"
        ],
        topIssuesRule:
          "For items with observed=true, make sure they match what appears in detectedIssues. You can rephrase the title.",
        usefulnessRule: "The report must be useful even if the reader does not book a call."
      },
      facts: payload
    }),
    payload
  };
}

export function buildAiPromptPayload(report: AuditReport): AiReportPromptPayload {
  const homepageSignals: Record<string, unknown> = {};

  if (report.observedSignals) {
    // Extract all observed signals (excluding failure data)
    const { fetchStatus, failureReason, checkedAt, htmlSizeLimitBytes, ...signals } = report.observedSignals;
    Object.assign(homepageSignals, signals);
  }

  return {
    website: {
      submittedUrl: sanitizeUrlForPrompt(report.websiteUrl),
      normalizedDomain: report.normalizedDomain
    },
    homepageSignals,
    categoryScores: report.categories,
    detectedIssues: report.topIssues.map((i) => ({
      title: i.title,
      detail: i.detail,
      category: i.category,
      severity: i.severity,
      observed: i.observed
    })),
    deepCrawlData: report.deepCrawlData
  };
}

/**
 * Validates AI output doesn't claim observed issues that don't exist in the source data.
 * Uses lenient matching: the AI can rephrase titles.
 */
export function validateAiReportGrounding(report: AuditReport, aiTopIssues: Array<{ title: string; observed: boolean }>): boolean {
  const observedIssueKeywords = report.topIssues
    .filter((issue) => issue.observed)
    .map((issue) => issue.title.toLowerCase().replace(/[^a-z0-9]/g, ""));

  for (const item of aiTopIssues) {
    if (!item.observed) continue;

    // Check if any observed issue from the AI matches any of our confirmed issues
    const aiKeywords = item.title.toLowerCase().replace(/[^a-z0-9]/g, "");

    const matchesObserved = observedIssueKeywords.some((keyword) => {
      // Check if keywords overlap substantially
      const aiWords = aiKeywords.split(/\s+/).filter((w) => w.length > 3);
      const obsWords = keyword.split(/\s+/).filter((w) => w.length > 3);
      const matchCount = aiWords.filter((w) => obsWords.includes(w)).length;
      return matchCount >= Math.min(2, Math.min(aiWords.length, obsWords.length));
    });

    if (!matchesObserved) {
      // The AI claims something was observed that wasn't in our data
      return false;
    }
  }

  return true;
}

function sanitizeUrlForPrompt(url: string) {
  const parsed = new URL(url);
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString();
}
