import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuditReport } from "@/lib/audits/types";
import type { EmailProvider } from "@/lib/email/provider";

const createEmailEvent = vi.fn(async (input: unknown) => {
  void input;
  return { id: "email_event_123" };
});

vi.mock("@/lib/audits/repository", () => ({
  createEmailEvent: (input: unknown) => createEmailEvent(input)
}));

const report: AuditReport = {
  websiteUrl: "https://example.com/",
  normalizedDomain: "example.com",
  overallScore: 72,
  categories: {
    "Design & branding": 70,
    Messaging: 68,
    "SEO basics": 61,
    "Mobile readiness": 76,
    "Conversion readiness": 64,
    "Trust signals": 72,
    "AI/chatbot opportunity": 78,
    "Lead generation readiness": 66,
    "Performance & speed": 50,
    "Technical hygiene": 80
  },
  topIssues: [
    {
      title: "Meta description is missing",
      detail: "Observed homepage HTML did not include a meta description.",
      category: "SEO basics",
      severity: "medium",
      observed: true
    }
  ],
  summary: "Observed homepage checks were used.",
  recommendations: [],
  generatedAt: "2026-07-05T00:00:00.000Z",
  methodologyNote: "Safe homepage checks."
};

describe("email delivery", () => {
  beforeEach(() => {
    createEmailEvent.mockClear();
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("FROM_EMAIL", "Zybe Social <audit@example.com>");
    vi.stubEnv("INTERNAL_LEAD_NOTIFY_EMAIL", "hello@zybesocial.com");
    vi.stubEnv("APP_BASE_URL", "https://audit.zybesocial.com");
  });

  it("sends user and internal emails and records sent events", async () => {
    const provider: EmailProvider = {
      send: vi.fn(async () => ({
        provider: "resend",
        status: "sent",
        providerMessageId: "resend_123"
      }) as const)
    };
    const { deliverAuditEmails } = await import("@/lib/email/delivery");

    await deliverAuditEmails(
      {
        auditRequestId: "audit_123",
        leadId: "lead_123",
        reportToken: "report_token",
        report,
        lead: {
          email: "person@example.com",
          name: "Person",
          consentToContact: true
        }
      },
      provider
    );

    expect(provider.send).toHaveBeenCalledTimes(2);
    expect(createEmailEvent).toHaveBeenCalledTimes(2);
    expect(createEmailEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "user_report",
        status: "sent",
        provider: "resend",
        providerMessageId: "resend_123",
        recipientDomain: "example.com"
      })
    );
  });

  it("records failure events without throwing", async () => {
    const provider: EmailProvider = {
      send: vi.fn(async () => {
        throw new Error("resend_down");
      })
    };
    const { deliverAuditEmails } = await import("@/lib/email/delivery");

    await expect(
      deliverAuditEmails(
        {
          auditRequestId: "audit_123",
          leadId: "lead_123",
          reportToken: "report_token",
          report,
          lead: {
            email: "person@example.com",
            consentToContact: true
          }
        },
        provider
      )
    ).resolves.toBeUndefined();

    expect(createEmailEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "user_report",
        status: "failed",
        errorCode: "resend_down"
      })
    );
  });
});
