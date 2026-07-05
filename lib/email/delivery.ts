import { createHash } from "node:crypto";
import type { EmailEventStatus, EmailEventType } from "@prisma/client";
import type { AuditReport } from "@/lib/audits/types";
import { createEmailEvent } from "@/lib/audits/repository";
import { getEmailConfig } from "@/lib/env";
import { buildInternalLeadNotificationEmail, buildUserReportEmail, type LeadContact } from "./templates";
import { createEmailProviderFromEnv, type EmailProvider, type SendEmailResult } from "./provider";

export type DeliverAuditEmailsInput = {
  auditRequestId: string;
  leadId?: string | null;
  reportToken: string;
  report: AuditReport;
  lead: LeadContact;
};

export async function deliverAuditEmails(
  input: DeliverAuditEmailsInput,
  provider: EmailProvider | null = createEmailProviderFromEnv()
) {
  const config = getEmailConfig();

  if (!config || !provider) {
    await Promise.all([
      recordDelivery(input, "user_report", input.lead.email, {
        provider: "disabled",
        status: "skipped",
        errorCode: "email_not_configured"
      }),
      recordDelivery(input, "internal_lead_notification", config?.internalLeadNotifyEmail || "internal@local", {
        provider: "disabled",
        status: "skipped",
        errorCode: "email_not_configured"
      })
    ]);
    return;
  }

  const reportUrl = buildReportUrl(config.appBaseUrl, input.reportToken);
  const userEmail = buildUserReportEmail({ report: input.report, reportUrl, lead: input.lead });
  const internalEmail = buildInternalLeadNotificationEmail({ report: input.report, reportUrl, lead: input.lead });

  await Promise.all([
    sendAndRecord(input, "user_report", input.lead.email, () =>
      provider.send({
        to: input.lead.email,
        from: config.fromEmail,
        subject: userEmail.subject,
        html: userEmail.html,
        text: userEmail.text
      })
    ),
    sendAndRecord(input, "internal_lead_notification", config.internalLeadNotifyEmail, () =>
      provider.send({
        to: config.internalLeadNotifyEmail,
        from: config.fromEmail,
        subject: internalEmail.subject,
        html: internalEmail.html,
        text: internalEmail.text,
        replyTo: input.lead.email
      })
    )
  ]);
}

export function buildReportUrl(appBaseUrl: string, reportToken: string) {
  return new URL(`/audit/${reportToken}`, appBaseUrl).toString();
}

async function sendAndRecord(
  input: DeliverAuditEmailsInput,
  type: EmailEventType,
  recipient: string,
  send: () => Promise<SendEmailResult>
) {
  try {
    const result = await send();
    await recordDelivery(input, type, recipient, result);
  } catch (error) {
    await recordDelivery(input, type, recipient, {
      provider: "resend",
      status: "failed",
      errorCode: error instanceof Error ? safeErrorCode(error.message) : "email_send_failed"
    });
  }
}

async function recordDelivery(
  input: DeliverAuditEmailsInput,
  type: EmailEventType,
  recipient: string,
  result: SendEmailResult
) {
  await createEmailEvent({
    auditRequestId: input.auditRequestId,
    leadId: input.leadId || undefined,
    type,
    status: result.status as EmailEventStatus,
    recipientEmailHash: hashEmail(recipient),
    recipientDomain: extractEmailDomain(recipient),
    provider: result.provider,
    providerMessageId: result.providerMessageId,
    errorCode: result.errorCode
  }).catch((error) => {
    console.error("email_event_record_failed", {
      auditRequestId: input.auditRequestId,
      type,
      error: error instanceof Error ? error.message : "unknown"
    });
  });
}

function hashEmail(email: string) {
  return createHash("sha256").update(email.toLowerCase().trim()).digest("hex");
}

function extractEmailDomain(email: string) {
  const domain = email.split("@")[1]?.toLowerCase();

  return domain || undefined;
}

function safeErrorCode(message: string) {
  const normalized = message
    .toLowerCase()
    .replace(/[^a-z0-9_ -]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 80);

  return normalized || "email_send_failed";
}
