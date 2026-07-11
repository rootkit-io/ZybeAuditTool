"use client";

import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Cpu,
  Gauge,
  Globe,
  Loader2,
  LockKeyhole,
  Search,
  Sparkles,
  Zap
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AuditPreview, AuditReport } from "@/lib/audits/types";

type StartResponse = {
  auditRequestId: string;
  preview: AuditPreview;
};

type SubmitResponse = {
  reportUrl: string;
  report: AuditReport;
};

type CrawlStatusData = {
  status: string;
  hasDeepCrawlData: boolean;
  totalPagesCrawled: number;
  technologiesFound: number;
  crawlDurationMs: number;
};

const auditChecks = [
  "Design & branding",
  "Messaging",
  "SEO basics",
  "Mobile readiness",
  "Conversion readiness",
  "Trust signals",
  "AI/chatbot opportunity",
  "Lead generation readiness",
  "Technical hygiene",
  "Performance & speed"
];

// Steps shown progressively during crawl
const CRAWL_STEPS = [
  { icon: Search, label: "Fetching homepage HTML" },
  { icon: Globe, label: "Analyzing page structure" },
  { icon: Cpu, label: "Crawling subpages" },
  { icon: Gauge, label: "Measuring performance" },
  { icon: Zap, label: "Detecting technologies" },
  { icon: CheckCircle2, label: "Deep crawl complete" }
];

export function AuditToolClient() {
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [consentToContact, setConsentToContact] = useState(false);
  const [preview, setPreview] = useState<StartResponse | null>(null);
  const [report, setReport] = useState<SubmitResponse | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Crawl progress state
  const [crawlStatus, setCrawlStatus] = useState<CrawlStatusData | null>(null);
  const [crawlStep, setCrawlStep] = useState(0);
  const crawlPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Animated issue reveal
  const [visibleIssues, setVisibleIssues] = useState(0);
  const issueTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const weakestCategory = useMemo(() => {
    if (!preview) return null;
    return Object.entries(preview.preview.categories).sort(([, a], [, b]) => a - b)[0];
  }, [preview]);

  // ─── Start Audit ────────────────────────────────────────────────

  async function startAudit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setReport(null);
    setPreview(null);
    setCrawlStatus(null);
    setCrawlStep(0);
    setVisibleIssues(0);
    setIsStarting(true);

    try {
      const response = await fetch("/api/audits/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteUrl })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(readApiError(data, "Could not create preview audit."));
      }

      setPreview(data as StartResponse);

      // Start polling for crawl status
      startCrawlPolling(data.auditRequestId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create preview audit.");
    } finally {
      setIsStarting(false);
    }
  }

  // ─── Crawl Polling ──────────────────────────────────────────────

  function startCrawlPolling(auditRequestId: string) {
    // Animate through steps as time passes (gives user visual feedback)
    let step = 0;
    const stepInterval = setInterval(() => {
      step++;
      if (step < CRAWL_STEPS.length) {
        setCrawlStep(step);
      }
    }, 3000);
    crawlPollRef.current = stepInterval;

    // Actually poll the backend
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/audits/crawl/status/${auditRequestId}`);
        if (!res.ok) return;
        const data: CrawlStatusData = await res.json();
        setCrawlStatus(data);

        if (data.status === "complete" || data.status === "failed") {
          clearInterval(pollInterval);
          clearInterval(stepInterval);
          crawlPollRef.current = null;
          setCrawlStep(data.status === "complete" ? CRAWL_STEPS.length - 1 : CRAWL_STEPS.length - 2);
        }

        // Update step based on actual data
        if (data.totalPagesCrawled > 0) setCrawlStep(Math.max(3, crawlStep));
        if (data.technologiesFound > 0) setCrawlStep(Math.max(4, crawlStep));
      } catch {
        // Polling failed, continue
      }
    }, 2000);

    // Store both intervals
    (crawlPollRef as any) = { stepInterval, pollInterval };
  }

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (crawlPollRef.current) {
        clearInterval(crawlPollRef.current);
      }
    };
  }, []);

  // ─── Animated Issue Reveal ──────────────────────────────────────

  useEffect(() => {
    if (!preview) return;

    // Reveal issues one by one
    const totalIssues = preview.preview.topIssues.length;
    if (totalIssues === 0) return;

    setVisibleIssues(0);
    let i = 0;
    issueTimerRef.current = setInterval(() => {
      i++;
      setVisibleIssues(i);
      if (i >= totalIssues) {
        clearInterval(issueTimerRef.current!);
      }
    }, 400);

    return () => {
      if (issueTimerRef.current) clearInterval(issueTimerRef.current);
    };
  }, [preview]);

  // ─── Submit Email ───────────────────────────────────────────────

  async function submitEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!preview) {
      setError("Start with a website URL first.");
      return;
    }

    setError(null);
    setIsSubmittingEmail(true);

    try {
      const response = await fetch("/api/audits/submit-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auditRequestId: preview.auditRequestId,
          email,
          name,
          company,
          phone,
          consentToContact
        })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(readApiError(data, "Could not unlock report."));
      }

      setReport(data as SubmitResponse);

      // Clean up crawl polling
      if (crawlPollRef.current) {
        clearInterval(crawlPollRef.current);
        crawlPollRef.current = null;
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not unlock report.");
    } finally {
      setIsSubmittingEmail(false);
    }
  }

  // ─── Score color helper ─────────────────────────────────────────

  const scoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const scoreBgColor = (score: number) => {
    if (score >= 80) return "bg-green-100";
    if (score >= 60) return "bg-yellow-50";
    return "bg-red-50";
  };

  return (
    <main className="min-h-screen bg-background">
      {/* ─── Hero Section ─────────────────────────────────────────── */}
      <section className="border-b bg-gradient-to-b from-muted/60 to-background">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 md:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-14">
          <div className="flex flex-col justify-center gap-5">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border bg-background/80 px-4 py-1.5 text-sm text-muted-foreground shadow-sm backdrop-blur">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
              Free Zybe Social website audit
            </div>
            <div className="max-w-3xl space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-5xl">
                Website audit that <span className="text-primary">actually finds issues</span>
              </h1>
              <p className="max-w-prose text-base leading-7 text-muted-foreground md:text-lg">
                40+ real homepage checks. No fake scores. Get a practical audit with confirmed issues and AI-powered recommendations in seconds.
              </p>
            </div>
            <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              {auditChecks.map((check) => (
                <div key={check} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <span>{check}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ─── URL Input Form ──────────────────────────────────── */}
          <div className="rounded-xl border bg-card p-4 text-card-foreground shadow-md md:p-6">
            <form className="space-y-4" onSubmit={startAudit} aria-busy={isStarting}>
              <div className="space-y-2">
                <label htmlFor="websiteUrl" className="text-sm font-medium">
                  Website URL
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <input
                    id="websiteUrl"
                    name="websiteUrl"
                    type="url"
                    inputMode="url"
                    autoComplete="url"
                    placeholder="https://example.com"
                    value={websiteUrl}
                    onChange={(event) => setWebsiteUrl(event.target.value)}
                    className="min-h-11 w-full rounded-md border bg-background pl-9 pr-3 py-2 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    required
                  />
                </div>
                <p className="text-xs leading-5 text-muted-foreground">
                  We only scan public homepage data. No JavaScript execution, no private data.
                </p>
              </div>
              <button
                type="submit"
                disabled={isStarting}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isStarting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Search className="h-4 w-4" aria-hidden="true" />
                )}
                {isStarting ? "Scanning..." : "Audit my website"}
              </button>
            </form>

            <div className="mt-5 rounded-lg border bg-muted/30 p-3 text-sm leading-6 text-muted-foreground">
              <p>Email is only requested after your preview so we can save your full report.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Results Section ────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
        {error ? (
          <div className="mb-6 animate-in fade-in slide-in-from-top-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
            {error}
          </div>
        ) : null}

        {!preview ? (
          /* ─── Empty State ───────────────────────────────────── */
          <div className="rounded-xl border-2 border-dashed bg-card/50 p-8 text-card-foreground">
            <div className="mx-auto max-w-md text-center">
              <Search className="mx-auto h-10 w-10 text-muted-foreground/50" aria-hidden="true" />
              <h2 className="mt-4 text-xl font-semibold">Your audit preview will appear here</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Submit a public website URL above. We&apos;ll scan for 40+ signals and show you confirmed issues instantly.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
            {/* ─── Preview / Results ────────────────────────────── */}
            <div className="space-y-4">
              {/* Score Card */}
              <div className="rounded-xl border bg-card p-5 text-card-foreground shadow-sm">
                <div className="flex items-baseline justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-semibold">Audit preview</h2>
                      <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">
                        Live
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{preview.preview.normalizedDomain}</p>
                  </div>
                  <div className={`flex flex-col items-center rounded-lg px-4 py-2 ${scoreBgColor(preview.preview.overallScore)}`}>
                    <div className={`text-3xl font-bold ${scoreColor(preview.preview.overallScore)}`}>
                      {preview.preview.overallScore}
                    </div>
                    <div className="text-xs text-muted-foreground">/100</div>
                  </div>
                </div>

                {/* Score bar */}
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-1000 ease-out"
                    style={{ width: `${preview.preview.overallScore}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {preview.preview.observedSignals?.fetchStatus === "success"
                    ? "Based on 40+ real homepage signals. All issues marked 'observed' are 100% confirmed."
                    : "Based on available data. Some issues may be possible opportunities."}
                </p>
              </div>

              {/* Issues appearing one by one */}
              <div className="rounded-xl border bg-card p-5 text-card-foreground shadow-sm">
                <h2 className="text-xl font-semibold">
                  Issues found
                  {preview.preview.topIssues.length > 0 && (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      ({Math.min(visibleIssues, preview.preview.topIssues.length)}/{preview.preview.topIssues.length})
                    </span>
                  )}
                </h2>
                <div className="mt-4 grid gap-2">
                  {preview.preview.topIssues.slice(0, visibleIssues).map((issue, index) => (
                    <div
                      key={`${issue.category}-${issue.title}`}
                      className="animate-in fade-in slide-in-from-left-2 rounded-lg border bg-background p-4"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          {issue.observed ? (
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" aria-hidden="true" />
                          ) : (
                            <div className="mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 border-yellow-400" aria-hidden="true" />
                          )}
                          <div>
                            <p className="text-sm font-medium">{issue.title}</p>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">{issue.detail}</p>
                          </div>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                            issue.observed
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {issue.observed ? "confirmed" : "possible"}
                        </span>
                      </div>
                    </div>
                  ))}
                  {visibleIssues < preview.preview.topIssues.length && (
                    <div className="flex items-center justify-center py-3">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />
                      <span className="ml-2 text-sm text-muted-foreground">Checking more signals...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Category Scores (animated bars) */}
              <div className="rounded-xl border bg-card p-5 text-card-foreground shadow-sm">
                <h2 className="text-xl font-semibold">Category breakdown</h2>
                <div className="mt-4 grid gap-3">
                  {Object.entries(preview.preview.categories).map(([category, score], idx) => (
                    <div
                      key={category}
                      className="animate-in fade-in"
                      style={{ animationDelay: `${idx * 80}ms` }}
                    >
                      <div className="flex items-center justify-between gap-4 text-sm">
                        <span className="truncate">{category}</span>
                        <span className={`shrink-0 font-medium ${scoreColor(score)}`}>{score}</span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                          style={{ width: `${score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Crawl Progress (shows during background deep crawl) */}
              {crawlStatus?.status === "crawling" && (
                <div className="rounded-xl border bg-gradient-to-r from-blue-50 to-indigo-50 p-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
                    <div>
                      <h3 className="text-sm font-semibold">Deep crawling in progress</h3>
                      <p className="text-xs text-muted-foreground">
                        {crawlStatus.technologiesFound > 0
                          ? `Found ${crawlStatus.technologiesFound} technologies across ${crawlStatus.totalPagesCrawled} pages`
                          : `Scanned ${crawlStatus.totalPagesCrawled} pages so far`}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-1.5">
                    {CRAWL_STEPS.map((step, i) => (
                      <div
                        key={step.label}
                        className={`flex items-center gap-2 text-xs ${
                          i < crawlStep
                            ? "text-green-600"
                            : i === crawlStep
                              ? "text-primary font-medium"
                              : "text-muted-foreground"
                        }`}
                      >
                        {i < crawlStep ? (
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        ) : i === crawlStep ? (
                          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden="true" />
                        ) : (
                          <div className="h-3.5 w-3.5 shrink-0 rounded-full border-2" aria-hidden="true" />
                        )}
                        <span>{step.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Deep crawl complete notice */}
              {crawlStatus?.status === "complete" && !report && (
                <div className="rounded-xl border bg-gradient-to-r from-green-50 to-emerald-50 p-4 text-sm shadow-sm">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    <span className="font-medium">
                      Deep crawl complete — {crawlStatus.technologiesFound} technologies found on {crawlStatus.totalPagesCrawled} pages
                    </span>
                  </div>
                  {crawlStatus.crawlDurationMs > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Analyzed in {(crawlStatus.crawlDurationMs / 1000).toFixed(1)}s
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* ─── Right Column: Email Form ─────────────────────── */}
            <div className="lg:sticky lg:top-6 lg:self-start">
              <div className="rounded-xl border bg-card p-5 text-card-foreground shadow-sm">
                {report ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-primary">
                      <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                      Full report unlocked
                    </div>
                    <h2 className="text-2xl font-semibold">Report saved</h2>
                    <p className="text-sm leading-6 text-muted-foreground">
                      Your comprehensive audit report for <strong>{report.report.normalizedDomain}</strong> is ready.
                      {crawlStatus?.totalPagesCrawled && crawlStatus.totalPagesCrawled > 1
                        ? `Deep crawl analyzed ${crawlStatus.totalPagesCrawled} pages.`
                        : ""}
                    </p>
                    <a
                      href={report.reportUrl}
                      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      Open full report
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </a>
                  </div>
                ) : (
                  <form className="space-y-4" onSubmit={submitEmail} aria-busy={isSubmittingEmail}>
                    <div className="flex items-center gap-2">
                      <LockKeyhole className="h-5 w-5 text-primary" aria-hidden="true" />
                      <h2 className="text-xl font-semibold">Unlock full report</h2>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5 sm:col-span-2">
                        <label htmlFor="email" className="text-sm font-medium">
                          Email <span className="text-destructive">*</span>
                        </label>
                        <input
                          id="email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          spellCheck={false}
                          placeholder="you@example.com"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          className="min-h-11 w-full rounded-md border bg-background px-3 py-2 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="name" className="text-sm font-medium">
                          Name
                        </label>
                        <input
                          id="name"
                          name="name"
                          type="text"
                          autoComplete="name"
                          value={name}
                          onChange={(event) => setName(event.target.value)}
                          className="min-h-11 w-full rounded-md border bg-background px-3 py-2 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="company" className="text-sm font-medium">
                          Company
                        </label>
                        <input
                          id="company"
                          name="company"
                          type="text"
                          autoComplete="organization"
                          value={company}
                          onChange={(event) => setCompany(event.target.value)}
                          className="min-h-11 w-full rounded-md border bg-background px-3 py-2 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <label htmlFor="phone" className="text-sm font-medium">
                          Phone
                        </label>
                        <input
                          id="phone"
                          name="phone"
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          value={phone}
                          onChange={(event) => setPhone(event.target.value)}
                          className="min-h-11 w-full rounded-md border bg-background px-3 py-2 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        />
                      </div>
                    </div>

                    <label className="flex gap-3 rounded-lg border bg-muted/30 p-3 text-sm leading-6 cursor-pointer hover:bg-muted/50 transition-colors">
                      <input
                        type="checkbox"
                        checked={consentToContact}
                        onChange={(event) => setConsentToContact(event.target.checked)}
                        className="mt-1 h-4 w-4 shrink-0 rounded border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        required
                      />
                      <span>
                        I agree Zybe Social can save my report and contact me about relevant services.
                      </span>
                    </label>

                    <p className="text-xs leading-5 text-muted-foreground">
                      We store only what you provide. No private data scraping.
                    </p>

                    <button
                      type="submit"
                      disabled={isSubmittingEmail}
                      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSubmittingEmail ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                      )}
                      {isSubmittingEmail ? "Generating..." : "Unlock full report"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function readApiError(data: unknown, fallback: string) {
  if (data && typeof data === "object" && "error" in data && typeof data.error === "string") {
    return data.error;
  }
  return fallback;
}
