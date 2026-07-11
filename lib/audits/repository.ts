import type { CrawlStatus, EmailEventStatus, EmailEventType } from "@prisma/client";
import type { AuditPreview, AuditReport, DeepCrawlData } from "./types";
import { prisma } from "@/lib/prisma";

export type CreateAuditRequestInput = {
  websiteUrl: string;
  normalizedDomain: string;
  overallScore: number;
  preview: AuditPreview;
  ipHash?: string;
  userAgent?: string;
};

export type AttachLeadInput = {
  auditRequestId: string;
  email: string;
  name?: string;
  company?: string;
  phone?: string;
  consentToContact: true;
  report: AuditReport;
};

export type CreateEmailEventInput = {
  auditRequestId: string;
  leadId?: string;
  type: EmailEventType;
  status: EmailEventStatus;
  recipientEmailHash: string;
  recipientDomain?: string;
  provider: string;
  providerMessageId?: string;
  errorCode?: string;
};

export async function createAuditRequest(input: CreateAuditRequestInput) {
  return prisma.auditRequest.create({
    data: {
      websiteUrl: input.websiteUrl,
      normalizedDomain: input.normalizedDomain,
      status: "preview_created",
      overallScore: input.overallScore,
      previewJson: input.preview,
      ipHash: input.ipHash,
      userAgent: input.userAgent,
      crawlStatus: "pending"
    },
    select: {
      id: true,
      reportToken: true,
      previewJson: true,
      crawlStatus: true
    }
  });
}

export async function attachLeadAndReport(input: AttachLeadInput) {
  return prisma.$transaction(async (tx) => {
    const lead = await tx.lead.upsert({
      where: { email: input.email },
      create: {
        email: input.email,
        name: emptyToNull(input.name),
        company: emptyToNull(input.company),
        phone: emptyToNull(input.phone),
        consentToContact: input.consentToContact,
        source: "website_audit_tool"
      },
      update: {
        name: emptyToNull(input.name),
        company: emptyToNull(input.company),
        phone: emptyToNull(input.phone),
        consentToContact: input.consentToContact
      },
      select: { id: true }
    });

    return tx.auditRequest.update({
      where: { id: input.auditRequestId },
      data: {
        leadId: lead.id,
        status: "report_ready",
        overallScore: input.report.overallScore,
        reportJson: input.report
      },
      select: {
        id: true,
        leadId: true,
        reportToken: true,
        reportJson: true,
        normalizedDomain: true,
        deepCrawlData: true,
        crawlStatus: true
      }
    });
  });
}

export async function createEmailEvent(input: CreateEmailEventInput) {
  return prisma.emailEvent.create({
    data: {
      auditRequestId: input.auditRequestId,
      leadId: input.leadId,
      type: input.type,
      status: input.status,
      recipientEmailHash: input.recipientEmailHash,
      recipientDomain: input.recipientDomain,
      provider: input.provider,
      providerMessageId: input.providerMessageId,
      errorCode: input.errorCode
    },
    select: { id: true }
  });
}

export async function getAuditRequestById(auditRequestId: string) {
  return prisma.auditRequest.findUnique({
    where: { id: auditRequestId },
    select: {
      id: true,
      reportToken: true,
      websiteUrl: true,
      normalizedDomain: true,
      status: true,
      overallScore: true,
      previewJson: true,
      reportJson: true,
      deepCrawlData: true,
      crawlStatus: true,
      createdAt: true
    }
  });
}

export async function getAuditReportByToken(reportToken: string) {
  return prisma.auditRequest.findUnique({
    where: { reportToken },
    select: {
      id: true,
      websiteUrl: true,
      normalizedDomain: true,
      status: true,
      overallScore: true,
      reportJson: true,
      deepCrawlData: true,
      crawlStatus: true,
      createdAt: true
    }
  });
}

// ─── Crawl Status Management ────────────────────────────────────────

export async function updateCrawlStatus(
  auditRequestId: string,
  status: CrawlStatus | "pending" | "crawling" | "complete" | "failed",
  deepCrawlData?: DeepCrawlData
) {
  const data: Record<string, unknown> = {
    crawlStatus: status
  };

  if (status === "crawling") {
    data.crawlStartedAt = new Date();
  }

  if (status === "complete" || status === "failed") {
    data.crawlCompletedAt = new Date();
  }

  if (deepCrawlData) {
    data.deepCrawlData = deepCrawlData;
  }

  return prisma.auditRequest.update({
    where: { id: auditRequestId },
    data,
    select: { id: true, crawlStatus: true }
  });
}

export async function getCrawlStatus(auditRequestId: string) {
  const result = await prisma.auditRequest.findUnique({
    where: { id: auditRequestId },
    select: {
      id: true,
      crawlStatus: true,
      crawlStartedAt: true,
      crawlCompletedAt: true,
      deepCrawlData: true
    }
  });

  if (!result) return null;

  return {
    auditRequestId: result.id,
    status: result.crawlStatus,
    startedAt: result.crawlStartedAt?.toISOString() || null,
    completedAt: result.crawlCompletedAt?.toISOString() || null,
    data: result.deepCrawlData as DeepCrawlData | null
  };
}

function emptyToNull(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
