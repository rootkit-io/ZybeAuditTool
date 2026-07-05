import type { AiAuditReportOutput } from "./ai-report-schema";
import type { AuditIssue, AuditRecommendation, AuditReport } from "./types";

export type AiReportPromptPayload = {
  website: {
    submittedUrl: string;
    normalizedDomain: string;
  };
  observedSignals: AuditReport["observedSignals"];
  categoryScores: AuditReport["categories"];
  detectedIssues: AuditIssue[];
  possibleOpportunities: Array<AuditIssue | AuditRecommendation>;
};

export type AiReportPrompt = {
  system: string;
  user: string;
  payload: AiReportPromptPayload;
};

export function buildAiReportPrompt(report: AuditReport): AiReportPrompt {
  const payload = sanitizePromptValue(buildAiPromptPayload(report)) as AiReportPromptPayload;

  return {
    system: [
      "You write practical website audit reports for business owners.",
      "Use only the JSON facts supplied by the user.",
      "Do not browse, infer hidden page content, or invent facts.",
      "Never say something was observed unless it appears in observedSignals or detectedIssues.",
      "Clearly separate observed issues from possible opportunities.",
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
          "For items with observed=true, use the exact title of an observed item from detectedIssues. Possible opportunities must use observed=false.",
        usefulnessRule: "The report must be useful even if the reader does not book a call."
      },
      facts: payload
    }),
    payload
  };
}

export function buildAiPromptPayload(report: AuditReport): AiReportPromptPayload {
  return {
    website: {
      submittedUrl: sanitizeUrlForPrompt(report.websiteUrl),
      normalizedDomain: report.normalizedDomain
    },
    observedSignals: report.observedSignals,
    categoryScores: report.categories,
    detectedIssues: report.topIssues,
    possibleOpportunities: [
      ...report.topIssues.filter((issue) => !issue.observed),
      ...report.recommendations.filter((recommendation) => recommendation.label === "possible opportunity")
    ]
  };
}

export function validateAiReportGrounding(report: AuditReport, aiReport: AiAuditReportOutput) {
  const observedIssueTitles = new Set(report.topIssues.filter((issue) => issue.observed).map((issue) => issue.title));
  const items = [...aiReport.topIssues, ...aiReport.deeperRecommendations];

  for (const item of items) {
    if (item.observed && !observedIssueTitles.has(item.title)) {
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

function sanitizePromptValue(value: unknown): unknown {
  if (typeof value === "string") {
    return value.replace(/<[^>]*>/g, "").replace(/[<>]/g, "");
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizePromptValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitizePromptValue(item)]));
  }

  return value;
}
