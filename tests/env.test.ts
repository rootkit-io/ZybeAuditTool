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
});
