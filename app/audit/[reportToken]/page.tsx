import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, ExternalLink, PhoneCall } from "lucide-react";
import { getAuditReportByToken } from "@/lib/audits/repository";
import type { AuditReport } from "@/lib/audits/types";

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

  return (
    <main className="min-h-screen bg-background">
      <section className="border-b bg-muted/40">
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex min-h-10 items-center rounded-md px-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Back to audit tool
          </Link>
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-sm font-medium text-primary">Zybe Social report</p>
              <h1 className="mt-2 text-3xl font-semibold md:text-5xl">{report.normalizedDomain}</h1>
              <p className="mt-3 max-w-prose text-sm leading-6 text-muted-foreground">{report.methodologyNote}</p>
            </div>
            <div className="rounded-lg border bg-card p-5 text-card-foreground">
              <div className="text-5xl font-semibold">{report.overallScore}</div>
              <div className="text-sm text-muted-foreground">overall score</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 md:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <div className="space-y-6">
          <div className="rounded-lg border bg-card p-5 text-card-foreground">
            <h2 className="text-xl font-semibold">Top 3 issues</h2>
            <div className="mt-4 grid gap-3">
              {report.topIssues.map((issue) => (
                <div key={`${issue.category}-${issue.title}`} className="rounded-md border bg-background p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{issue.title}</p>
                    <span className="rounded-sm bg-secondary px-2 py-1 text-xs text-secondary-foreground">
                      {issue.observed ? "observed" : "possible opportunity"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{issue.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border bg-card p-5 text-card-foreground">
            <h2 className="text-xl font-semibold">Category scores</h2>
            <div className="mt-4 grid gap-4">
              {Object.entries(report.categories).map(([category, score]) => (
                <div key={category} className="space-y-2">
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span>{category}</span>
                    <span className="font-medium">{score}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-sm bg-muted">
                    <div className="h-full rounded-sm bg-primary" style={{ width: `${score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border bg-card p-5 text-card-foreground">
            <h2 className="text-xl font-semibold">Recommended fixes</h2>
            <div className="mt-4 grid gap-3">
              {report.recommendations.map((recommendation) => (
                <div key={`${recommendation.category}-${recommendation.title}`} className="rounded-md border bg-background p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{recommendation.title}</p>
                    <span className="rounded-sm bg-secondary px-2 py-1 text-xs text-secondary-foreground">
                      {recommendation.label}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{recommendation.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-lg border bg-card p-5 text-card-foreground">
            <h2 className="text-xl font-semibold">Want a human review?</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Zybe Social can help with website development, AI chatbots, branding, video, lead generation, outreach, and technical consulting.
            </p>
            <div className="mt-4 grid gap-2">
              <a
                href="mailto:hello@zybesocial.com?subject=Website%20audit%20follow-up"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <PhoneCall className="h-4 w-4" aria-hidden="true" />
                Contact Zybe Social
              </a>
              <a
                href="https://cal.com/"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                Book a call
              </a>
            </div>
          </div>

          <a
            href={report.websiteUrl}
            rel="noreferrer"
            target="_blank"
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Visit audited site
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        </aside>
      </section>
    </main>
  );
}
