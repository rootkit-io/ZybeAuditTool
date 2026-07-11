-- Create CrawlStatus enum
DO $$ BEGIN
  CREATE TYPE "CrawlStatus" AS ENUM ('pending', 'crawling', 'complete', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add crawl status fields and deep crawl data to audit_requests
ALTER TABLE "audit_requests" 
  ADD COLUMN IF NOT EXISTS "crawlStatus" "CrawlStatus" NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS "crawlStartedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "crawlCompletedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deepCrawlData" JSONB;

-- Create index on crawlStatus for efficient querying
CREATE INDEX IF NOT EXISTS "audit_requests_crawl_status_idx" ON "audit_requests"("crawlStatus");
