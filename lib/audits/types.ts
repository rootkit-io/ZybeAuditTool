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
  titleExists?: boolean;
  titleLength?: number;
  metaDescriptionExists?: boolean;
  metaDescriptionLength?: number;
  h1Exists?: boolean;
  headingCounts?: { h1: number; h2: number; h3: number; h4: number; h5: number; h6: number; };
  internalLinkCount?: number;
  externalLinkCount?: number;
  nofollowLinkCount?: number;
  hasGenericLinkText?: boolean;
  contactLinkDetected?: boolean;
  ctaKeywordDetected?: boolean;
  formDetected?: boolean;
  hasMailtoLinks?: boolean;
  hasTelLinks?: boolean;
  socialLinkDetected?: boolean;
  socialProfiles?: { platform: string; url: string; }[];
  robotTxtAvailable?: boolean;
  sitemapXmlAvailable?: boolean;
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
  usesHttps?: boolean;
  hasCompression?: boolean;
  serverHeader?: string;
  xFrameOptionsHeader?: string;
  contentSecurityPolicyHeader?: string;
  tlsVersion?: string;
  gtagDetected?: boolean;
  facebookPixelDetected?: boolean;
  hasNavigation?: boolean;
  hasFooter?: boolean;
  hasMainElement?: boolean;
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
  businessIntel?: BusinessIntelligence;
};

// ─── Deep Crawl ─────────────────────────────────────────────────────

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
  /** Detected page type */
  pageType?: "homepage" | "about" | "services" | "contact" | "blog" | "pricing" | "products" | "faq" | "portfolio" | "other";
  error?: string;
};

export type DeepCrawlData = {
  pages: DeepCrawledPage[];
  technologies: DeepCrawlTechnology[];
  crawlDurationMs: number;
  totalPagesCrawled: number;
  totalPagesAttempted: number;
  performanceSummary: { avgLoadTimeMs: number; fastestPage: string; slowestPage: string; };
  /** Detected page types from the crawl */
  detectedPageTypes: string[];
  /** Whether the site has a blog with content */
  hasBlog: boolean;
  /** Whether blog has recent posts (last 3 months) */
  hasRecentBlogPosts: boolean;
  /** Whether pricing page exists */
  hasPricingPage: boolean;
  /** Whether about page exists */
  hasAboutPage: boolean;
  /** Social presence detected */
  socialProfiles: { platform: string; url: string; }[];
  /** Estimated business category */
  estimatedBusinessCategory?: string;
  errors: string[];
};

// ─── Business Intelligence (from web search) ────────────────────────

export type BusinessIntelligence = {
  /** What the company does (from search results) */
  businessDescription: string;
  /** Estimated industry/niche */
  industry: string;
  /** Target audience / customer profile */
  targetAudience: string;
  /** Main value proposition */
  valueProposition: string;
  /** Key products or services offered */
  productsServices: string[];
  /** Competitors found from search */
  competitors: { name: string; domain: string; description: string; }[];
  /** Estimated company size */
  estimatedSize: "freelance" | "small" | "medium" | "large" | "enterprise" | "unknown";
  /** Geographic reach */
  geographicReach: string;
  /** Business model type */
  businessModel: string;
  /** Whether they appear to rank for their own brand name */
  brandSearchResults: { query: string; found: boolean; position?: number; }[];
  /** Industry-specific SEO benchmarks */
  industrySeoContext: string;
};

// ─── AI Report Types ────────────────────────────────────────────────

export type AiAuditReportItem = {
  title: string;
  category: AuditCategory;
  observed: boolean;
  explanation: string;
  impact: string;
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

export type AiCompetitor = {
  name: string;
  website: string;
  note: string;
};

export type AiAuditReport = {
  /** What the business does */
  businessProfile: {
    summary: string;
    industry: string;
    targetAudience: string;
    valueProposition: string;
    mainOfferings: string[];
    businessStage: string;
  };
  executiveSummary: string;
  overallScoreExplanation: string;
  topIssues: AiAuditReportItem[];
  categoryBreakdown: AiAuditCategoryBreakdown[];
  /** Competitor analysis based on search data */
  competitiveLandscape: {
    directCompetitors: AiCompetitor[];
    marketPosition: string;
    differentiation: string;
  };
  /** SEO analysis specific to their niche */
  seoNicheAnalysis: {
    strengths: string[];
    gaps: string[];
    industryStandards: string[];
  };
  /** Content and positioning analysis */
  contentAnalysis: {
    messagingQuality: string;
    uniqueness: string;
    clarity: string;
  };
  quickWins: string[];
  zybeServiceOpportunities: AiAuditServiceOpportunity[];
};
