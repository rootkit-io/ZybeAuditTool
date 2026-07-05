import { describe, expect, it, vi } from "vitest";
import { sanitizeAnalyticsValue, trackAnalyticsEvent } from "@/lib/analytics";

describe("analytics", () => {
  it("redacts PII-like keys and strips URL query strings", () => {
    expect(
      sanitizeAnalyticsValue({
        email: "person@example.com",
        phone: "555-0100",
        websiteUrl: "https://example.com/?secret=value#hash",
        rawHtml: "<html><body>private</body></html>",
        nested: {
          name: "Person"
        }
      })
    ).toEqual({
      email: "[redacted]",
      phone: "[redacted]",
      websiteUrl: "https://example.com/",
      rawHtml: "[redacted]",
      nested: {
        name: "[redacted]"
      }
    });
  });

  it("logs privacy-safe event payloads", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);

    trackAnalyticsEvent("email_submitted", {
      email: "person@example.com",
      auditRequestId: "audit_123"
    });

    expect(info).toHaveBeenCalledWith(
      "analytics_event",
      expect.objectContaining({
        event: "email_submitted",
        properties: {
          email: "[redacted]",
          auditRequestId: "audit_123"
        }
      })
    );

    info.mockRestore();
  });
});
