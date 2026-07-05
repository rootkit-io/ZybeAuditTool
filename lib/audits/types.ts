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

export type AuditPreview = {
  websiteUrl: string;
  normalizedDomain: string;
  overallScore: number;
  topIssues: AuditIssue[];
  categories: Record<AuditCategory, number>;
  summary: string;
};

export type AuditReport = AuditPreview & {
  recommendations: AuditRecommendation[];
  generatedAt: string;
  methodologyNote: string;
};
