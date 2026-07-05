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

## Security Notes

- Report URLs use a separate public token instead of the internal audit request ID.
- Server logs avoid raw emails, phone numbers, names, and submitted URLs.
- URL validation rejects non-http protocols, localhost, single-label hostnames, private/internal IPs, loopback, link-local ranges, and special-use local domains.
- Homepage fetches re-check every redirect target and DNS result before requesting.
- Raw HTML is parsed in memory only and is not stored.
- Rate limiting is in-memory. Use Redis, Upstash, or another shared store before running multiple app instances.
