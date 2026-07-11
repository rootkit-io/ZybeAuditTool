import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, CheckCircle2, ExternalLink, Globe, LayoutDashboard, PhoneCall, Timer, Zap } from "lucide-react";
import { getAuditReportByToken } from "@/lib/audits/repository";
import type { AuditReport, DeepCrawlData } from "@/lib/audits/types";
import { getPublicAppConfig } from "@/lib/config";
import { trackAnalyticsEvent } from "@/lib/analytics";

type PageProps = { params: Promise<{ reportToken: string }> };

const SCORE_COLORS = [
  { threshold: 80, text: "text-emerald-600", bg: "bg-emerald-50", ring: "ring-emerald-200", bar: "bg-emerald-500", label: "Good" },
  { threshold: 60, text: "text-amber-600", bg: "bg-amber-50", ring: "ring-amber-200", bar: "bg-amber-500", label: "Fair" },
  { threshold: 0, text: "text-red-600", bg: "bg-red-50", ring: "ring-red-200", bar: "bg-red-500", label: "Needs work" }
];

function getScore(s: number) { return SCORE_COLORS.find((c) => s >= c.threshold) || SCORE_COLORS[SCORE_COLORS.length - 1]; }

export default async function AuditReportPage({ params }: PageProps) {
  const { reportToken } = await params;
  const audit = await getAuditReportByToken(reportToken);
  if (!audit?.reportJson || audit.status !== "report_ready") notFound();

  const report = audit.reportJson as AuditReport;
  const deepCrawl = audit.deepCrawlData as DeepCrawlData | null;
  const appConfig = getPublicAppConfig();
  const sc = getScore(report.overallScore);

  trackAnalyticsEvent("report_viewed", { normalizedDomain: report.normalizedDomain, score: report.overallScore });

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
      {/* ─── Header ──────────────────────────────────────────────── */}
      <header className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <span className="text-xs text-muted-foreground">Zybe Social audit</span>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
        {/* ─── Hero ──────────────────────────────────────────────── */}
        <div className="rounded-2xl border bg-white p-6 shadow-sm md:p-8 mb-6">
          <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">Website audit report</p>
              <h1 className="mt-2 text-3xl font-bold md:text-5xl">{report.normalizedDomain}</h1>
              <p className="mt-3 max-w-prose text-sm leading-6 text-muted-foreground">{report.methodologyNote}</p>
            </div>
            <div className={`flex flex-col items-center rounded-xl ${sc.bg} ${sc.ring} ring-1 px-6 py-4`}>
              <div className={`text-5xl font-bold ${sc.text}`}>{report.overallScore}</div>
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mt-1">{sc.label}</div>
              <div className="mt-3 h-1.5 w-24 overflow-hidden rounded-full bg-white/60">
                <div className={`h-full rounded-full ${sc.bar}`} style={{ width: `${report.overallScore}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">

          {/* ─── MAIN ────────────────────────────────────────────── */}
          <div className="space-y-5">

            {/* Executive Summary */}
            {report.aiReport && (
              <div className="rounded-2xl border bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h2 className="text-lg font-semibold">Executive summary</h2>
                  <span className="rounded-full bg-primary/5 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-primary ring-1 ring-primary/10">
                    {report.aiReportSource === "ai" ? "AI-powered" : "Summary"}
                  </span>
                </div>
                <p className="text-sm leading-7 text-muted-foreground">{report.aiReport.executiveSummary}</p>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{report.aiReport.overallScoreExplanation}</p>
              </div>
            )}

            {/* Deep Crawl */}
            {deepCrawl && deepCrawl.pages.length > 1 && (
              <div className="rounded-2xl border bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/5">
                    <Globe className="h-4 w-4 text-primary" />
                  </div>
                  <h2 className="text-lg font-semibold">Deep crawl</h2>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 mb-4">
                  <div className="rounded-xl border bg-muted/20 p-3 text-center">
                    <div className="text-2xl font-bold">{deepCrawl.totalPagesCrawled}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">pages crawled</div>
                  </div>
                  <div className="rounded-xl border bg-muted/20 p-3 text-center">
                    <div className="text-2xl font-bold">{deepCrawl.technologies.length}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">technologies</div>
                  </div>
                  <div className="rounded-xl border bg-muted/20 p-3 text-center">
                    <div className="text-2xl font-bold">{(deepCrawl.crawlDurationMs / 1000).toFixed(1)}s</div>
                    <div className="text-xs text-muted-foreground mt-0.5">crawl time</div>
                  </div>
                </div>

                {deepCrawl.technologies.length > 0 && (
                  <>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Detected stack</h3>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {deepCrawl.technologies.map((t) => (
                        <span key={t.name} className="rounded-lg border bg-muted/20 px-2.5 py-1 text-xs font-medium">{t.name}</span>
                      ))}
                    </div>
                  </>
                )}

                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Pages</h3>
                <div className="grid gap-2">
                  {deepCrawl.pages.map((page) => (
                    <div key={page.url} className="rounded-xl border bg-muted/10 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium truncate">{page.title || page.url}</span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">{page.statusCode}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground truncate">{page.url}</p>
                      {page.wordCount > 0 && <p className="mt-0.5 text-[11px] text-muted-foreground">{page.wordCount} words</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Issues */}
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4">Issues</h2>
              <div className="space-y-2.5">
                {(report.aiReport?.topIssues || report.topIssues).map((issue) => (
                  <div key={`${issue.category}-${issue.title}`} className="rounded-xl border bg-muted/10 p-4">
                    <div className="flex items-start gap-3">
                      {issue.observed && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <p className="text-sm font-medium">{issue.title}</p>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                            issue.observed ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                          }`}>
                            {issue.observed ? "Confirmed" : "Possible"}
                          </span>
                        </div>
                        <p className="text-sm leading-6 text-muted-foreground">
                          {"explanation" in issue ? issue.explanation : issue.detail}
                        </p>
                        {"recommendedAction" in issue && (
                          <p className="mt-2 text-sm leading-6 text-primary/80">{issue.recommendedAction}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Category Scores */}
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4">Categories</h2>
              <div className="space-y-3">
                {Object.entries(report.categories).map(([cat, score]) => {
                  const s = getScore(score);
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <span className="text-sm">{cat}</span>
                        <span className={`text-xs font-semibold ${s.text}`}>{score}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted/50">
                        <div className={`h-full rounded-full ${s.bar}`} style={{ width: `${score}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recommendations */}
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4">Recommendations</h2>
              <div className="space-y-2.5">
                {(report.aiReport?.deeperRecommendations || report.recommendations).map((rec) => (
                  <div key={`${rec.category}-${rec.title}`} className="rounded-xl border bg-muted/10 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <p className="text-sm font-medium">{rec.title}</p>
                          <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-secondary-foreground">
                            {"label" in rec ? rec.label : rec.observed ? "Fix" : "Opportunity"}
                          </span>
                        </div>
                        <p className="text-sm leading-6 text-muted-foreground">
                          {"explanation" in rec ? rec.explanation : rec.detail}
                        </p>
                        {"recommendedAction" in rec && (
                          <p className="mt-2 text-sm leading-6 text-primary/80">{rec.recommendedAction}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Wins */}
            {report.aiReport?.quickWins && report.aiReport.quickWins.length > 0 && (
              <div className="rounded-2xl border bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="h-5 w-5 text-amber-500" />
                  <h2 className="text-lg font-semibold">Quick wins</h2>
                </div>
                <div className="space-y-2">
                  {report.aiReport.quickWins.map((win, idx) => (
                    <div key={idx} className="flex items-start gap-3 rounded-xl border bg-muted/10 p-3 text-sm leading-6 text-muted-foreground">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/5 text-xs font-semibold text-primary">
                        {idx + 1}
                      </span>
                      {win}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ─── SIDEBAR ──────────────────────────────────────────── */}
          <aside className="space-y-4">
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-1">Need a human?</h2>
              <p className="text-sm leading-6 text-muted-foreground mb-4">
                {report.aiReport?.callToAction ||
                  "Zybe Social can help with website development, AI chatbots, branding, video, lead generation, outreach, and technical consulting."}
              </p>
              {report.aiReport?.zybeServiceOpportunities && (
                <div className="space-y-2 mb-4">
                  {report.aiReport.zybeServiceOpportunities.map((opp) => (
                    <div key={opp.service} className="rounded-xl border bg-muted/10 p-3">
                      <p className="text-sm font-medium">{opp.service}</p>
                      <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{opp.relevance}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-2">
                <a href={appConfig.contactHref}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]">
                  <PhoneCall className="h-4 w-4" />
                  {appConfig.contactLabel}
                </a>
                <a href={appConfig.bookingUrl}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border bg-background text-sm font-medium transition-all hover:bg-muted active:scale-[0.98]">
                  <CalendarDays className="h-4 w-4" />
                  Book a call
                </a>
                <a href={report.websiteUrl} rel="noreferrer" target="_blank"
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border bg-background text-sm font-medium transition-all hover:bg-muted active:scale-[0.98]">
                  <ExternalLink className="h-4 w-4" />
                  Visit site
                </a>
              </div>
            </div>

            {deepCrawl && deepCrawl.technologies.length > 0 && (
              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <LayoutDashboard className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Stack</h3>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {deepCrawl.technologies.slice(0, 8).map((t) => (
                    <span key={t.name} className="rounded-lg bg-secondary px-2 py-0.5 text-[11px] font-medium">{t.name}</span>
                  ))}
                  {deepCrawl.technologies.length > 8 && (
                    <span className="rounded-lg bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
                      +{deepCrawl.technologies.length - 8}
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Report info</h3>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <p>Domain: <span className="text-foreground">{report.normalizedDomain}</span></p>
                <p>Source: <span className="text-foreground">{report.aiReportSource === "ai" ? "AI-assisted" : "Automated"}</span></p>
                <p>Generated: <span className="text-foreground">{new Date(report.generatedAt).toLocaleDateString()}</span></p>
                {deepCrawl && <p>Pages: <span className="text-foreground">{deepCrawl.totalPagesCrawled}</span></p>}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
