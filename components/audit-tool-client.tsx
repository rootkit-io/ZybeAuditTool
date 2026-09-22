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
  X,
  Zap
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AuditPreview, AuditReport } from "@/lib/audits/types";

type StartResponse = { auditRequestId: string; preview: AuditPreview };
type SubmitResponse = { reportUrl: string; report: AuditReport };
type CrawlStatusData = {
  status: string; hasDeepCrawlData: boolean; totalPagesCrawled: number;
  technologiesFound: number; crawlDurationMs: number;
};

const CATEGORIES = [
  "Design & branding", "Messaging", "SEO basics", "Mobile readiness",
  "Conversion readiness", "Trust signals", "AI/chatbot opportunity",
  "Lead generation readiness", "Technical hygiene", "Performance & speed"
];

const CRAWL_STEPS = [
  { label: "Fetching homepage HTML" }, { label: "Analyzing page structure" },
  { label: "Crawling subpages" }, { label: "Measuring performance" },
  { label: "Detecting technologies" }, { label: "Deep crawl complete" }
];

function scoreInfo(score: number) {
  if (score >= 80) return { color: "text-emerald-600", bg: "bg-emerald-50", ring: "ring-emerald-200/50", label: "Good" };
  if (score >= 60) return { color: "text-amber-600", bg: "bg-amber-50", ring: "ring-amber-200/50", label: "Fair" };
  return { color: "text-red-600", bg: "bg-red-50", ring: "ring-red-200/50", label: "Needs work" };
}

export function AuditToolClient() {
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [preview, setPreview] = useState<StartResponse | null>(null);
  const [report, setReport] = useState<SubmitResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [crawl, setCrawl] = useState<CrawlStatusData | null>(null);
  const [crawlStep, setCrawlStep] = useState(0);
  const [visible, setVisible] = useState(0);
  const resultsRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  async function startAudit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setReport(null); setPreview(null); setCrawl(null);
    setCrawlStep(0); setVisible(0);
    setLoading(true);
    try {
      const res = await fetch("/api/audits/start", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteUrl: url })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create preview.");
      setPreview(data);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 200);
      startCrawl(data.auditRequestId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create preview.");
    } finally { setLoading(false); }
  }

  function startCrawl(id: string) {
    let step = 0;
    const si = setInterval(() => { step++; if (step < CRAWL_STEPS.length) setCrawlStep(step); }, 2500);
    const pi = setInterval(async () => {
      try {
        const res = await fetch(`/api/audits/crawl/status/${id}`);
        if (!res.ok) return;
        const d: CrawlStatusData = await res.json();
        setCrawl(d);
        if (d.status === "complete" || d.status === "failed") {
          clearInterval(pi); clearInterval(si);
          setCrawlStep(d.status === "complete" ? CRAWL_STEPS.length - 1 : CRAWL_STEPS.length - 2);
        }
        if (d.totalPagesCrawled > 0) setCrawlStep(s => Math.max(s, 3));
        if (d.technologiesFound > 0) setCrawlStep(s => Math.max(s, 4));
      } catch {}
    }, 2000);
  }

  useEffect(() => {
    if (!preview) return;
    const total = preview.preview.topIssues.length;
    if (!total) return;
    setVisible(0);
    let i = 0;
    const t = setInterval(() => { i++; setVisible(i); if (i >= total) clearInterval(t); }, 300);
    return () => clearInterval(t);
  }, [preview]);

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!preview) return;
    setError(null); setSubmitting(true);
    try {
      const res = await fetch("/api/audits/submit-email", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auditRequestId: preview.auditRequestId, email, name, company, phone,
          consentToContact: consent
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not unlock report.");
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not unlock report.");
    } finally { setSubmitting(false); }
  }

  const sc = preview ? scoreInfo(preview.preview.overallScore) : null;
  const sortedCats = preview
    ? Object.entries(preview.preview.categories).sort(([, a], [, b]) => b - a)
    : [];

  return (
    <div className="min-h-screen bg-subtle">
      {/* ─── Top Navigation ─────────────────────────────────────── */}
      <header className="border-b bg-card/70 backdrop-blur-md sticky top-0 z-20">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 text-sm">
          <div className="flex items-center gap-2 font-semibold">
            <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <span>Zybe<span className="text-muted-foreground font-normal">Audit</span></span>
          </div>
          <div className="flex items-center gap-4 text-muted-foreground">
            <span className="hidden sm:block">Free website audit tool</span>
          </div>
        </div>
      </header>

      {/* ─── Hero ────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
              <Sparkles className="h-3 w-3 text-primary" />
              Free · No spam · Results in ~30 seconds
            </div>
            <h1 className="text-4xl font-medium tracking-tight md:text-5xl lg:text-6xl leading-[1.05]">
              See what your website is really doing for you.
            </h1>
            <p className="mt-5 text-base leading-8 text-muted-foreground md:text-lg">
              A free, no-nonsense audit of your site&apos;s health, SEO, and business signals.
            </p>
          </div>

          {/* URL Input */}
          <div className="mx-auto mt-10 max-w-xl">
            <form onSubmit={startAudit} className="relative">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Globe className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                  <input
                    value={url} onChange={e => setUrl(e.target.value)}
                    placeholder="https://example.com"
                    type="url" required
                    className="h-12 w-full rounded-lg border bg-card pl-10 pr-3 text-sm shadow-sm transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40 hover:shadow-md placeholder:text-muted-foreground/50"
                  />
                </div>
                <button
                  type="submit" disabled={loading}
                  className="h-12 shrink-0 rounded-lg bg-primary px-5 text-sm font-medium text-white transition-all hover:bg-primary/90 active:scale-[0.97] disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scan className="h-4 w-4" />}
                  {loading ? "Scanning" : "Start my audit"}
                </button>
              </div>
            </form>
            <div className="mt-3 flex flex-wrap justify-center gap-x-6 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-primary" /> We only read your homepage</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-primary" /> No login required</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-primary" /> Nothing stored without consent</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Results ─────────────────────────────────────────────── */}
      <section ref={resultsRef} className="mx-auto max-w-6xl px-4 py-10">
        {error && (
          <div className="mb-6 animate-fade-up rounded-lg border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
            <X className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {!preview ? (
          <div className="animate-fade-up rounded-xl border bg-card p-12 text-center">
            <div className="mx-auto max-w-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Search className="h-5 w-5 text-muted-foreground/50" />
              </div>
              <h2 className="mt-4 text-lg font-semibold">Enter a URL to begin</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                We&apos;ll scan your homepage for 40+ signals and show you results instantly.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
            {/* ─── Left Column ──────────────────────────────────── */}
            <div className="space-y-4">
              {/* Score Card */}
              <div className={`animate-scale-in rounded-xl border bg-card p-5 ${sc!.ring} ring-1`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-semibold">Audit results</h2>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-600 ring-1 ring-emerald-200/50">
                        Live
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground truncate">{preview.preview.normalizedDomain}</p>
                  </div>
                  <div className={`shrink-0 flex flex-col items-center rounded-lg ${sc!.bg} px-3.5 py-2 ${sc!.ring} ring-1`}>
                    <div className={`text-2xl font-bold ${sc!.color}`}>{preview.preview.overallScore}</div>
                    <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{sc!.label}</div>
                  </div>
                </div>
                <div className="mt-3 h-1.5 rounded-full bg-muted/50">
                  <div className="score-progress h-full rounded-full bg-primary" style={{ width: `${preview.preview.overallScore}%` }} />
                </div>
              </div>

              {/* Issues */}
              <div className="animate-fade-up rounded-xl border bg-card p-5">
                <h2 className="text-base font-semibold">
                  Issues
                  {preview.preview.topIssues.length > 0 && (
                    <span className="ml-1.5 text-sm font-normal text-muted-foreground">({Math.min(visible, preview.preview.topIssues.length)}/{preview.preview.topIssues.length})</span>
                  )}
                </h2>
                <div className="mt-3 space-y-2">
                  {preview.preview.topIssues.slice(0, visible).map((issue, i) => (
                    <div key={`${issue.category}-${i}`} className="animate-slide-left rounded-lg border bg-card p-3.5 hover-card" style={{ animationDelay: `${i * 0.06}s` }}>
                      <div className="flex items-start gap-2.5">
                        <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${issue.observed ? "bg-emerald-100" : "bg-amber-100"}`}>
                          {issue.observed
                            ? <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />
                            : <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium">{issue.title}</p>
                            <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                              issue.observed ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                            }`}>{issue.observed ? "Confirmed" : "Possible"}</span>
                          </div>
                          <p className="mt-1 text-sm leading-6 text-muted-foreground">{issue.detail}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {visible < preview.preview.topIssues.length && (
                    <div className="flex items-center justify-center gap-1.5 py-3 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" /> Analysing...
                    </div>
                  )}
                </div>
              </div>

              {/* Categories */}
              <div className="animate-fade-up rounded-xl border bg-card p-5">
                <h2 className="text-base font-semibold">Breakdown</h2>
                <div className="mt-3 space-y-2.5">
                  {sortedCats.map(([cat, score], i) => {
                    const s = scoreInfo(score);
                    return (
                      <div key={cat} className="animate-slide-left" style={{ animationDelay: `${i * 0.03}s` }}>
                        <div className="flex items-center justify-between text-sm mb-0.5">
                          <span className="text-muted-foreground">{cat}</span>
                          <span className={`text-xs font-semibold ${s.color}`}>{score}</span>
                        </div>
                        <div className="h-1 rounded-full bg-muted/50">
                          <div className="score-progress h-full rounded-full bg-primary/60" style={{ width: `${score}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Crawl Progress */}
              {crawl?.status === "crawling" && (
                <div className="animate-fade-up rounded-xl border bg-gradient-to-r from-blue-50/50 to-white p-5">
                  <div className="flex items-center gap-2.5 mb-3">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <div>
                      <p className="text-sm font-medium">Deep crawl in progress</p>
                      <p className="text-xs text-muted-foreground">
                        {crawl.technologiesFound > 0
                          ? `${crawl.technologiesFound} technologies · ${crawl.totalPagesCrawled} pages`
                          : `${crawl.totalPagesCrawled} pages scanned`}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {CRAWL_STEPS.map((s, i) => {
                      const done = i < crawlStep;
                      const curr = i === crawlStep;
                      return (
                        <div key={s.label} className={`flex items-center gap-2 text-xs ${done ? "text-emerald-600" : curr ? "text-primary font-medium" : "text-muted-foreground/50"}`}>
                          <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${done ? "bg-emerald-100" : curr ? "bg-primary/10" : "bg-muted"}`}>
                            {done ? <CheckCircle2 className="h-2.5 w-2.5" /> : curr ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <div className="h-1.5 w-1.5 rounded-full bg-current" />}
                          </div>
                          {s.label}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {crawl?.status === "complete" && !report && (
                <div className="animate-fade-up rounded-xl border bg-gradient-to-r from-emerald-50/50 to-white p-4 flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <p className="text-sm text-emerald-800">Deep crawl complete — {crawl.technologiesFound} technologies on {crawl.totalPagesCrawled} pages</p>
                </div>
              )}
            </div>

            {/* ─── Right Column ─────────────────────────────────── */}
            <div className="lg:sticky lg:top-20 lg:self-start">
              <div className="animate-scale-in rounded-xl border bg-card p-5">
                {report ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      <div>
                        <p className="text-sm font-semibold">Report unlocked</p>
                        <p className="text-xs text-muted-foreground">{report.report.normalizedDomain}</p>
                      </div>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                      Score: <strong className="text-foreground">{report.report.overallScore}</strong>
                      {crawl?.totalPagesCrawled && <span className="ml-3">Pages: <strong className="text-foreground">{crawl.totalPagesCrawled}</strong></span>}
                    </div>
                    <a href={report.reportUrl} className="flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-primary text-sm font-medium text-white transition-all hover:bg-primary/90 active:scale-[0.97]">
                      View full report <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                  </div>
                ) : (
                  <form onSubmit={submitEmail} className="space-y-3.5">
                    <div className="flex items-center gap-2">
                      <LockKeyhole className="h-4 w-4 text-primary" />
                      <h3 className="text-sm font-semibold">Save your full report</h3>
                    </div>
                    <div className="space-y-2.5">
                      <div>
                        <input ref={emailRef} type="email" required placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)}
                          className="h-9 w-full rounded-lg border bg-card/80 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 placeholder:text-muted-foreground/50" />
                      </div>
                      <div className="flex gap-2">
                        <input type="text" placeholder="Name" value={name} onChange={e => setName(e.target.value)}
                          className="h-9 w-full rounded-lg border bg-card/80 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 placeholder:text-muted-foreground/50" />
                        <input type="text" placeholder="Company" value={company} onChange={e => setCompany(e.target.value)}
                          className="h-9 w-full rounded-lg border bg-card/80 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 placeholder:text-muted-foreground/50" />
                      </div>
                    </div>
                    <label className="flex items-start gap-2 text-xs leading-5 text-muted-foreground cursor-pointer">
                      <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} required className="mt-0.5 h-3.5 w-3.5 rounded border-gray-300" />
                      I agree Zybe Social can save my report and contact me.
                    </label>
                    <button type="submit" disabled={submitting}
                      className="h-9 w-full rounded-lg bg-primary text-sm font-medium text-white transition-all hover:bg-primary/90 active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-1.5">
                      {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LockKeyhole className="h-3.5 w-3.5" />}
                      {submitting ? "Saving..." : "Unlock report"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ─── Footer ─────────────────────────────────────────────── */}
      <footer className="border-t bg-card/50">
        <div className="mx-auto max-w-6xl px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Zybe Social</p>
          <div className="flex items-center gap-4">
            <a href="tel:+34657213337" className="hover:text-foreground transition-colors">+34 657 21 33 37</a>
            <a href="tel:+919258732032" className="hover:text-foreground transition-colors">+91 92587 32032</a>
          </div>
          <p>No fake scores. No spam.</p>
        </div>
      </footer>
    </div>
  );
}
