import { z } from "zod";

const category = z.enum([
  "Design & branding", "Messaging", "SEO basics", "Mobile readiness",
  "Conversion readiness", "Trust signals", "AI/chatbot opportunity",
  "Lead generation readiness", "Technical hygiene", "Performance & speed"
]);

const item = z.object({
  title: z.string().trim().min(3).max(140),
  category,
  observed: z.boolean(),
  explanation: z.string().trim().min(10).max(700),
  impact: z.string().trim().min(10).max(500)
});

export const aiAuditReportSchema = z.object({
  businessProfile: z.object({
    summary: z.string().trim().min(20).max(1000),
    industry: z.string().trim().min(3).max(100),
    targetAudience: z.string().trim().min(10).max(500),
    valueProposition: z.string().trim().min(10).max(500),
    mainOfferings: z.array(z.string().trim().min(3).max(200)).min(1).max(10),
    businessStage: z.string().trim().min(3).max(100)
  }),
  executiveSummary: z.string().trim().min(30).max(1500),
  overallScoreExplanation: z.string().trim().min(20).max(900),
  topIssues: z.array(item).min(1).max(8),
  categoryBreakdown: z.array(z.object({
    category,
    score: z.number().int().min(0).max(100),
    summary: z.string().trim().min(10).max(600),
    evidence: z.array(z.string().trim().min(3).max(220)).min(0).max(5)
  })).min(1).max(10),
  competitiveLandscape: z.object({
    directCompetitors: z.array(z.object({
      name: z.string().trim().min(2).max(100),
      website: z.string().trim().min(3).max(200),
      note: z.string().trim().min(10).max(400)
    })).max(8),
    marketPosition: z.string().trim().min(10).max(600),
    differentiation: z.string().trim().min(10).max(600)
  }),
  seoNicheAnalysis: z.object({
    strengths: z.array(z.string().trim().min(5).max(300)).min(1).max(8),
    gaps: z.array(z.string().trim().min(5).max(300)).min(1).max(8),
    industryStandards: z.array(z.string().trim().min(5).max(300)).min(1).max(8)
  }),
  contentAnalysis: z.object({
    messagingQuality: z.string().trim().min(10).max(500),
    uniqueness: z.string().trim().min(10).max(500),
    clarity: z.string().trim().min(10).max(500)
  }),
  quickWins: z.array(z.string().trim().min(5).max(240)).min(1).max(7),
  zybeServiceOpportunities: z.array(z.object({
    service: z.string().trim().min(3).max(100),
    relevance: z.string().trim().min(10).max(500)
  })).max(7)
});

export type AiAuditReportOutput = z.infer<typeof aiAuditReportSchema>;
