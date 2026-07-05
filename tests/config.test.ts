import { afterEach, describe, expect, it, vi } from "vitest";
import { getPublicAppConfig } from "@/lib/config";

describe("public app config", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses booking URL and contact email from env", () => {
    vi.stubEnv("BOOKING_URL", "https://cal.com/zybe");
    vi.stubEnv("CONTACT_EMAIL", "hello@zybesocial.com");
    vi.stubEnv("CONTACT_URL", "");

    expect(getPublicAppConfig()).toEqual({
      bookingUrl: "https://cal.com/zybe",
      contactHref: "mailto:hello@zybesocial.com?subject=Website%20audit%20follow-up",
      contactLabel: "Email Zybe Social"
    });
  });

  it("prefers contact URL over mailto link", () => {
    vi.stubEnv("BOOKING_URL", "https://cal.com/zybe");
    vi.stubEnv("CONTACT_EMAIL", "hello@zybesocial.com");
    vi.stubEnv("CONTACT_URL", "https://zybesocial.com/contact");

    expect(getPublicAppConfig()).toMatchObject({
      contactHref: "https://zybesocial.com/contact",
      contactLabel: "Contact Zybe Social"
    });
  });
});
