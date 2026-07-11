import { NextResponse } from "next/server";
import { getCrawlStatus } from "@/lib/audits/repository";
import { apiError } from "@/lib/api/responses";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || id.length < 8) {
    return apiError("Invalid audit request ID", 400);
  }

  const status = await getCrawlStatus(id);

  if (!status) {
    return apiError("Audit request not found", 404);
  }

  return NextResponse.json({
    auditRequestId: status.auditRequestId,
    status: status.status,
    startedAt: status.startedAt,
    completedAt: status.completedAt,
    // Only send lightweight status info, not full deep crawl data
    hasDeepCrawlData: status.data !== null && status.data.pages.length > 0,
    totalPagesCrawled: status.data?.totalPagesCrawled || 0,
    technologiesFound: status.data?.technologies?.length || 0,
    crawlDurationMs: status.data?.crawlDurationMs || 0
  });
}
