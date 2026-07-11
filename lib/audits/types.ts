export type AuditCategory =
  | "Design & branding"
  | "Messaging"
  | "SEO basics"
  | "Mobile readiness"
  | "Conversion readiness"
  | "Trust signals"
  | "AI/chatbot opportunity"
  | "Lead generation readiness"
  | "Technical hygiene"
  | "Performance & speed";

export type AuditIssue = {
  title: string;
  detail: string;
  category: AuditCategory;
  severity: "low" | "medium" | "high";
  observed: boolean;
};

export type AuditRecommendation = {
  title: string;
  detail: string;
  category: AuditCategory;
  label: "recommended fix" | "possible opportunity";
};

export type HomepageObservedSignals = {
  fetchStatus: "success" | "failed";
  reachable: boolean;
  requestedUrl: string;
  finalUrl?: string;
  statusCode?: number;
  redirected: boolean;
  redirectCount: number;
  htmlSizeBytes?: number;
  htmlSizeLimitBytes: number;
  contentType?: string;

  // Title & Meta
  titleExists?: boolean;
  titleLength?: number;
  metaDescriptionExists?: boolean;
  metaDescriptionLength?: number;

  // Headings
  h1Exists?: boolean;
  headingCounts?: {
    h1: number;
    h2: number;
    h3: number;
    h4: number;
    h5: number;
    h6: number;
  };

  // Links
  internalLinkCount?: number;
  externalLinkCount?: number;
  nofollowLinkCount?: number;
  hasGenericLinkText?: boolean;

  // Contact & CTA
  contactLinkDetected?: boolean;
  ctaKeywordDetected?: boolean;
  formDetected?: boolean;
  hasMailtoLinks?: boolean;
  hasTelLinks?: boolean;

  // Social
  socialLinkDetected?: boolean;
  socialProfiles?: { platform: string; url: string }[];

  // SEO files
  robotTxtAvailable?: boolean;
  sitemapXmlAvailable?: boolean;

  // 100% confirmed enhanced signals
  viewportMetaExists?: boolean;
  charsetDeclared?: boolean;
  faviconExists?: boolean;
  ogTitleExists?: boolean;
  ogDescriptionExists?: boolean;
  ogImageExists?: boolean;
  twitterCardExists?: boolean;
  canonicalUrlExists?: boolean;
  htmlLanguageDeclared?: boolean;
  htmlLanguage?: string;
  hasJsonLdStructuredData?: boolean;
  wordCount?: number;
  cssFileCount?: number;
  jsFileCount?: number;
  totalImages?: number;
  imagesWithAlt?: number;
  imagesWithoutAlt?: number;
  schemaOrgDetected?: boolean;
  renderBlockingResources?: number;

  // HTTP header signals (100% confirmed)
  usesHttps?: boolean;
  hasCompression?: boolean;
  serverHeader?: string;
  xFrameOptionsHeader?: string;
  contentSecurityPolicyHeader?: string;
  tlsVersion?: string;

  // Tracking detection
  gtagDetected?: boolean;
  facebookPixelDetected?: boolean;

  // Page structure
  hasNavigation?: boolean;
  hasFooter?: boolean;
  hasMainElement?: boolean;

  // Failure
  failureReason?: string;
  checkedAt: string;
};

export type AuditPreview = {
  websiteUrl: string;
  normalizedDomain: string;
  overallScore: number;
  topIssues: AuditIssue[];
  categories: Record<AuditCategory, number>;
  observedSignals?: HomepageObservedSignals;
  summary: string;
};

export type AuditReport = AuditPreview & {
  recommendations: AuditRecommendation[];
  generatedAt: string;
  methodologyNote: string;
  aiReport?: AiAuditReport;
  aiReportSource?: "ai" | "deterministic_fallback";
  deepCrawlData?: DeepCrawlData;
};

// ─── Deep Crawl Types (Firecrawl) ─────────────────────────────────────

export type DeepCrawlTechnology = {
  name: string;
  category: "framework" | "cms" | "analytics" | "cdn" | "hosting" | "javascript" | "css" | "seo" | "other";
  version?: string;
  confidence: number;
};

export type DeepCrawledPage = {
  url: string;
  title: string;
  description: string;
  wordCount: number;
  statusCode: number;
  loadTimeMs: number;
  headings: { h1: string[]; h2: string[]; h3: string[] };
  internalLinks: number;
  externalLinks: number;
  totalImages: number;
  imagesWithAlt: number;
  imagesWithoutAlt: number;
  hasForms: boolean;
  hasContactInfo: boolean;
  hasFooter: boolean;
  hasNavigation: boolean;
  technologies: DeepCrawlTechnology[];
  contentSnippet: string;
  error?: string;
};

export type DeepCrawlData = {
  pages: DeepCrawledPage[];
  technologies: DeepCrawlTechnology[];
  crawlDurationMs: number;
  totalPagesCrawled: number;
  totalPagesAttempted: number;
  performanceSummary: {
    avgLoadTimeMs: number;
    fastestPage: string;
    slowestPage: string;
  };
  errors: string[];
};

// ─── AI Report Types ──────────────────────────────────────────────────

export type AiAuditReportItem = {
  title: string;
  category: AuditCategory;
  observed: boolean;
  explanation: string;
  recommendedAction: string;
};

export type AiAuditCategoryBreakdown = {
  category: AuditCategory;
  score: number;
  summary: string;
  evidence: string[];
};

export type AiAuditServiceOpportunity = {
  service: string;
  relevance: string;
};

export type AiAuditReport = {
  executiveSummary: string;
  overallScoreExplanation: string;
  topIssues: AiAuditReportItem[];
  categoryBreakdown: AiAuditCategoryBreakdown[];
  quickWins: string[];
  deeperRecommendations: AiAuditReportItem[];
  zybeServiceOpportunities: AiAuditServiceOpportunity[];
  callToAction: string;
};
