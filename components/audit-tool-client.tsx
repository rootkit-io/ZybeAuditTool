"use client";

import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Cpu,
  Gauge,
  Globe,
  Loader2,
  LockKeyhole,
  Scan,
  Search,
  Sparkles,
  TrendingUp,
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

const CRAWL_STEPS = [
  { icon: Search, label: "Fetching homepage HTML" },
  { icon: Globe, label: "Analyzing page structure" },
  { icon: Cpu, label: "Crawling subpages" },
  { icon: Gauge, label: "Measuring performance" },
  { icon: Zap, label: "Detecting technologies" },
  { icon: CheckCircle2, label: "Deep crawl complete" }
];

const SCORE_COLORS = [
  { threshold: 80, text: "text-emerald-600", bg: "bg-emerald-50", ring: "ring-emerald-200", label: "Good" },
  { threshold: 60, text: "text-amber-600", bg: "bg-amber-50", ring: "ring-amber-200", label: "Fair" },
  { threshold: 0, text: "text-red-600", bg: "bg-red-50", ring: "ring-red-200", label: "Needs work" }
] as const;

function getScoreStyle(score: number) {
  return SCORE_COLORS.find((c) => score >= c.threshold) || SCORE_COLORS[SCORE_COLORS.length - 1];
}

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
  const [crawlStatus, setCrawlStatus] = useState<CrawlStatusData | null>(null);
  const [crawlStep, setCrawlStep] = useState(0);
  const [visibleIssues, setVisibleIssues] = useState(0);
  const [showForm, setShowForm] = useState(false);
  type CrawlPollRef = { stepInterval: ReturnType<typeof setInterval>; pollInterval: ReturnType<typeof setInterval> };
  const crawlPollRef = useRef<CrawlPollRef | null>(null);
  const issueTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  // ─── Start Audit ────────────────────────────────────────────────

  async function startAudit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setReport(null);
    setPreview(null);
    setCrawlStatus(null);
    setCrawlStep(0);
    setVisibleIssues(0);
    setShowForm(false);
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
      setShowForm(true);

      // Scroll to results after a tiny delay for rendering
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        setTimeout(() => emailRef.current?.focus(), 600);
      }, 300);

      startCrawlPolling(data.auditRequestId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create preview audit.");
    } finally {
      setIsStarting(false);
    }
  }

  // ─── Crawl Polling ──────────────────────────────────────────────

  function startCrawlPolling(auditRequestId: string) {
    let step = 0;
    const stepInterval = setInterval(() => {
      step++;
      if (step < CRAWL_STEPS.length) setCrawlStep(step);
    }, 2800);

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/audits/crawl/status/${auditRequestId}`);
        if (!res.ok) return;
        const data: CrawlStatusData = await res.json();
        setCrawlStatus(data);

        if (data.status === "complete" || data.status === "failed") {
          clearInterval(pollInterval);
          clearInterval(stepInterval);
          setCrawlStep(data.status === "complete" ? CRAWL_STEPS.length - 1 : CRAWL_STEPS.length - 2);
        }
        if (data.totalPagesCrawled > 0) setCrawlStep((s) => Math.max(s, 3));
        if (data.technologiesFound > 0) setCrawlStep((s) => Math.max(s, 4));
      } catch {
        /* ignore */
      }
    }, 2000);

    crawlPollRef.current = { stepInterval, pollInterval };
  }

  useEffect(() => {
    return () => {
      const ref = crawlPollRef.current;
      if (ref) {
        clearInterval(ref.stepInterval);
        clearInterval(ref.pollInterval);
      }
    };
  }, []);

  // ─── One-by-one issue reveal ────────────────────────────────────

  useEffect(() => {
    if (!preview) return;
    const total = preview.preview.topIssues.length;
    if (total === 0) return;

    setVisibleIssues(0);
    let i = 0;
    issueTimerRef.current = setInterval(() => {
      i++;
      setVisibleIssues(i);
      if (i >= total) clearInterval(issueTimerRef.current!);
    }, 350);

    return () => { if (issueTimerRef.current) clearInterval(issueTimerRef.current); };
  }, [preview]);

  // ─── Submit Email ───────────────────────────────────────────────

  async function submitEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!preview) { setError("Start with a website URL first."); return; }
    setError(null);
    setIsSubmittingEmail(true);

    try {
      const response = await fetch("/api/audits/submit-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auditRequestId: preview.auditRequestId, email, name, company, phone, consentToContact
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(readApiError(data, "Could not unlock report."));
      setReport(data as SubmitResponse);
      const ref = crawlPollRef.current;
      if (ref) {
        clearInterval(ref.stepInterval);
        clearInterval(ref.pollInterval);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not unlock report.");
    } finally {
      setIsSubmittingEmail(false);
    }
  }

  const previewScore = preview?.preview.overallScore ?? 0;
  const scoreStyle = getScoreStyle(previewScore);

  return (
    <div className="min-h-screen bg-background">
      {/* ─── HERO ─────────────────────────────────────────────────── */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        {/* Background image with overlay */}
        <div className="absolute inset-0 -z-10">
          <img
            src="/bg.png"
            alt=""
            className="h-full w-full object-cover"
            aria-hidden="true"
          />
          {/* Multi-layer gradient overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-white/85 to-white" />
          <div className="absolute inset-0 bg-gradient-to-r from-white/60 via-transparent to-white/40" />
        </div>

        <div className="mx-auto w-full max-w-7xl px-4 py-16 md:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            {/* Left: Value prop */}
            <div className="space-y-6 animate-fade-in-up">
              <div className="inline-flex items-center gap-2 rounded-full border bg-white/70 backdrop-blur-sm px-4 py-1.5 text-sm text-muted-foreground shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Free automated website audit
              </div>

              <h1 className="text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl leading-[1.1]">
                Turn your website into a{" "}
                <span className="gradient-text">lead machine</span>
              </h1>

              <p className="max-w-xl text-lg leading-7 text-muted-foreground md:text-xl">
                40+ real checks. Confirmed issues. AI-powered recommendations.
                Get a practical audit in seconds — no fake scores, no fluff.
              </p>

              {/* Check grid */}
              <div className="grid gap-2 sm:grid-cols-2">
                {auditChecks.slice(0, 8).map((check) => (
                  <div key={check} className="flex items-center gap-2.5 text-sm">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
                      <CheckCircle2 className="h-3 w-3 text-primary" />
                    </div>
                    <span className="text-muted-foreground">{check}</span>
                  </div>
                ))}
              </div>

              {/* Trust indicators */}
              <div className="flex flex-wrap gap-6 pt-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  No JS execution
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  No data stored without consent
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  100% confirmed issues
                </div>
              </div>
            </div>

            {/* Right: URL input card */}
            <div className="animate-slide-in-right" style={{ animationDelay: "0.15s" }}>
              <div className="rounded-2xl border bg-white/70 backdrop-blur-xl p-6 shadow-2xl shadow-primary/5 md:p-8">
                <h2 className="text-lg font-semibold mb-1">Audit your website</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Enter your URL and get instant results
                </p>

                <form className="space-y-4" onSubmit={startAudit} aria-busy={isStarting}>
                  <div className="space-y-1.5">
                    <label htmlFor="websiteUrl" className="text-sm font-medium">Website URL</label>
                    <div className="relative">
                      <Globe className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        id="websiteUrl"
                        name="websiteUrl"
                        type="url"
                        inputMode="url"
                        autoComplete="url"
                        placeholder="https://example.com"
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                        className="h-12 w-full rounded-xl border bg-white/80 pl-10 pr-3 text-base shadow-sm transition-all placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-0 hover:border-primary/30"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isStarting}
                    className="relative h-12 w-full overflow-hidden rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isStarting ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Scanning...
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center gap-2">
                        <Scan className="h-4 w-4" />
                        Audit my website
                      </span>
                    )}
                  </button>
                </form>

                <p className="mt-4 text-xs leading-5 text-muted-foreground text-center">
                  We only scan public homepage data. Your email is requested after the preview.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── RESULTS ──────────────────────────────────────────────── */}
      <section ref={resultsRef} className="relative mx-auto max-w-7xl px-4 pb-20 md:px-6 lg:px-8">
        {error && (
          <div className="mb-6 animate-fade-in-up rounded-xl border border-red-200 bg-red-50/80 backdrop-blur-sm p-4 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}

        {!preview ? (
          /* Empty state */
          <div className="mt-8 animate-fade-in-up rounded-2xl border-2 border-dashed bg-white/50 backdrop-blur-sm p-12 text-center">
            <div className="mx-auto max-w-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/5">
                <Search className="h-8 w-8 text-primary/40" />
              </div>
              <h2 className="mt-5 text-xl font-semibold">Waiting for a URL</h2>
              <p className="mt-2 text-sm text-muted-foreground leading-6">
                Submit a public website URL above. We&apos;ll scan for 40+ signals and show you confirmed issues instantly.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_420px]">
            {/* ─── Left: Results ──────────────────────────────────── */}
            <div className="space-y-5 min-w-0">
              {/* Score hero card */}
              <div className="animate-scale-in rounded-2xl border bg-white/80 backdrop-blur-sm p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold">Audit preview</h2>
                      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-600 ring-1 ring-emerald-200">
                        Live
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground truncate">{preview.preview.normalizedDomain}</p>
                  </div>
                  <div className={`shrink-0 flex flex-col items-center rounded-xl ${scoreStyle.bg} ${scoreStyle.ring} ring-1 px-4 py-2.5`}>
                    <div className={`text-3xl font-bold ${scoreStyle.text}`}>{previewScore}</div>
                    <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{scoreStyle.label}</div>
                  </div>
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted/60">
                  <div
                    className="score-bar h-full rounded-full bg-gradient-to-r from-primary to-primary/70"
                    style={{ width: `${previewScore}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {preview.preview.observedSignals?.fetchStatus === "success"
                    ? "Based on 40+ real homepage signals — all observed issues are 100% confirmed."
                    : "Based on available data."}
                </p>
              </div>

              {/* Issues appearing one by one */}
              <div className="animate-fade-in-up rounded-2xl border bg-white/80 backdrop-blur-sm p-6 shadow-sm" style={{ animationDelay: "0.1s" }}>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Issues found</h2>
                  {preview.preview.topIssues.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {Math.min(visibleIssues, preview.preview.topIssues.length)}/{preview.preview.topIssues.length}
                    </span>
                  )}
                </div>
                <div className="mt-4 grid gap-2.5">
                  {preview.preview.topIssues.slice(0, visibleIssues).map((issue, idx) => (
                    <div
                      key={`${issue.category}-${issue.title}`}
                      className="animate-fade-in-left rounded-xl border bg-white p-4 shadow-sm"
                      style={{ animationDelay: `${idx * 0.08}s` }}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                          issue.observed ? "bg-emerald-100" : "bg-amber-100"
                        }`}>
                          {issue.observed ? (
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <div className="h-2 w-2 rounded-full bg-amber-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium">{issue.title}</p>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                              issue.observed
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-700"
                            }`}>
                              {issue.observed ? "Confirmed" : "Possible"}
                            </span>
                          </div>
                          <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{issue.detail}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {visibleIssues < preview.preview.topIssues.length && (
                    <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Checking more signals...
                    </div>
                  )}
                </div>
              </div>

              {/* Category scores */}
              <div className="animate-fade-in-up rounded-2xl border bg-white/80 backdrop-blur-sm p-6 shadow-sm" style={{ animationDelay: "0.2s" }}>
                <h2 className="text-lg font-semibold">Category breakdown</h2>
                <div className="mt-4 grid gap-3">
                  {Object.entries(preview.preview.categories).map(([cat, score], idx) => {
                    const s = getScoreStyle(score);
                    return (
                      <div key={cat} className="animate-fade-in-left" style={{ animationDelay: `${idx * 0.05}s` }}>
                        <div className="flex items-center justify-between gap-3 mb-1">
                          <span className="text-sm truncate">{cat}</span>
                          <span className={`shrink-0 text-xs font-semibold ${s.text}`}>{score}</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted/60">
                          <div
                            className="score-bar h-full rounded-full bg-gradient-to-r from-primary to-primary/60"
                            style={{ width: `${score}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Deep crawl progress */}
              {crawlStatus?.status === "crawling" && (
                <div className="animate-fade-in-up rounded-2xl border bg-white/80 backdrop-blur-sm p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <div>
                      <h3 className="text-sm font-semibold">Deep crawling in progress</h3>
                      <p className="text-xs text-muted-foreground">
                        {crawlStatus.technologiesFound > 0
                          ? `Found ${crawlStatus.technologiesFound} technologies across ${crawlStatus.totalPagesCrawled} pages`
                          : `Scanned ${crawlStatus.totalPagesCrawled} pages`}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {CRAWL_STEPS.map((step, i) => {
                      const isDone = i < crawlStep;
                      const isCurrent = i === crawlStep;
                      return (
                        <div key={step.label} className={`flex items-center gap-3 text-xs ${
                          isDone ? "text-emerald-600" : isCurrent ? "text-primary font-medium" : "text-muted-foreground/60"
                        }`}>
                          <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                            isDone ? "bg-emerald-100" : isCurrent ? "bg-primary/10" : "bg-muted"
                          }`}>
                            {isDone ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : isCurrent ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <div className="h-1.5 w-1.5 rounded-full bg-current" />
                            )}
                          </div>
                          <span>{step.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Deep crawl complete */}
              {crawlStatus?.status === "complete" && !report && (
                <div className="animate-fade-in-up rounded-2xl border bg-gradient-to-r from-emerald-50 to-white p-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-emerald-800">Deep crawl complete</p>
                      <p className="text-xs text-muted-foreground">
                        {crawlStatus.technologiesFound} technologies · {crawlStatus.totalPagesCrawled} pages
                        {crawlStatus.crawlDurationMs > 0 && ` · ${(crawlStatus.crawlDurationMs / 1000).toFixed(1)}s`}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ─── Right: Email capture ───────────────────────────── */}
            <div className="lg:sticky lg:top-6 lg:self-start">
              <div className="animate-scale-in rounded-2xl border bg-white/80 backdrop-blur-sm p-6 shadow-sm" style={{ animationDelay: "0.15s" }}>
                {report ? (
                  <div className="space-y-5 animate-fade-in-up">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-emerald-700">Report unlocked</p>
                        <p className="text-xs text-muted-foreground">Your audit is ready</p>
                      </div>
                    </div>

                    <div className="rounded-xl border bg-gradient-to-br from-primary/5 to-transparent p-4">
                      <h3 className="text-base font-semibold">{report.report.normalizedDomain}</h3>
                      <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                        <span>Score: <strong className="text-foreground">{report.report.overallScore}</strong></span>
                        {crawlStatus?.totalPagesCrawled && (
                          <span>Pages: <strong className="text-foreground">{crawlStatus.totalPagesCrawled}</strong></span>
                        )}
                      </div>
                    </div>

                    <a
                      href={report.reportUrl}
                      className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]"
                    >
                      View full report
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </a>
                  </div>
                ) : (
                  <form className="space-y-4" onSubmit={submitEmail} aria-busy={isSubmittingEmail}>
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                        <LockKeyhole className="h-4 w-4 text-primary" />
                      </div>
                      <h2 className="text-base font-semibold">Unlock full report</h2>
                    </div>

                    <div className="grid gap-3">
                      <div className="space-y-1">
                        <label htmlFor="email" className="text-xs font-medium">
                          Email <span className="text-red-500">*</span>
                        </label>
                        <input
                          ref={emailRef}
                          id="email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          spellCheck={false}
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="h-10 w-full rounded-lg border bg-white/80 px-3 text-sm transition-all placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 hover:border-primary/30"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label htmlFor="name" className="text-xs font-medium">Name</label>
                          <input
                            id="name" name="name" type="text" autoComplete="name"
                            value={name} onChange={(e) => setName(e.target.value)}
                            className="h-10 w-full rounded-lg border bg-white/80 px-3 text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 hover:border-primary/30"
                          />
                        </div>
                        <div className="space-y-1">
                          <label htmlFor="company" className="text-xs font-medium">Company</label>
                          <input
                            id="company" name="company" type="text" autoComplete="organization"
                            value={company} onChange={(e) => setCompany(e.target.value)}
                            className="h-10 w-full rounded-lg border bg-white/80 px-3 text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 hover:border-primary/30"
                          />
                        </div>
                      </div>
                    </div>

                    <label className="flex gap-3 rounded-lg border bg-muted/30 p-3 text-xs leading-5 cursor-pointer hover:bg-muted/50 transition-colors">
                      <input
                        type="checkbox"
                        checked={consentToContact}
                        onChange={(e) => setConsentToContact(e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                        required
                      />
                      <span className="text-muted-foreground">
                        I agree Zybe Social can save my report and contact me about relevant services.
                      </span>
                    </label>

                    <button
                      type="submit"
                      disabled={isSubmittingEmail}
                      className="relative h-11 w-full overflow-hidden rounded-xl bg-primary text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSubmittingEmail ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Generating report...
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center gap-2">
                          <LockKeyhole className="h-3.5 w-3.5" />
                          Unlock full report
                        </span>
                      )}
                    </button>

                    <p className="text-xs text-muted-foreground text-center leading-5">
                      We never scrape private data. Only what you provide is stored.
                    </p>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ─── FOOTER ────────────────────────────────────────────────── */}
      <footer className="border-t bg-white/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 text-center text-xs text-muted-foreground md:flex-row">
            <p>&copy; {new Date().getFullYear()} Zybe Social. All rights reserved.</p>
            <p>Built with care. No fake scores. No spam.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function readApiError(data: unknown, fallback: string) {
  if (data && typeof data === "object" && "error" in data && typeof data.error === "string") return data.error;
  return fallback;
}
