import { afterEach, describe, expect, it, vi } from "vitest";
import { validateServerEnv } from "@/lib/env";

describe("server env validation", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("allows AI provider to be disabled", () => {
    vi.stubEnv("AI_REPORT_PROVIDER", "");
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("OPENAI_MODEL", "");

    expect(() => validateServerEnv()).not.toThrow();
  });

  it("requires OpenAI key and model when AI provider is enabled", () => {
    vi.stubEnv("AI_REPORT_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("OPENAI_MODEL", "");

    expect(() => validateServerEnv()).toThrow("OPENAI_API_KEY");
  });

  it("requires complete Resend config if any email delivery env is set", () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("FROM_EMAIL", "");
    vi.stubEnv("INTERNAL_LEAD_NOTIFY_EMAIL", "");
    vi.stubEnv("APP_BASE_URL", "");

    expect(() => validateServerEnv()).toThrow("FROM_EMAIL");
  });

  it("does not block core app when email delivery env is absent", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@example.com:5432/db");
    vi.stubEnv("IP_HASH_SALT", "abcdefghijklmnopqrstuvwxyz");
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("FROM_EMAIL", "");
    vi.stubEnv("INTERNAL_LEAD_NOTIFY_EMAIL", "");
    vi.stubEnv("APP_BASE_URL", "");

    expect(() => validateServerEnv()).not.toThrow();
  });
});
