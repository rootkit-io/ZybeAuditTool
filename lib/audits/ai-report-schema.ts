import { z } from "zod";

const auditCategorySchema = z.enum([
  "Design & branding",
  "Messaging",
  "SEO basics",
  "Mobile readiness",
  "Conversion readiness",
  "Trust signals",
  "AI/chatbot opportunity",
  "Lead generation readiness",
  "Technical hygiene"
]);

const aiAuditReportItemSchema = z.object({
  title: z.string().trim().min(3).max(140),
  category: auditCategorySchema,
  observed: z.boolean(),
  explanation: z.string().trim().min(20).max(700),
  recommendedAction: z.string().trim().min(20).max(700)
});

export const aiAuditReportSchema = z.object({
  executiveSummary: z.string().trim().min(60).max(1200),
  overallScoreExplanation: z.string().trim().min(40).max(900),
  topIssues: z.array(aiAuditReportItemSchema).min(1).max(5),
  categoryBreakdown: z
    .array(
      z.object({
        category: auditCategorySchema,
        score: z.number().int().min(0).max(100),
        summary: z.string().trim().min(20).max(600),
        evidence: z.array(z.string().trim().min(3).max(220)).min(1).max(5)
      })
    )
    .min(1)
    .max(9),
  quickWins: z.array(z.string().trim().min(10).max(240)).min(1).max(7),
  deeperRecommendations: z.array(aiAuditReportItemSchema).min(1).max(7),
  zybeServiceOpportunities: z
    .array(
      z.object({
        service: z.string().trim().min(3).max(100),
        relevance: z.string().trim().min(20).max(500)
      })
    )
    .max(7),
  callToAction: z.string().trim().min(30).max(700)
});

export type AiAuditReportOutput = z.infer<typeof aiAuditReportSchema>;
