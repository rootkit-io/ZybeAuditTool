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
      previewJson: true
    }
  });
}

export async function attachLeadAndReport(input: AttachLeadInput) {
  const lead = await prisma.lead.upsert({
    where: { email: input.email.toLowerCase() },
    create: {
      email: input.email.toLowerCase(),
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

  return prisma.auditRequest.update({
    where: { id: input.auditRequestId },
    data: {
      leadId: lead.id,
      status: "report_ready",
      overallScore: input.report.overallScore,
      reportJson: input.report
    },
    select: {
      id: true,
      reportJson: true,
      normalizedDomain: true
    }
  });
}

export async function getAuditReport(auditRequestId: string) {
  return prisma.auditRequest.findUnique({
    where: { id: auditRequestId },
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
