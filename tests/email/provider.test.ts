import { beforeEach, describe, expect, it, vi } from "vitest";
import { ResendEmailProvider } from "@/lib/email/provider";

const { sendMock } = vi.hoisted(() => ({
  sendMock: vi.fn()
}));

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(function MockResend() {
    return {
      emails: {
        send: sendMock
      }
    };
  })
}));

describe("ResendEmailProvider", () => {
  beforeEach(() => {
    sendMock.mockReset();
  });

  it("returns sent result when Resend succeeds", async () => {
    sendMock.mockResolvedValueOnce({
      data: { id: "resend_123" },
      error: null
    });
    const provider = new ResendEmailProvider("re_test");

    await expect(
      provider.send({
        to: "person@example.com",
        from: "Zybe Social <audit@example.com>",
        subject: "Your audit",
        html: "<p>Report</p>",
        text: "Report"
      })
    ).resolves.toEqual({
      provider: "resend",
      status: "sent",
      providerMessageId: "resend_123"
    });
  });

  it("returns failed result when Resend returns an error", async () => {
    sendMock.mockResolvedValueOnce({
      data: null,
      error: { name: "validation_error" }
    });
    const provider = new ResendEmailProvider("re_test");

    await expect(
      provider.send({
        to: "person@example.com",
        from: "Zybe Social <audit@example.com>",
        subject: "Your audit",
        html: "<p>Report</p>",
        text: "Report"
      })
    ).resolves.toEqual({
      provider: "resend",
      status: "failed",
      errorCode: "validation_error"
    });
  });
});
