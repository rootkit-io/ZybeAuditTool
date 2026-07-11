import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, CheckCircle2, ExternalLink, Globe, PhoneCall, Sparkles, Zap } from "lucide-react";
import { getAuditReportByToken } from "@/lib/audits/repository";
import type { AuditReport, DeepCrawlData } from "@/lib/audits/types";
import { getPublicAppConfig } from "@/lib/config";
import { trackAnalyticsEvent } from "@/lib/analytics";

type Props = { params: Promise<{ reportToken: string }> };

const SC = [
  { t: 80, c: "text-emerald-600", b: "bg-emerald-50", r: "ring-emerald-200/50", bar: "bg-emerald-500", l: "Good" },
  { t: 60, c: "text-amber-600", b: "bg-amber-50", r: "ring-amber-200/50", bar: "bg-amber-500", l: "Fair" },
  { t: 0, c: "text-red-600", b: "bg-red-50", r: "ring-red-200/50", bar: "bg-red-500", l: "Needs work" },
];

function si(s: number) { return SC.find(x => s >= x.t) || SC[SC.length - 1]; }

export default async function Page({ params }: Props) {
  const { reportToken } = await params;
  const audit = await getAuditReportByToken(reportToken);
  if (!audit?.reportJson || audit.status !== "report_ready") notFound();

  const report = audit.reportJson as AuditReport;
  const dc = audit.deepCrawlData as DeepCrawlData | null;
  const cfg = getPublicAppConfig();
  const s = si(report.overallScore);

  trackAnalyticsEvent("report_viewed", { normalizedDomain: report.normalizedDomain, score: report.overallScore });

  return (
    <div className="min-h-screen bg-subtle">
      {/* Header */}
      <header className="border-b bg-white/70 backdrop-blur-md sticky top-0 z-10">
        <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Link>
          <span className="text-xs text-muted-foreground">Zybe Social audit</span>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Hero */}
        <div className="rounded-xl border bg-white p-6 shadow-sm mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">Website audit report</p>
              <h1 className="mt-1.5 text-2xl font-bold md:text-4xl">{report.normalizedDomain}</h1>
              <p className="mt-2 max-w-prose text-sm text-muted-foreground">{report.methodologyNote}</p>
            </div>
            <div className={`flex flex-col items-center rounded-lg ${s.b} ${s.r} ring-1 px-4 py-2.5`}>
              <div className={`text-3xl font-bold ${s.c}`}>{report.overallScore}</div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{s.l}</div>
              <div className="mt-2 h-1 w-16 rounded-full bg-white/60 overflow-hidden">
                <div className={`h-full rounded-full ${s.bar}`} style={{ width: `${report.overallScore}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            {/* Summary */}
            {report.aiReport && (
              <div className="rounded-xl border bg-white p-5">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <h2 className="text-base font-semibold">Summary</h2>
                  <span className="rounded-full bg-primary/5 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary ring-1 ring-primary/10">
                    {report.aiReportSource === "ai" ? "AI" : "Auto"}
                  </span>
                </div>
                <p className="text-sm leading-7 text-muted-foreground">{report.aiReport.executiveSummary}</p>
                {report.aiReport.overallScoreExplanation && (
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{report.aiReport.overallScoreExplanation}</p>
                )}
              </div>
            )}

            {/* Deep Crawl */}
            {dc && dc.pages.length > 1 && (
              <div className="rounded-xl border bg-white p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Globe className="h-4 w-4 text-primary" />
                  <h2 className="text-base font-semibold">Deep crawl</h2>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="rounded-lg border bg-muted/20 p-2.5 text-center">
                    <div className="text-lg font-bold">{dc.totalPagesCrawled}</div>
                    <div className="text-[10px] text-muted-foreground">pages</div>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-2.5 text-center">
                    <div className="text-lg font-bold">{dc.technologies.length}</div>
                    <div className="text-[10px] text-muted-foreground">techs</div>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-2.5 text-center">
                    <div className="text-lg font-bold">{(dc.crawlDurationMs / 1000).toFixed(1)}s</div>
                    <div className="text-[10px] text-muted-foreground">duration</div>
                  </div>
                </div>
                {dc.technologies.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {dc.technologies.slice(0, 10).map(t => (
                      <span key={t.name} className="rounded-md border bg-muted/20 px-2 py-0.5 text-[11px] font-medium">{t.name}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Issues */}
            <div className="rounded-xl border bg-white p-5">
              <h2 className="text-base font-semibold mb-3">Issues</h2>
              <div className="space-y-2">
                {(report.aiReport?.topIssues || report.topIssues).map((issue, i) => (
                  <div key={`issue-${i}`} className="rounded-lg border bg-muted/10 p-3.5">
                    <div className="flex items-start gap-2.5">
                      {issue.observed && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2 mb-0.5">
                          <p className="text-sm font-medium">{issue.title}</p>
                          <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                            issue.observed ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                          }`}>{issue.observed ? "Confirmed" : "Possible"}</span>
                        </div>
                        <p className="text-sm leading-6 text-muted-foreground">{"explanation" in issue ? issue.explanation : issue.detail}</p>
                        {"recommendedAction" in issue && (
                          <p className="mt-1 text-sm text-primary/70">{issue.recommendedAction}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Categories */}
            <div className="rounded-xl border bg-white p-5">
              <h2 className="text-base font-semibold mb-3">Categories</h2>
              <div className="space-y-2.5">
                {Object.entries(report.categories).sort(([,a],[,b]) => b - a).map(([cat, score]) => {
                  const x = si(score);
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between text-sm mb-0.5">
                        <span className="text-muted-foreground">{cat}</span>
                        <span className={`text-xs font-semibold ${x.c}`}>{score}</span>
                      </div>
                      <div className="h-1 rounded-full bg-muted/50">
                        <div className={`h-full rounded-full ${x.bar}`} style={{ width: `${score}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Wins */}
            {report.aiReport?.quickWins && report.aiReport.quickWins.length > 0 && (
              <div className="rounded-xl border bg-white p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <h2 className="text-base font-semibold">Quick wins</h2>
                </div>
                <div className="space-y-1.5">
                  {report.aiReport.quickWins.map((w, i) => (
                    <div key={i} className="flex items-start gap-2.5 rounded-lg border bg-muted/10 p-3 text-sm leading-6 text-muted-foreground">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/5 text-[10px] font-semibold text-primary">{i + 1}</span>
                      {w}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-4">
            <div className="rounded-xl border bg-white p-5">
              <h3 className="text-sm font-semibold mb-3">Need help?</h3>
              <p className="text-sm leading-6 text-muted-foreground mb-4">
                {report.aiReport?.callToAction || "Zybe Social can help with development, chatbots, branding, and more."}
              </p>
              <div className="space-y-2">
                <a href={cfg.contactHref} className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-primary text-sm font-medium text-white transition-all hover:bg-primary/90 active:scale-[0.97]">
                  <PhoneCall className="h-3.5 w-3.5" /> {cfg.contactLabel}
                </a>
                <a href={cfg.bookingUrl} className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border bg-background text-sm font-medium transition-all hover:bg-muted active:scale-[0.97]">
                  <CalendarDays className="h-3.5 w-3.5" /> Book a call
                </a>
                <a href={report.websiteUrl} rel="noreferrer" target="_blank" className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border bg-background text-sm font-medium transition-all hover:bg-muted active:scale-[0.97]">
                  <ExternalLink className="h-3.5 w-3.5" /> Visit site
                </a>
              </div>
            </div>

            {dc && dc.technologies.length > 0 && (
              <div className="rounded-xl border bg-white p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Stack</h3>
                <div className="flex flex-wrap gap-1">
                  {dc.technologies.slice(0, 8).map(t => (
                    <span key={t.name} className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium">{t.name}</span>
                  ))}
                  {dc.technologies.length > 8 && (
                    <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">+{dc.technologies.length - 8}</span>
                  )}
                </div>
              </div>
            )}

            <div className="rounded-xl border bg-white p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Details</h3>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>Domain: <span className="text-foreground">{report.normalizedDomain}</span></p>
                <p>Source: <span className="text-foreground">{report.aiReportSource === "ai" ? "AI-assisted" : "Automated"}</span></p>
                <p>Generated: <span className="text-foreground">{new Date(report.generatedAt).toLocaleDateString()}</span></p>
                {dc && <p>Pages: <span className="text-foreground">{dc.totalPagesCrawled}</span></p>}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
