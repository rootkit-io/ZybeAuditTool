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

The audit does not crawl private data or call OpenAI in Phase 1. Non-observed recommendations are labeled as possible opportunities.

## Security Notes

- Report URLs use a separate public token instead of the internal audit request ID.
- Server logs avoid raw emails, phone numbers, names, and submitted URLs.
- URL validation rejects non-http protocols, localhost, single-label hostnames, private/internal IPs, loopback, link-local ranges, and special-use local domains.
- Rate limiting is in-memory. Use Redis, Upstash, or another shared store before running multiple app instances.
