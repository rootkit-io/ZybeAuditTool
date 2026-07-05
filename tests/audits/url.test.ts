import { describe, expect, it } from "vitest";
import { normalizeWebsiteUrl } from "@/lib/audits/url";

describe("normalizeWebsiteUrl", () => {
  it("normalizes supported public URLs", () => {
    const result = normalizeWebsiteUrl("https://www.Example.com/path/#section");

    expect(result).toEqual({
      ok: true,
      value: {
        websiteUrl: "https://www.example.com/path",
        normalizedDomain: "example.com"
      }
    });
  });

  it("rejects invalid URLs without a protocol", () => {
    const result = normalizeWebsiteUrl("example.com");

    expect(result.ok).toBe(false);
  });

  it("rejects unsupported protocols", () => {
    const result = normalizeWebsiteUrl("ftp://example.com");

    expect(result.ok).toBe(false);
  });

  it("rejects localhost and private IP targets", () => {
    expect(normalizeWebsiteUrl("http://localhost").ok).toBe(false);
    expect(normalizeWebsiteUrl("http://127.0.0.1").ok).toBe(false);
    expect(normalizeWebsiteUrl("http://10.0.0.1").ok).toBe(false);
    expect(normalizeWebsiteUrl("http://192.168.1.1").ok).toBe(false);
    expect(normalizeWebsiteUrl("http://172.16.0.1").ok).toBe(false);
    expect(normalizeWebsiteUrl("http://169.254.10.20").ok).toBe(false);
    expect(normalizeWebsiteUrl("http://2130706433").ok).toBe(false);
    expect(normalizeWebsiteUrl("http://[::1]").ok).toBe(false);
    expect(normalizeWebsiteUrl("http://[::ffff:7f00:1]").ok).toBe(false);
    expect(normalizeWebsiteUrl("http://[fe90::1]").ok).toBe(false);
  });

  it("rejects internal-looking hostnames", () => {
    expect(normalizeWebsiteUrl("https://intranet").ok).toBe(false);
    expect(normalizeWebsiteUrl("https://example.local").ok).toBe(false);
    expect(normalizeWebsiteUrl("https://example.lan").ok).toBe(false);
    expect(normalizeWebsiteUrl("https://foo_bar.com").ok).toBe(false);
  });
});
