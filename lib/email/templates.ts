import type { AuditReport } from "@/lib/audits/types";

export type LeadContact = {
  email: string;
  name?: string;
  company?: string;
  phone?: string;
  consentToContact: boolean;
};

export type ReportEmailContext = {
  report: AuditReport;
  reportUrl: string;
  lead: LeadContact;
};

export type EmailTemplate = {
  subject: string;
  html: string;
  text: string;
};

export function buildUserReportEmail(context: ReportEmailContext): EmailTemplate {
  const topItems = getTopItems(context.report);
  const auditedSite = context.report.normalizedDomain;

  return {
    subject: `Your Zybe Social website audit for ${auditedSite}`,
    html: layoutHtml(`
      <p>Hi${context.lead.name ? ` ${escapeHtml(context.lead.name)}` : ""},</p>
      <p>Your website audit for <strong>${escapeHtml(auditedSite)}</strong> is ready.</p>
      <p><strong>Overall score:</strong> ${context.report.overallScore}</p>
      ${listHtml("Top items from your report", topItems)}
      <p><a href="${escapeAttribute(context.reportUrl)}">Open your full report</a></p>
      <p>This report is based on the website URL you submitted, safe homepage checks, and your consent to save and send the report.</p>
      <p>If you want to change contact preferences or stop follow-up, reply to this email and tell us.</p>
    `),
    text: [
      `Your Zybe Social website audit for ${auditedSite} is ready.`,
      `Overall score: ${context.report.overallScore}`,
      "Top items:",
      ...topItems.map((item) => `- ${item}`),
      `Open your full report: ${context.reportUrl}`,
      "Privacy/consent note: this report is based on the website URL you submitted, safe homepage checks, and your consent to save and send the report.",
      "To change contact preferences or stop follow-up, reply to this email and tell us."
    ].join("\n\n")
  };
}

export function buildInternalLeadNotificationEmail(context: ReportEmailContext): EmailTemplate {
  const topIssues = context.report.topIssues.map((issue) => `${issue.observed ? "Observed" : "Possible"}: ${issue.title}`);
  const leadLines = [
    `Email: ${context.lead.email}`,
    context.lead.name ? `Name: ${context.lead.name}` : null,
    context.lead.company ? `Company: ${context.lead.company}` : null,
    context.lead.phone ? `Phone: ${context.lead.phone}` : null,
    `Consent to contact: ${context.lead.consentToContact ? "yes" : "no"}`
  ].filter(Boolean) as string[];

  return {
    subject: `New website audit lead: ${context.report.normalizedDomain}`,
    html: layoutHtml(`
      <p>New website audit lead submitted.</p>
      ${listHtml("Lead", leadLines)}
      ${listHtml("Audit", [
        `Website: ${context.report.websiteUrl}`,
        `Domain: ${context.report.normalizedDomain}`,
        `Overall score: ${context.report.overallScore}`,
        `Report: ${context.reportUrl}`
      ])}
      ${listHtml("Top issues", topIssues)}
    `),
    text: [
      "New website audit lead submitted.",
      "Lead:",
      ...leadLines.map((line) => `- ${line}`),
      "Audit:",
      `- Website: ${context.report.websiteUrl}`,
      `- Domain: ${context.report.normalizedDomain}`,
      `- Overall score: ${context.report.overallScore}`,
      `- Report: ${context.reportUrl}`,
      "Top issues:",
      ...topIssues.map((issue) => `- ${issue}`)
    ].join("\n")
  };
}

function getTopItems(report: AuditReport) {
  if (report.aiReport?.quickWins.length) {
    return report.aiReport.quickWins.slice(0, 3);
  }

  return report.topIssues.slice(0, 3).map((issue) => issue.title);
}

function layoutHtml(body: string) {
  return `
    <!doctype html>
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
        ${body}
      </body>
    </html>
  `;
}

function listHtml(title: string, items: string[]) {
  return `
    <p><strong>${escapeHtml(title)}</strong></p>
    <ul>
      ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
    </ul>
  `;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}
