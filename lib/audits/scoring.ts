import type {
  AuditCategory,
  AuditIssue,
  AuditPreview,
  AuditRecommendation,
  AuditReport,
  HomepageObservedSignals
} from "./types";
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

export function generateAuditPreview(input: NormalizedWebsiteUrl, observedSignals?: HomepageObservedSignals): AuditPreview {
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
        (hasSubdomain && category === "Technical hygiene" ? -3 : 0) +
        observedCategoryAdjustment(category, observedSignals);

      return [category, clampScore(base + adjustment)];
    })
  ) as Record<AuditCategory, number>;

  const issues = buildIssues({ usesHttps, hasDash, hasLongDomain, hasSubdomain, categoryScores, observedSignals });
  const overallScore = Math.round(
    categories.reduce((sum, category) => sum + categoryScores[category], 0) / categories.length
  );

  return {
    websiteUrl: input.websiteUrl,
    normalizedDomain: domain,
    overallScore,
    topIssues: issues.slice(0, 3),
    categories: categoryScores,
    observedSignals,
    summary:
      observedSignals?.fetchStatus === "success"
        ? "This preview uses safe observed homepage checks plus deterministic URL/domain heuristics. Non-observed recommendations are labeled as possible opportunities."
        : "This preview uses deterministic URL/domain heuristics because the homepage could not be safely fetched. Non-observed recommendations are labeled as possible opportunities."
  };
}

export function generateAuditReport(input: NormalizedWebsiteUrl, observedSignals?: HomepageObservedSignals): AuditReport {
  const preview = generateAuditPreview(input, observedSignals);

  return {
    ...preview,
    recommendations: buildRecommendations(preview),
    generatedAt: new Date().toISOString(),
    methodologyNote:
      observedSignals?.fetchStatus === "success"
        ? "Phase 2 safely fetched the homepage HTML only, did not execute JavaScript, did not fetch assets, and combined observed signals with deterministic URL/domain heuristics."
        : "Phase 2 attempted a safe homepage-only fetch, but fell back to deterministic URL/domain heuristics when fetching failed."
  };
}

function buildIssues({
  usesHttps,
  hasDash,
  hasLongDomain,
  hasSubdomain,
  categoryScores,
  observedSignals
}: {
  usesHttps: boolean;
  hasDash: boolean;
  hasLongDomain: boolean;
  hasSubdomain: boolean;
  categoryScores: Record<AuditCategory, number>;
  observedSignals?: HomepageObservedSignals;
}): AuditIssue[] {
  const issues: AuditIssue[] = buildObservedIssues(observedSignals);

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

function buildObservedIssues(observedSignals?: HomepageObservedSignals): AuditIssue[] {
  if (!observedSignals) {
    return [];
  }

  const issues: AuditIssue[] = [];

  if (observedSignals.fetchStatus === "failed") {
    issues.push({
      title: "Homepage could not be fully checked",
      detail: `Observed fetch result: ${observedSignals.failureReason || "fetch_failed"}. This may be caused by bot protection, timeout, server error, or a non-HTML homepage.`,
      category: "Technical hygiene",
      severity: observedSignals.reachable ? "medium" : "high",
      observed: true
    });

    return issues;
  }

  if (!observedSignals.titleExists) {
    issues.push({
      title: "Page title is missing",
      detail: "Observed homepage HTML did not include a title tag. Search results and browser tabs rely on this.",
      category: "SEO basics",
      severity: "high",
      observed: true
    });
  }

  if (!observedSignals.metaDescriptionExists) {
    issues.push({
      title: "Meta description is missing",
      detail: "Observed homepage HTML did not include a meta description. This can weaken search-result snippets.",
      category: "SEO basics",
      severity: "medium",
      observed: true
    });
  }

  if (!observedSignals.h1Exists) {
    issues.push({
      title: "Homepage H1 is missing",
      detail: "Observed homepage HTML did not include an H1. Clear page structure helps users and search engines understand the offer.",
      category: "Messaging",
      severity: "medium",
      observed: true
    });
  }

  if (!observedSignals.contactLinkDetected) {
    issues.push({
      title: "Contact path was not obvious",
      detail: "Observed homepage links did not include a clear contact, email, or phone path.",
      category: "Conversion readiness",
      severity: "medium",
      observed: true
    });
  }

  if (!observedSignals.ctaKeywordDetected) {
    issues.push({
      title: "Primary CTA may be unclear",
      detail: "Observed homepage buttons and links did not contain common action phrases like book a call, get started, or contact us.",
      category: "Conversion readiness",
      severity: "medium",
      observed: true
    });
  }

  if (!observedSignals.formDetected && !observedSignals.contactLinkDetected) {
    issues.push({
      title: "Lead capture path may be weak",
      detail: "Observed homepage HTML did not include a form or clear contact link.",
      category: "Lead generation readiness",
      severity: "medium",
      observed: true
    });
  }

  if (observedSignals.robotsTxtAvailable === false) {
    issues.push({
      title: "robots.txt was not available",
      detail: "Observed check did not find robots.txt at the site root. This can make crawler guidance harder to manage.",
      category: "SEO basics",
      severity: "low",
      observed: true
    });
  }

  if (observedSignals.sitemapXmlAvailable === false) {
    issues.push({
      title: "sitemap.xml was not available",
      detail: "Observed check did not find sitemap.xml at the site root. Larger sites often benefit from a submitted sitemap.",
      category: "SEO basics",
      severity: "low",
      observed: true
    });
  }

  return issues;
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

function observedCategoryAdjustment(category: AuditCategory, observedSignals?: HomepageObservedSignals) {
  if (!observedSignals) {
    return 0;
  }

  if (observedSignals.fetchStatus === "failed") {
    return category === "Technical hygiene" ? -8 : 0;
  }

  const adjustments: Partial<Record<AuditCategory, number>> = {
    "SEO basics":
      (observedSignals.titleExists ? 3 : -8) +
      (observedSignals.metaDescriptionExists ? 3 : -6) +
      (observedSignals.h1Exists ? 2 : -4) +
      (observedSignals.sitemapXmlAvailable ? 2 : -2),
    Messaging: observedSignals.h1Exists ? 3 : -6,
    "Conversion readiness":
      (observedSignals.ctaKeywordDetected ? 5 : -7) +
      (observedSignals.contactLinkDetected ? 4 : -5),
    "Lead generation readiness": observedSignals.formDetected || observedSignals.contactLinkDetected ? 5 : -7,
    "Trust signals": observedSignals.socialLinkDetected ? 2 : -2,
    "Technical hygiene":
      (observedSignals.reachable ? 4 : -10) +
      (observedSignals.robotsTxtAvailable ? 1 : -1) +
      ((observedSignals.htmlSizeBytes || 0) > observedSignals.htmlSizeLimitBytes * 0.8 ? -3 : 0)
  };

  return adjustments[category] || 0;
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
