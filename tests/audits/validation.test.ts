import { describe, expect, it } from "vitest";
import { submitEmailSchema } from "@/lib/audits/validation";

describe("submitEmailSchema", () => {
  it("normalizes valid email before persistence", () => {
    const result = submitEmailSchema.parse({
      auditRequestId: "audit_12345678",
      email: " PERSON@Example.COM ",
      consentToContact: true
    });

    expect(result.email).toBe("person@example.com");
  });

  it("rejects missing consent", () => {
    const result = submitEmailSchema.safeParse({
      auditRequestId: "audit_12345678",
      email: "person@example.com",
      consentToContact: false
    });

    expect(result.success).toBe(false);
  });
});
