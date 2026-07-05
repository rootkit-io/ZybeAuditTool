"use client";

import { ArrowRight, CheckCircle2, Loader2, LockKeyhole, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import type { AuditPreview, AuditReport } from "@/lib/audits/types";

type StartResponse = {
  auditRequestId: string;
  preview: AuditPreview;
};

type SubmitResponse = {
  reportUrl: string;
  report: AuditReport;
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
  "Technical hygiene"
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

  const weakestCategory = useMemo(() => {
    if (!preview) {
      return null;
    }

    return Object.entries(preview.preview.categories).sort(([, a], [, b]) => a - b)[0];
  }, [preview]);

  async function startAudit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setReport(null);
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
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create preview audit.");
    } finally {
      setIsStarting(false);
    }
  }

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
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not unlock report.");
    } finally {
      setIsSubmittingEmail(false);
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <section className="border-b bg-muted/40">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 md:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-14">
          <div className="flex flex-col justify-center gap-6">
            <div className="inline-flex w-fit items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
              Zybe Social website audit
            </div>
            <div className="max-w-3xl space-y-4">
              <h1 className="text-3xl font-semibold tracking-normal text-foreground md:text-5xl">
                Get a free website audit
              </h1>
              <p className="max-w-prose text-base leading-7 text-muted-foreground md:text-lg">
                See practical improvements for your website, lead capture, messaging, design, and automation potential. No fake urgency. No scare-based score.
              </p>
            </div>
            <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
              {auditChecks.map((check) => (
                <div key={check} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <span>{check}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm md:p-6">
            <form className="space-y-4" onSubmit={startAudit} aria-busy={isStarting}>
              <div className="space-y-2">
                <label htmlFor="websiteUrl" className="text-sm font-medium">
                  Website URL
                </label>
                <input
                  id="websiteUrl"
                  name="websiteUrl"
                  type="url"
                  inputMode="url"
                  autoComplete="url"
                  placeholder="https://example.com"
                  value={websiteUrl}
                  onChange={(event) => setWebsiteUrl(event.target.value)}
                  className="min-h-11 w-full rounded-md border bg-background px-3 py-2 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  required
                />
                <p className="text-xs leading-5 text-muted-foreground">
                  We only use the URL you submit for this Phase 1 audit preview.
                </p>
              </div>
              <button
                type="submit"
                disabled={isStarting}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isStarting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                {isStarting ? "Creating preview" : "Start free audit"}
              </button>
            </form>

            <div className="mt-6 rounded-md border bg-muted/50 p-4 text-sm leading-6 text-muted-foreground">
              Email is only requested after your preview so Zybe Social can save your report and follow up if you consent.
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 md:px-6 lg:px-8">
        {error ? (
          <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
            {error}
          </div>
        ) : null}

        {!preview ? (
          <div className="rounded-lg border border-dashed bg-card p-6 text-card-foreground">
            <h2 className="text-xl font-semibold">Your preview will appear here</h2>
            <p className="mt-2 max-w-prose text-sm leading-6 text-muted-foreground">
              Submit a public website URL to see the first-pass score, likely issue areas, and what the full report will cover.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-lg border bg-card p-5 text-card-foreground">
              <div className="flex items-baseline justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">Preview audit</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{preview.preview.normalizedDomain}</p>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-semibold">{preview.preview.overallScore}</div>
                  <div className="text-xs text-muted-foreground">overall</div>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {preview.preview.topIssues.map((issue) => (
                  <div key={`${issue.category}-${issue.title}`} className="rounded-md border bg-background p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">{issue.title}</p>
                      <span className="rounded-sm bg-secondary px-2 py-1 text-xs text-secondary-foreground">
                        {issue.observed ? "observed" : "possible"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{issue.detail}</p>
                  </div>
                ))}
              </div>

              {weakestCategory ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  Weakest placeholder category: <span className="font-medium text-foreground">{weakestCategory[0]}</span>
                </p>
              ) : null}
            </div>

            <div className="rounded-lg border bg-card p-5 text-card-foreground">
              {report ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-primary">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    Full report unlocked
                  </div>
                  <h2 className="text-2xl font-semibold">Report saved for {report.report.normalizedDomain}</h2>
                  <p className="text-sm leading-6 text-muted-foreground">
                    You can view the saved report page now and share it with your team.
                  </p>
                  <a
                    href={report.reportUrl}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    Open report
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </a>
                </div>
              ) : (
                <form className="space-y-4" onSubmit={submitEmail} aria-busy={isSubmittingEmail}>
                  <div className="flex items-center gap-2">
                    <LockKeyhole className="h-5 w-5 text-primary" aria-hidden="true" />
                    <h2 className="text-xl font-semibold">Unlock and save full report</h2>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <label htmlFor="email" className="text-sm font-medium">
                        Email (required)
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
                    <div className="space-y-2">
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
                    <div className="space-y-2">
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
                    <div className="space-y-2 sm:col-span-2">
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

                  <label className="flex gap-3 rounded-md border bg-muted/50 p-3 text-sm leading-6">
                    <input
                      type="checkbox"
                      checked={consentToContact}
                      onChange={(event) => setConsentToContact(event.target.checked)}
                      className="mt-1 h-4 w-4 rounded border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      required
                    />
                    <span>
                      I agree Zybe Social can save my report and contact me about relevant website, automation, design, video, lead generation, outreach, or consulting services.
                    </span>
                  </label>

                  <p className="text-xs leading-5 text-muted-foreground">
                    Privacy note: we do not scrape private data. We store your submitted URL, report, email, optional contact fields, consent, and basic abuse-protection metadata.
                  </p>

                  <button
                    type="submit"
                    disabled={isSubmittingEmail}
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmittingEmail ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                    {isSubmittingEmail ? "Saving report" : "Unlock full report"}
                  </button>
                </form>
              )}
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
