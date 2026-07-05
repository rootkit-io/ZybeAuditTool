# Zybe Social Website Audit Tool

Phase 1 MVP for a free, ethical website audit lead magnet.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env` from `.env.example` and set `DATABASE_URL` to a PostgreSQL database.

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
- Deterministic placeholder audit logic
- Rate-limited server API routes
- Validation and helper/API tests

The audit does not crawl private data or call OpenAI in Phase 1. Non-observed recommendations are labeled as possible opportunities.
