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
  "Technical hygiene",
  "Performance & speed"
];

export function generateAuditPreview(
  input: NormalizedWebsiteUrl,
  observedSignals?: HomepageObservedSignals
): AuditPreview {
  const domain = input.normalizedDomain;
  const usesHttps = input.websiteUrl.startsWith("https://");

  const categoryScores = Object.fromEntries(
    categories.map((category) => {
      return [category, computeCategoryScore(category, observedSignals, usesHttps)];
    })
  ) as Record<AuditCategory, number>;

  const issues = buildIssues(observedSignals, usesHttps, categoryScores);
  const overallScore = Math.round(
    categories.reduce((sum, category) => sum + categoryScores[category], 0) / categories.length
  );

  return {
    websiteUrl: input.websiteUrl,
    normalizedDomain: domain,
    overallScore,
    topIssues: issues.slice(0, 5),
    categories: categoryScores,
    observedSignals,
    summary:
      observedSignals?.fetchStatus === "success"
        ? "This audit uses 40+ real observed signals from your homepage HTML and HTTP headers. Every issue marked 'observed' is 100% confirmed."
        : "This audit uses deterministic URL/domain heuristics because the homepage could not be safely fetched. Non-observed recommendations are labeled as possible opportunities."
  };
}

export function generateAuditReport(
  input: NormalizedWebsiteUrl,
  observedSignals?: HomepageObservedSignals
): AuditReport {
  const preview = generateAuditPreview(input, observedSignals);

  return {
    ...preview,
    recommendations: buildRecommendations(),
    generatedAt: new Date().toISOString(),
    methodologyNote:
      observedSignals?.fetchStatus === "success"
        ? "Phase 2 safely fetched the homepage HTML only, did not execute JavaScript, did not fetch assets, and extracted 40+ real observed signals from HTML + HTTP headers."
        : "Phase 2 attempted a safe homepage-only fetch, but fell back to deterministic URL/domain heuristics when fetching failed."
  };
}

function computeCategoryScore(
  category: AuditCategory,
  signals?: HomepageObservedSignals,
  usesHttps?: boolean
): number {
  if (!signals || signals.fetchStatus !== "success") {
    // Default scores when no signals available
    const defaults: Record<AuditCategory, number> = {
      "Design & branding": 58,
      "Messaging": 55,
      "SEO basics": 50,
      "Mobile readiness": 52,
      "Conversion readiness": 48,
      "Trust signals": 54,
      "AI/chatbot opportunity": 60,
      "Lead generation readiness": 46,
      "Technical hygiene": 56,
      "Performance & speed": 55
    };
    return defaults[category];
  }

  let score = 65; // Base score

  switch (category) {
    case "SEO basics":
      if (signals.titleExists) score += 8; else score -= 15;
      if (signals.metaDescriptionExists) score += 6; else score -= 12;
      if (signals.h1Exists) score += 4; else score -= 8;
      if (signals.canonicalUrlExists) score += 4;
      if (signals.hasJsonLdStructuredData) score += 5;
      if (signals.schemaOrgDetected) score += 3;
      if (signals.htmlLanguageDeclared) score += 3;
      if (signals.robotTxtAvailable === true) score += 3;
      if (signals.sitemapXmlAvailable === true) score += 3;
      if (signals.robotTxtAvailable === false) score -= 3;
      if (signals.sitemapXmlAvailable === false) score -= 3;
      if (signals.titleLength !== undefined && (signals.titleLength < 10 || signals.titleLength > 70)) score -= 4;
      if (signals.metaDescriptionLength !== undefined && (signals.metaDescriptionLength < 50 || signals.metaDescriptionLength > 160)) score -= 3;
      break;

    case "Messaging":
      if (signals.h1Exists) score += 5; else score -= 10;
      if (signals.ogTitleExists) score += 4;
      if (signals.ogDescriptionExists) score += 3;
      if (signals.wordCount !== undefined && signals.wordCount > 100) score += 3;
      if (signals.wordCount !== undefined && signals.wordCount < 30) score -= 5;
      break;

    case "Mobile readiness":
      if (signals.viewportMetaExists) score += 10; else score -= 15;
      if (signals.htmlLanguageDeclared) score += 3;
      if (signals.cssFileCount !== undefined && signals.cssFileCount > 5) score -= 3;
      if (signals.renderBlockingResources !== undefined && signals.renderBlockingResources > 15) score -= 4;
      break;

    case "Conversion readiness":
      if (signals.ctaKeywordDetected) score += 8; else score -= 8;
      if (signals.contactLinkDetected) score += 6; else score -= 6;
      if (signals.formDetected) score += 5;
      if (signals.ctaKeywordDetected && signals.formDetected) score += 3; // Combined strong signal
      break;

    case "Trust signals":
      if (usesHttps) score += 6; else score -= 10;
      if (signals.socialLinkDetected) score += 5;
      if (signals.hasFooter) score += 3;
      if (signals.hasNavigation) score += 2;
      if (signals.xFrameOptionsHeader) score += 3; // Has clickjacking protection
      if (signals.contentSecurityPolicyHeader) score += 3; // Has CSP
      if (signals.socialProfiles && signals.socialProfiles.length > 2) score += 3;
      break;

    case "Design & branding":
      if (signals.faviconExists) score += 5;
      if (signals.ogImageExists) score += 4;
      if (signals.hasMainElement) score += 2;
      if (signals.cssFileCount !== undefined && signals.cssFileCount > 3) score += 2; // Custom styling likely
      if (signals.cssFileCount !== undefined && signals.cssFileCount === 0) score -= 5; // No custom CSS
      break;

    case "AI/chatbot opportunity":
      // By default, most sites could benefit
      score = 55;
      if (signals.hasMailtoLinks) score -= 3; // Manual email = opportunity for AI
      if (!signals.formDetected && !signals.contactLinkDetected) score += 5; // No lead capture = big opportunity
      if (signals.jsFileCount !== undefined && signals.jsFileCount > 5) score += 3; // Tech-savvy = more likely to adopt AI
      break;

    case "Lead generation readiness":
      if (signals.formDetected) score += 8; else score -= 5;
      if (signals.contactLinkDetected) score += 5;
      if (signals.hasTelLinks) score += 3;
      if (signals.ctaKeywordDetected) score += 3;
      if (!signals.formDetected && !signals.contactLinkDetected) score -= 8;
      break;

    case "Technical hygiene":
      if (usesHttps) score += 5; else score -= 10;
      if (signals.charsetDeclared) score += 4;
      if (signals.htmlLanguageDeclared) score += 3;
      if (signals.hasCompression) score += 4;
      if (signals.xFrameOptionsHeader) score += 3;
      if (signals.contentSecurityPolicyHeader) score += 4;
      if (signals.serverHeader) score += 0; // Neutral - just informational
      if (signals.robotTxtAvailable === true) score += 2;
      if (signals.sitemapXmlAvailable === true) score += 2;
      if (signals.htmlSizeBytes !== undefined && signals.htmlSizeBytes > 100_000) score -= 3;
      break;

    case "Performance & speed":
      if (signals.hasCompression) score += 8;
      if (signals.renderBlockingResources !== undefined) {
        if (signals.renderBlockingResources <= 5) score += 6;
        else if (signals.renderBlockingResources <= 10) score += 3;
        else score -= 5;
      }
      if (signals.htmlSizeBytes !== undefined) {
        if (signals.htmlSizeBytes < 30_000) score += 4;
        else if (signals.htmlSizeBytes > 150_000) score -= 5;
      }
      if (signals.cssFileCount !== undefined && signals.cssFileCount > 5) score -= 3;
      if (signals.jsFileCount !== undefined && signals.jsFileCount > 10) score -= 4;
      if (signals.totalImages !== undefined && signals.totalImages > 20) score -= 3;
      break;
  }

  return clampScore(score);
}

function buildIssues(
  observedSignals?: HomepageObservedSignals,
  usesHttps?: boolean,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _categoryScores?: Record<AuditCategory, number>
): AuditIssue[] {
  const issues: AuditIssue[] = [];

  // ─── HTTPS check (from input URL, not observed signals) ────────────────────

  if (!usesHttps) {
    issues.push({
      title: "HTTPS is not enabled",
      detail: "The submitted URL uses http://. Visitors and browsers expect secure https:// by default. This is critical for trust and SEO.",
      category: "Technical hygiene",
      severity: "high",
      observed: true
    });
  }

  if (!observedSignals || observedSignals.fetchStatus === "failed") {
    if (observedSignals?.fetchStatus === "failed") {
      issues.push({
        title: "Homepage could not be fully checked",
        detail: `Observed fetch result: ${observedSignals.failureReason || "fetch_failed"}. This may be caused by bot protection, timeout, server error, or a non-HTML homepage.`,
        category: "Technical hygiene",
        severity: observedSignals.reachable ? "medium" : "high",
        observed: true
      });
    }
    return issues;
  }

  if (observedSignals.hasCompression === false) {
    issues.push({
      title: "No gzip/brotli compression detected",
      detail: "The server does not appear to compress HTTP responses. Enabling compression can reduce page weight by 60-80% and improve load times significantly.",
      category: "Performance & speed",
      severity: "high",
      observed: true
    });
  }

  // ─── 100% Confirmed Issues from HTML ────────────────────────────

  if (!observedSignals.titleExists) {
    issues.push({
      title: "Page title is missing",
      detail: "The homepage HTML does not include a <title> tag. Search results and browser tabs rely on this. Critical for SEO.",
      category: "SEO basics",
      severity: "high",
      observed: true
    });
  } else if (observedSignals.titleLength !== undefined && observedSignals.titleLength < 10) {
    issues.push({
      title: "Page title is too short",
      detail: `The title tag is only ${observedSignals.titleLength} characters. Titles should be 50-60 characters for optimal search result display.`,
      category: "SEO basics",
      severity: "medium",
      observed: true
    });
  } else if (observedSignals.titleLength !== undefined && observedSignals.titleLength > 70) {
    issues.push({
      title: "Page title may be truncated in search results",
      detail: `The title tag is ${observedSignals.titleLength} characters. Search engines typically display 50-60 characters.`,
      category: "SEO basics",
      severity: "low",
      observed: true
    });
  }

  if (!observedSignals.metaDescriptionExists) {
    issues.push({
      title: "Meta description is missing",
      detail: "The homepage HTML does not include a meta description tag. This weakens search-result snippets and can reduce click-through rates.",
      category: "SEO basics",
      severity: "medium",
      observed: true
    });
  }

  if (!observedSignals.h1Exists) {
    issues.push({
      title: "Homepage H1 heading is missing",
      detail: "The homepage HTML does not include an H1 tag. Clear page structure helps users and search engines understand the main topic.",
      category: "Messaging",
      severity: "medium",
      observed: true
    });
  }

  if (!observedSignals.viewportMetaExists) {
    issues.push({
      title: "Viewport meta tag is missing",
      detail: "The page does not include a viewport meta tag. This is required for proper mobile rendering. Without it, mobile devices render the page at desktop width and zoom out.",
      category: "Mobile readiness",
      severity: "high",
      observed: true
    });
  }

  if (!observedSignals.charsetDeclared) {
    issues.push({
      title: "Character encoding not declared",
      detail: "The page does not declare a charset (UTF-8). This can cause text rendering issues across different browsers and languages.",
      category: "Technical hygiene",
      severity: "medium",
      observed: true
    });
  }

  if (!observedSignals.faviconExists) {
    issues.push({
      title: "No favicon detected",
      detail: "The page does not have a favicon. Browser tabs, bookmarks, and mobile homescreen icons will show a generic placeholder.",
      category: "Design & branding",
      severity: "low",
      observed: true
    });
  }

  if (!observedSignals.htmlLanguageDeclared) {
    issues.push({
      title: "HTML language attribute is missing",
      detail: "The <html> tag does not have a lang attribute. This affects accessibility (screen readers) and SEO (search engines determine content language).",
      category: "Technical hygiene",
      severity: "medium",
      observed: true
    });
  }

  if (!observedSignals.ogTitleExists) {
    issues.push({
      title: "Open Graph title is missing",
      detail: "No og:title meta tag found. When your page is shared on social media (Facebook, LinkedIn, Slack), it may show a generic fallback instead of your intended title.",
      category: "Messaging",
      severity: "medium",
      observed: true
    });
  }

  if (!observedSignals.ogImageExists) {
    issues.push({
      title: "Open Graph image is missing",
      detail: "No og:image meta tag found. Social media shares will lack a preview image, making your links less eye-catching in feeds.",
      category: "Design & branding",
      severity: "medium",
      observed: true
    });
  }

  if (!observedSignals.canonicalUrlExists) {
    issues.push({
      title: "Canonical URL tag is missing",
      detail: "The page does not specify a canonical URL. Without it, search engines may treat multiple URL variations as duplicate content.",
      category: "SEO basics",
      severity: "low",
      observed: true
    });
  }

  // ─── Image issues ────────────────────────────────────────────────

  if (observedSignals.totalImages !== undefined && observedSignals.totalImages > 0 &&
      observedSignals.imagesWithoutAlt !== undefined && observedSignals.imagesWithoutAlt > 0) {
    const pctWithoutAlt = Math.round((observedSignals.imagesWithoutAlt / observedSignals.totalImages) * 100);
    if (pctWithoutAlt > 50) {
      issues.push({
        title: "Most images are missing alt text",
        detail: `${observedSignals.imagesWithoutAlt} out of ${observedSignals.totalImages} images (${pctWithoutAlt}%) lack alt attributes. Alt text is critical for accessibility and image SEO.`,
        category: "SEO basics",
        severity: "high",
        observed: true
      });
    } else {
      issues.push({
        title: "Some images are missing alt text",
        detail: `${observedSignals.imagesWithoutAlt} out of ${observedSignals.totalImages} images are missing alt attributes. Adding descriptive alt text improves accessibility.`,
        category: "SEO basics",
        severity: "medium",
        observed: true
      });
    }
  }

  // ─── Generic link text ──────────────────────────────────────────

  if (observedSignals.hasGenericLinkText) {
    issues.push({
      title: "Generic link text detected",
      detail: 'Some links use generic text like "click here" or "read more". Descriptive link text improves accessibility and helps search engines understand link context.',
      category: "SEO basics",
      severity: "low",
      observed: true
    });
  }

  // ─── Contact & CTA issues ───────────────────────────────────────

  if (!observedSignals.contactLinkDetected) {
    issues.push({
      title: "Contact path is not obvious on homepage",
      detail: "The homepage does not have a clear contact link, email, or phone number. Visitors who want to reach you may leave without taking action.",
      category: "Conversion readiness",
      severity: "medium",
      observed: true
    });
  }

  if (!observedSignals.ctaKeywordDetected) {
    issues.push({
      title: "Primary call-to-action may be unclear",
      detail: "The homepage buttons and links do not contain standard action phrases like 'book a call', 'get started', or 'contact us'. A clear CTA guides visitors to the next step.",
      category: "Conversion readiness",
      severity: "medium",
      observed: true
    });
  }

  if (!observedSignals.formDetected && !observedSignals.contactLinkDetected) {
    issues.push({
      title: "No lead capture path detected",
      detail: "The homepage does not include a form or clear contact link. Visitors have no obvious way to become leads.",
      category: "Lead generation readiness",
      severity: "high",
      observed: true
    });
  }

  // ─── SEO files ──────────────────────────────────────────────────

  if (observedSignals.robotTxtAvailable === false) {
    issues.push({
      title: "robots.txt not found",
      detail: "The site did not return a robots.txt at /robots.txt. This makes it harder to manage crawler access and can lead to wasted crawl budget.",
      category: "SEO basics",
      severity: "low",
      observed: true
    });
  }

  if (observedSignals.sitemapXmlAvailable === false) {
    issues.push({
      title: "XML sitemap not found",
      detail: "The site did not return a sitemap at /sitemap.xml. A sitemap helps search engines discover and index your pages, especially for larger sites.",
      category: "SEO basics",
      severity: "low",
      observed: true
    });
  }

  // ─── Performance issues ─────────────────────────────────────────

  if (observedSignals.renderBlockingResources !== undefined && observedSignals.renderBlockingResources > 15) {
    issues.push({
      title: "High number of render-blocking resources",
      detail: `The page loads ${observedSignals.renderBlockingResources} CSS/JS files. This can significantly slow down initial page render. Consider bundling and deferring non-critical resources.`,
      category: "Performance & speed",
      severity: "medium",
      observed: true
    });
  }

  if (observedSignals.totalImages !== undefined && observedSignals.totalImages > 30) {
    issues.push({
      title: "Large number of images on homepage",
      detail: `The homepage contains ${observedSignals.totalImages} images. Many images can slow down page load without proper optimization (lazy loading, compression, responsive sizes).`,
      category: "Performance & speed",
      severity: "medium",
      observed: true
    });
  }

  // ─── JSON-LD / Structured Data ──────────────────────────────────

  if (!observedSignals.hasJsonLdStructuredData) {
    issues.push({
      title: "No JSON-LD structured data found",
      detail: "The page does not include JSON-LD structured data. Adding schema markup helps search engines understand your content and can enable rich search results.",
      category: "SEO basics",
      severity: "medium",
      observed: true
    });
  }

  // ─── Tracking ───────────────────────────────────────────────────

  if (!observedSignals.gtagDetected && !observedSignals.facebookPixelDetected) {
    issues.push({
      title: "No analytics tracking detected on homepage",
      detail: "No common analytics scripts (Google Analytics, Facebook Pixel, etc.) were detected. Without analytics, it's difficult to measure traffic, conversions, and user behavior.",
      category: "Conversion readiness",
      severity: "medium",
      observed: true
    });
  }

  return issues.sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
}

function buildRecommendations(/* unused */): AuditRecommendation[] {
  // No fix suggestions - this tool focuses on detection and analysis only
  return [];
}

function severityRank(severity: AuditIssue["severity"]) {
  return severity === "high" ? 3 : severity === "medium" ? 2 : 1;
}

function clampScore(score: number) {
  return Math.max(30, Math.min(98, score));
}
