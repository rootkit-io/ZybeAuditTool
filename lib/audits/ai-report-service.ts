import { aiAuditReportSchema } from "./ai-report-schema";
import { buildAiReportPrompt, validateAiReportGrounding } from "./ai-report-prompt";
import { createAuditAiProviderFromEnv, type AuditAiProvider } from "./ai-provider";
import type { AiAuditReport, AuditCategory, AuditReport } from "./types";

export async function enhanceAuditReportWithAi(
  report: AuditReport,
  provider: AuditAiProvider | null = createAuditAiProviderFromEnv()
): Promise<AuditReport> {
  if (!provider) return withFallbackAiReport(report);

  try {
    const prompt = buildAiReportPrompt(report);
    const raw = await provider.generateReportJson(prompt);
    const parsed = aiAuditReportSchema.safeParse(raw);

    if (!parsed.success) {
      console.error("ai_validation_failed", { errors: parsed.error.issues.map(i => i.path.join(".") + ": " + i.message) });
      return withFallbackAiReport(report);
    }

    const aiItems = [...parsed.data.topIssues];
    if (!validateAiReportGrounding(report, aiItems)) {
      console.error("ai_grounding_failed");
      return withFallbackAiReport(report);
    }

    return { ...report, aiReport: parsed.data, aiReportSource: "ai" };
  } catch (err) {
    console.error("ai_generation_failed", { error: err instanceof Error ? err.message : "unknown" });
    return withFallbackAiReport(report);
  }
}

export function withFallbackAiReport(report: AuditReport): AuditReport {
  return {
    ...report,
    aiReport: buildDeterministicReport(report),
    aiReportSource: "deterministic_fallback"
  };
}

function buildDeterministicReport(report: AuditReport): AiAuditReport {
  const observed = report.topIssues.filter(i => i.observed);
  const weakest = Object.entries(report.categories).sort(([,a],[,b]) => a - b).slice(0, 3);
  const dc = report.deepCrawlData;
  const bi = report.businessIntel;

  return {
    businessProfile: {
      summary: bi?.businessDescription || `${report.normalizedDomain} operates a website in the ${bi?.industry || "general business"} space.`,
      industry: bi?.industry || "General Business",
      targetAudience: bi?.targetAudience || "Not determined from available data",
      valueProposition: bi?.valueProposition || "Value proposition not clearly identified",
      mainOfferings: bi?.productsServices?.length ? bi.productsServices.slice(0, 5) : ["Website services/products"],
      businessStage: bi?.estimatedSize === "small" ? "Established small business" : "Established business"
    },
    executiveSummary:
      observed.length > 0
        ? `${report.normalizedDomain} (${bi?.industry || "general business"}) has ${observed.length} confirmed issue${observed.length === 1 ? "" : "s"} to address.${dc ? ` Deep crawl of ${dc.totalPagesCrawled} pages found ${dc.technologies.length} technologies in use.` : ""} The analysis below covers business positioning, competitive landscape, and SEO readiness for their niche.`
        : `${report.normalizedDomain} has a workable foundation in the ${bi?.industry || "general business"} space. The analysis covers positioning, competitive factors, and optimization opportunities.`,
    overallScoreExplanation: `The score of ${report.overallScore} combines ${report.observedSignals ? "40+ real homepage signals" : "available data"} with category-specific analysis. This is a directional readiness score.`,
    topIssues: report.topIssues.map(i => ({
      title: i.title, category: i.category, observed: i.observed,
      explanation: i.detail,
      impact: i.observed ? "Directly impacts user experience and site effectiveness." : "Potential improvement area."
    })),
    categoryBreakdown: Object.entries(report.categories).map(([cat, score]) => ({
      category: cat as AuditCategory, score,
      summary: `${cat} scored ${score}. ${score < 60 ? "This area needs attention." : score < 75 ? "Room for improvement." : "Good shape."}`,
      evidence: report.topIssues.filter(i => i.category === cat).map(i => `${i.observed ? "Confirmed" : "Possible"}: ${i.title}`)
    })),
    competitiveLandscape: {
      directCompetitors: bi?.competitors?.length ? bi.competitors.slice(0, 5).map(c => ({
        name: c.name, website: c.domain, note: c.description.slice(0, 200)
      })) : [{ name: "Unknown", website: "", note: "No competitor data available from search." }],
      marketPosition: bi ? `${report.normalizedDomain} operates in the ${bi.industry} space targeting ${bi.targetAudience}.` : "Market position not determined from available data.",
      differentiation: bi?.valueProposition ? `Key differentiator: ${bi.valueProposition}` : "Differentiation not clearly identified."
    },
    seoNicheAnalysis: {
      strengths: [
        report.observedSignals?.titleExists ? "Page title is present" : "",
        report.observedSignals?.metaDescriptionExists ? "Meta description is present" : "",
        report.observedSignals?.viewportMetaExists ? "Mobile viewport configured" : "",
        report.observedSignals?.hasJsonLdStructuredData ? "Structured data detected" : "",
        report.observedSignals?.canonicalUrlExists ? "Canonical URL set" : "",
        report.observedSignals?.usesHttps ? "HTTPS enabled" : "",
        report.observedSignals?.hasCompression ? "Gzip/brotli compression active" : ""
      ].filter(Boolean),
      gaps: [
        !report.observedSignals?.metaDescriptionExists ? "Missing meta description" : "",
        !report.observedSignals?.h1Exists ? "Missing H1 heading" : "",
        !report.observedSignals?.viewportMetaExists ? "No viewport meta tag" : "",
        !report.observedSignals?.hasJsonLdStructuredData ? "No JSON-LD structured data" : "",
        !report.observedSignals?.canonicalUrlExists ? "No canonical URL" : "",
        (!report.observedSignals?.imagesWithAlt || (report.observedSignals.imagesWithoutAlt ?? 0) > 0) ? `${report.observedSignals?.imagesWithoutAlt || 0} images missing alt text` : ""
      ].filter(Boolean),
      industryStandards: [bi?.industrySeoContext || "Standard SEO practices apply."]
    },
    contentAnalysis: {
      messagingQuality: report.observedSignals?.wordCount && report.observedSignals.wordCount > 100
        ? "Homepage has substantial content." : "Homepage content is minimal.",
      uniqueness: report.observedSignals?.ogTitleExists
        ? "Has Open Graph tags for social sharing." : "No Open Graph tags detected.",
      clarity: report.observedSignals?.h1Exists ? "Clear H1 structure." : "H1 heading is missing."
    },
    quickWins: [
      ...observed.slice(0, 3).map(i => i.title),
      ...Object.entries(report.categories).sort(([,a],[,b]) => a - b).slice(0, 2).map(([c]) => `Review ${c} for improvements`),
      ...(dc?.technologies?.length ? [`Runs on ${dc.technologies.slice(0, 3).map(t => t.name).join(", ")}`] : [])
    ].slice(0, 5),
    zybeServiceOpportunities: weakest.map(([cat]) => ({
      service: cat === "AI/chatbot opportunity" ? "AI chatbots & automation"
        : cat === "Lead generation readiness" ? "Lead generation systems"
        : cat === "Conversion readiness" || cat === "Messaging" || cat === "Design & branding" ? "Website design & conversion optimization"
        : "Technical consulting",
      relevance: `Relevant because ${cat.toLowerCase()} is a lower-scoring area in this audit.`
    }))
  };
}
