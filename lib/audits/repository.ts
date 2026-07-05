import type { AuditPreview, AuditReport } from "./types";
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

export async function createAuditRequest(input: CreateAuditRequestInput) {
  return prisma.auditRequest.create({
    data: {
      websiteUrl: input.websiteUrl,
      normalizedDomain: input.normalizedDomain,
      status: "preview_created",
      overallScore: input.overallScore,
      previewJson: input.preview,
      ipHash: input.ipHash,
      userAgent: input.userAgent
    },
    select: {
      id: true,
      reportToken: true,
      previewJson: true
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
        reportToken: true,
        reportJson: true,
        normalizedDomain: true
      }
    });
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
      createdAt: true
    }
  });
}

function emptyToNull(value?: string) {
  const trimmed = value?.trim();

  return trimmed ? trimmed : null;
}
