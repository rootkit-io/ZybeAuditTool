import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, CheckCircle2, ExternalLink, Globe, LayoutDashboard, PhoneCall, Timer, Zap } from "lucide-react";
import { getAuditReportByToken } from "@/lib/audits/repository";
import type { AuditReport, DeepCrawlData } from "@/lib/audits/types";
import { getPublicAppConfig } from "@/lib/config";
import { trackAnalyticsEvent } from "@/lib/analytics";

type PageProps = {
  params: Promise<{
    reportToken: string;
  }>;
};

export default async function AuditReportPage({ params }: PageProps) {
  const { reportToken } = await params;
  const audit = await getAuditReportByToken(reportToken);

  if (!audit?.reportJson || audit.status !== "report_ready") {
    notFound();
  }

  const report = audit.reportJson as AuditReport;
  const deepCrawl = audit.deepCrawlData as DeepCrawlData | null;
  const appConfig = getPublicAppConfig();

  trackAnalyticsEvent("report_viewed", {
    normalizedDomain: report.normalizedDomain,
    score: report.overallScore
  });

  const scoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const scoreBgColor = (score: number) => {
    if (score >= 80) return "bg-green-50";
    if (score >= 60) return "bg-yellow-50";
    return "bg-red-50";
  };

  return (
    <main className="min-h-screen bg-background">
      {/* ─── Header ──────────────────────────────────────────────── */}
      <section className="border-b bg-gradient-to-b from-muted/60 to-background">
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex min-h-10 items-center rounded-md px-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            &larr; Back to audit tool
          </Link>
          <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-sm font-medium text-primary">Zybe Social report</p>
              <h1 className="mt-1 text-3xl font-semibold md:text-5xl">{report.normalizedDomain}</h1>
              <p className="mt-2 max-w-prose text-sm leading-6 text-muted-foreground">{report.methodologyNote}</p>
            </div>
            <div className={`rounded-xl border p-5 text-center ${scoreBgColor(report.overallScore)}`}>
              <div className={`text-5xl font-bold ${scoreColor(report.overallScore)}`}>{report.overallScore}</div>
              <div className="text-sm text-muted-foreground">overall score</div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/50">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${report.overallScore}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 md:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
        {/* ─── Main Content ──────────────────────────────────────── */}
        <div className="space-y-6">
          {/* AI Summary or Fallback */}
          {report.aiReport ? (
            <div className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold">Executive summary</h2>
                <span className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">
                  {report.aiReportSource === "ai" ? "AI-powered analysis" : "Automated summary"}
                </span>
              </div>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{report.aiReport.executiveSummary}</p>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{report.aiReport.overallScoreExplanation}</p>
            </div>
          ) : null}

          {/* Deep Crawl Summary */}
          {deepCrawl && deepCrawl.pages.length > 1 && (
            <div className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" aria-hidden="true" />
                <h2 className="text-xl font-semibold">Deep crawl results</h2>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border bg-background p-3 text-center">
                  <div className="text-2xl font-bold">{deepCrawl.totalPagesCrawled}</div>
                  <div className="text-xs text-muted-foreground">pages crawled</div>
                </div>
                <div className="rounded-lg border bg-background p-3 text-center">
                  <div className="text-2xl font-bold">{deepCrawl.technologies.length}</div>
                  <div className="text-xs text-muted-foreground">technologies found</div>
                </div>
                <div className="rounded-lg border bg-background p-3 text-center">
                  <div className="text-2xl font-bold">{(deepCrawl.crawlDurationMs / 1000).toFixed(1)}s</div>
                  <div className="text-xs text-muted-foreground">crawl duration</div>
                </div>
              </div>

              {/* Technologies */}
              {deepCrawl.technologies.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium mb-2">Detected technologies</h3>
                  <div className="flex flex-wrap gap-2">
                    {deepCrawl.technologies.map((tech) => (
                      <span
                        key={tech.name}
                        className="rounded-full border bg-background px-3 py-1 text-xs font-medium"
                      >
                        {tech.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Pages */}
              <div className="mt-4">
                <h3 className="text-sm font-medium mb-2">Crawled pages</h3>
                <div className="grid gap-2">
                  {deepCrawl.pages.map((page) => (
                    <div key={page.url} className="rounded-lg border bg-background p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium truncate">{page.title || page.url}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">{page.statusCode}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground truncate">{page.url}</p>
                      {page.wordCount > 0 && (
                        <p className="mt-1 text-xs text-muted-foreground">{page.wordCount} words</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Top Issues */}
          <div className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
            <h2 className="text-xl font-semibold">Top issues</h2>
            <div className="mt-4 grid gap-3">
              {(report.aiReport?.topIssues || report.topIssues).map((issue) => (
                <div
                  key={`${issue.category}-${issue.title}`}
                  className="rounded-lg border bg-background p-4"
                >
                  <div className="flex flex-wrap items-start gap-2">
                    {issue.observed && (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" aria-hidden="true" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium">{issue.title}</p>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                            issue.observed
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {issue.observed ? "confirmed" : "possible opportunity"}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
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
          <div className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
            <h2 className="text-xl font-semibold">Category scores</h2>
            <div className="mt-4 grid gap-4">
              {Object.entries(report.categories).map(([category, score]) => (
                <div key={category} className="space-y-2">
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span>{category}</span>
                    <span className={`font-medium ${scoreColor(score)}`}>{score}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
            <h2 className="text-xl font-semibold">Recommended fixes</h2>
            <div className="mt-4 grid gap-3">
              {(report.aiReport?.deeperRecommendations || report.recommendations).map((rec) => (
                <div
                  key={`${rec.category}-${rec.title}`}
                  className="rounded-lg border bg-background p-4"
                >
                  <div className="flex flex-wrap items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium">{rec.title}</p>
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                          {"label" in rec ? rec.label : rec.observed ? "recommended" : "opportunity"}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
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
            <div className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" aria-hidden="true" />
                <h2 className="text-xl font-semibold">Quick wins</h2>
              </div>
              <div className="mt-4 grid gap-2">
                {report.aiReport.quickWins.map((win, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 rounded-lg border bg-background p-3 text-sm leading-6 text-muted-foreground"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                      {idx + 1}
                    </span>
                    {win}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ─── Sidebar ───────────────────────────────────────────── */}
        <aside className="space-y-4">
          <div className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
            <h2 className="text-xl font-semibold">Want a human review?</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {report.aiReport?.callToAction ||
                "Zybe Social can help with website development, AI chatbots, branding, video, lead generation, outreach, and technical consulting."}
            </p>
            {report.aiReport?.zybeServiceOpportunities && (
              <div className="mt-4 space-y-3">
                {report.aiReport.zybeServiceOpportunities.map((opp) => (
                  <div key={opp.service} className="rounded-lg border bg-background p-3">
                    <p className="text-sm font-medium">{opp.service}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{opp.relevance}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-5 grid gap-2">
              <a
                href={appConfig.contactHref}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <PhoneCall className="h-4 w-4" aria-hidden="true" />
                {appConfig.contactLabel}
              </a>
              <a
                href={appConfig.bookingUrl}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
              >
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                Book a call
              </a>
              <a
                href={report.websiteUrl}
                rel="noreferrer"
                target="_blank"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                Visit audited site
              </a>
            </div>
          </div>

          {/* Deep Crawl Quick Summary in Sidebar */}
          {deepCrawl && deepCrawl.technologies.length > 0 && (
            <div className="rounded-xl border bg-card p-5 text-card-foreground shadow-sm">
              <div className="flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4 text-primary" aria-hidden="true" />
                <h3 className="text-sm font-semibold">Stack detected</h3>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {deepCrawl.technologies.slice(0, 6).map((tech) => (
                  <span
                    key={tech.name}
                    className="rounded-md bg-secondary px-2 py-0.5 text-xs"
                  >
                    {tech.name}
                  </span>
                ))}
                {deepCrawl.technologies.length > 6 && (
                  <span className="rounded-md bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                    +{deepCrawl.technologies.length - 6} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Report Metadata */}
          <div className="rounded-xl border bg-card p-5 text-card-foreground shadow-sm">
            <h3 className="text-sm font-semibold">Report info</h3>
            <div className="mt-2 space-y-1.5 text-xs text-muted-foreground">
              <p>Domain: {report.normalizedDomain}</p>
              <p>Source: {report.aiReportSource === "ai" ? "AI-assisted" : "Automated"}</p>
              <p>Generated: {new Date(report.generatedAt).toLocaleDateString()}</p>
              {deepCrawl && <p>Pages crawled: {deepCrawl.totalPagesCrawled}</p>}
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
