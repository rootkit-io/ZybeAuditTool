import type { AuditCategory, AuditIssue, AuditPreview, AuditRecommendation, AuditReport } from "./types";
import type { NormalizedWebsiteUrl } from "./url";

const categories: AuditCategory[] = [
  "Design & branding",
  "Messaging",
  "SEO basics",
  "Mobile readiness",
  "Conversion readiness",
  "Trust signals",
  "AI/chatbot opportunity",
  "Lead generation readiness",
  "Technical hygiene"
];

export function generateAuditPreview(input: NormalizedWebsiteUrl): AuditPreview {
  const domain = input.normalizedDomain;
  const signal = stableSignal(domain);
  const hasDash = domain.includes("-");
  const hasLongDomain = domain.length > 22;
  const hasSubdomain = domain.split(".").length > 2;
  const usesHttps = input.websiteUrl.startsWith("https://");

  const categoryScores = Object.fromEntries(
    categories.map((category, index) => {
      const base = 62 + ((signal + index * 7) % 24);
      const adjustment =
        (usesHttps ? 4 : -8) +
        (hasLongDomain && ["Messaging", "Conversion readiness"].includes(category) ? -5 : 0) +
        (hasDash && category === "Trust signals" ? -4 : 0) +
        (hasSubdomain && category === "Technical hygiene" ? -3 : 0);

      return [category, clampScore(base + adjustment)];
    })
  ) as Record<AuditCategory, number>;

  const issues = buildIssues({ domain, usesHttps, hasDash, hasLongDomain, hasSubdomain, categoryScores });
  const overallScore = Math.round(
    categories.reduce((sum, category) => sum + categoryScores[category], 0) / categories.length
  );

  return {
    websiteUrl: input.websiteUrl,
    normalizedDomain: domain,
    overallScore,
    topIssues: issues.slice(0, 3),
    categories: categoryScores,
    summary:
      "This preview uses safe deterministic checks from the submitted URL and domain. Full Phase 1 report stays practical and labels non-observed items as possible opportunities."
  };
}

export function generateAuditReport(input: NormalizedWebsiteUrl): AuditReport {
  const preview = generateAuditPreview(input);

  return {
    ...preview,
    recommendations: buildRecommendations(preview),
    generatedAt: new Date().toISOString(),
    methodologyNote:
      "Phase 1 does not crawl private data or use scare-based scoring. Scores are deterministic placeholders based on URL/domain signals and broad website-readiness heuristics."
  };
}

function buildIssues({
  usesHttps,
  hasDash,
  hasLongDomain,
  hasSubdomain,
  categoryScores
}: {
  domain: string;
  usesHttps: boolean;
  hasDash: boolean;
  hasLongDomain: boolean;
  hasSubdomain: boolean;
  categoryScores: Record<AuditCategory, number>;
}): AuditIssue[] {
  const issues: AuditIssue[] = [];

  if (!usesHttps) {
    issues.push({
      title: "HTTPS should be enabled",
      detail: "The submitted URL uses http. Visitors and browsers expect secure https by default.",
      category: "Technical hygiene",
      severity: "high",
      observed: true
    });
  }

  if (hasLongDomain) {
    issues.push({
      title: "Domain may be harder to remember",
      detail: "Long domains can make direct traffic, verbal referrals, and print/social creative harder.",
      category: "Messaging",
      severity: "medium",
      observed: true
    });
  }

  if (hasDash) {
    issues.push({
      title: "Trust cues may need extra support",
      detail: "Hyphenated domains can still work, but they benefit from stronger proof, reviews, and brand consistency.",
      category: "Trust signals",
      severity: "medium",
      observed: true
    });
  }

  if (hasSubdomain) {
    issues.push({
      title: "Subdomain setup may need review",
      detail: "Subdomains are normal for apps and campaigns, but SEO tracking and conversion paths should be checked.",
      category: "Technical hygiene",
      severity: "low",
      observed: true
    });
  }

  const weakestCategories = Object.entries(categoryScores)
    .sort(([, a], [, b]) => a - b)
    .map(([category]) => category as AuditCategory);

  for (const category of weakestCategories) {
    if (issues.length >= 5) {
      break;
    }

    issues.push({
      title: `${category} could likely improve`,
      detail: "Possible opportunity: this area often affects qualified leads and should be reviewed manually.",
      category,
      severity: categoryScores[category] < 65 ? "medium" : "low",
      observed: false
    });
  }

  return issues.sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
}

function buildRecommendations(preview: AuditPreview): AuditRecommendation[] {
  const directFixes = preview.topIssues.map((issue) => ({
    title: issue.observed ? `Fix: ${issue.title}` : `Review: ${issue.category}`,
    detail: issue.observed
      ? issue.detail
      : `Possible opportunity: ask Zybe Social to review ${issue.category.toLowerCase()} against real page content before treating this as a confirmed issue.`,
    category: issue.category,
    label: issue.observed ? "recommended fix" : "possible opportunity"
  })) satisfies AuditRecommendation[];

  const strategicOpportunities: AuditRecommendation[] = [
    {
      title: "Clarify the primary conversion action",
      detail: "Possible opportunity: make the next step obvious with one main call to action above the fold and repeated near proof sections.",
      category: "Conversion readiness",
      label: "possible opportunity"
    },
    {
      title: "Add a helpful AI assistant only where it reduces friction",
      detail: "Possible opportunity: an AI chatbot can qualify leads, answer service questions, or route visitors when tied to clear business rules.",
      category: "AI/chatbot opportunity",
      label: "possible opportunity"
    },
    {
      title: "Strengthen lead capture paths",
      detail: "Possible opportunity: align forms, calls, booking links, and follow-up copy so leads are useful without being pushy.",
      category: "Lead generation readiness",
      label: "possible opportunity"
    }
  ];

  return [...directFixes, ...strategicOpportunities].slice(0, 6);
}

function stableSignal(value: string) {
  return Array.from(value).reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 3), 0);
}

function severityRank(severity: AuditIssue["severity"]) {
  return severity === "high" ? 3 : severity === "medium" ? 2 : 1;
}

function clampScore(score: number) {
  return Math.max(38, Math.min(94, score));
}
