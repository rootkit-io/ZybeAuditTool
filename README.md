# Zybe Social Website Audit Tool

Phase 1 MVP for a free, ethical website audit lead magnet.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env` from `.env.example`.

   Set:

   - `DATABASE_URL`: pooled PostgreSQL URL used by the app
   - `DIRECT_URL`: direct PostgreSQL URL used by Prisma migrations
   - `IP_HASH_SALT`: at least 24 random characters, used to hash IPs for abuse protection

3. Apply the Prisma schema:

   ```bash
   npm run prisma:migrate
   ```

4. Start the app:

   ```bash
   npm run dev
   ```

## Phase 1 Scope

- Landing page with URL input
- Preview audit before email capture
- Email/consent capture to unlock and save report
- PostgreSQL schema through Prisma
- Supabase client access blocked through RLS and table privilege revokes
- Deterministic placeholder audit logic
- Rate-limited server API routes
- Validation and helper/API tests

## Phase 2 Observed Homepage Checks

The audit safely fetches homepage HTML only. It does not execute JavaScript, crawl multiple pages, or fetch images, scripts, stylesheets, or other assets.

Observed signals include:

- HTTP/HTTPS reachability, status code, final URL after redirects
- Page title, meta description, H1, and heading counts
- Internal/external link counts
- Contact link, CTA keyword, form, and social link detection
- robots.txt and sitemap.xml availability checks using `HEAD`
- Homepage HTML size cap

If fetching fails or safety checks reject the target, the API still creates a fallback report from deterministic URL/domain heuristics. Non-observed recommendations are labeled as possible opportunities.

## Phase 3 AI-Assisted Reports

AI report generation is server-only and optional. If `AI_REPORT_PROVIDER` is not enabled, or if the provider fails, the app stores a deterministic written fallback report.

To enable OpenAI-backed report writing:

```bash
AI_REPORT_PROVIDER="openai"
OPENAI_API_KEY="..."
OPENAI_MODEL="..."
OPENAI_BASE_URL="https://api.openai.com"
```

The AI prompt includes only:

- Submitted URL/domain with query strings removed
- Structured observed homepage signals
- Category scores
- Detected observed issues
- Possible opportunities and existing recommendations

Raw HTML is never sent to the AI.

## Phase 4 Email Delivery

Email delivery is server-only through Resend. If email sending fails, the report flow still succeeds and the delivery failure is recorded in `email_events`.

To enable report emails and internal lead notifications:

```bash
RESEND_API_KEY="..."
FROM_EMAIL="Zybe Social <audit@yourdomain.com>"
INTERNAL_LEAD_NOTIFY_EMAIL="hello@zybesocial.com"
APP_BASE_URL="https://your-app.example.com"
```

The user email includes the audited website, overall score, top issues or quick wins, report link, and consent/contact preference note.

The internal notification includes submitted lead contact fields, website/domain, score, report link, top issues, and consent status. Raw homepage HTML is never included.

## Phase 5 Launch Readiness

Production-only checklist:

1. Supabase
   - Set `DATABASE_URL` to pooled Supabase Postgres URL.
   - Set `DIRECT_URL` to direct Supabase Postgres URL.
   - Run `npx prisma migrate deploy`.
   - Confirm `npx prisma migrate status` says database schema is up to date.
   - Keep RLS enabled and revokes applied for `leads`, `audit_requests`, `email_events`, and `_prisma_migrations`.

2. App config
   - Set `APP_BASE_URL` to the public deployed URL.
   - Set `IP_HASH_SALT` to at least 24 random characters.
   - Set `BOOKING_URL` to the live booking link.
   - Set either `CONTACT_EMAIL` or `CONTACT_URL`.

3. Optional OpenAI
   - Set `AI_REPORT_PROVIDER=openai`.
   - Set `OPENAI_API_KEY`.
   - Set `OPENAI_MODEL`.
   - Leave unset to use deterministic written fallback.

4. Optional Resend
   - Set `RESEND_API_KEY`.
   - Set `FROM_EMAIL`.
   - Set `INTERNAL_LEAD_NOTIFY_EMAIL`.
   - Verify the sender/domain in Resend before launch.
   - Send one real test report and confirm both user and internal emails arrive.

5. Optional persistent rate limiting
   - Set `UPSTASH_REDIS_REST_URL`.
   - Set `UPSTASH_REDIS_REST_TOKEN`.
   - If unset, the app uses in-memory rate limiting, fine for local dev and single-process smoke tests only.

Smoke test:

1. Submit a valid public website URL.
2. Confirm preview appears.
3. Submit email with consent.
4. Confirm report opens with `/audit/{reportToken}`.
5. Confirm `email_events` has user and internal delivery attempts.
6. Confirm logs contain analytics event names but no raw email, phone, URL query strings, or raw HTML.

## Security Notes

- Report URLs use a separate public token instead of the internal audit request ID.
- Server logs avoid raw emails, phone numbers, names, and submitted URLs.
- URL validation rejects non-http protocols, localhost, single-label hostnames, private/internal IPs, loopback, link-local ranges, and special-use local domains.
- Homepage fetches re-check every redirect target and DNS result before requesting.
- Raw HTML is parsed in memory only and is not stored.
- AI output is validated with Zod. If validation fails, or if the AI marks an invented issue as observed, the deterministic fallback is used.
- Email delivery events store recipient hash and domain, not raw recipient emails.
- Rate limiting uses Upstash Redis when configured and falls back to in-memory for local/dev.
