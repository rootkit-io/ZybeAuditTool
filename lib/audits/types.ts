export type AuditCategory =
  | "Design & branding"
  | "Messaging"
  | "SEO basics"
  | "Mobile readiness"
  | "Conversion readiness"
  | "Trust signals"
  | "AI/chatbot opportunity"
  | "Lead generation readiness"
  | "Technical hygiene";

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
  headingCounts?: {
    h1: number;
    h2: number;
    h3: number;
    h4: number;
    h5: number;
    h6: number;
  };
  internalLinkCount?: number;
  externalLinkCount?: number;
  contactLinkDetected?: boolean;
  ctaKeywordDetected?: boolean;
  formDetected?: boolean;
  socialLinkDetected?: boolean;
  robotsTxtAvailable?: boolean;
  sitemapXmlAvailable?: boolean;
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
};
