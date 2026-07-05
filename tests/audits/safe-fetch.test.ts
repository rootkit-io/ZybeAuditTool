import { describe, expect, it, vi } from "vitest";
import { maxHomepageHtmlBytes, safeFetchHomepage } from "@/lib/audits/safe-fetch";

const publicDns = vi.fn(async () => [{ address: "93.184.216.34", family: 4 }]);

describe("safeFetchHomepage", () => {
  it("fetches homepage HTML and stores parsed observed signals without raw HTML", async () => {
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === "HEAD") {
        return new Response(null, { status: 200 });
      }

      expect(url).toBe("https://example.com/");

      return new Response(
        `
          <html>
            <head><title>Example</title><meta name="description" content="Example description"></head>
            <body>
              <h1>Hello</h1>
              <a href="/contact">Contact us</a>
              <a href="https://linkedin.com/company/example">LinkedIn</a>
              <button>Get started</button>
              <form></form>
            </body>
          </html>
        `,
        { status: 200, headers: { "content-type": "text/html; charset=utf-8" } }
      );
    });

    const result = await safeFetchHomepage("https://example.com/path?utm=secret", {
      fetchImpl,
      dnsLookup: publicDns,
      now: () => new Date("2026-07-05T00:00:00.000Z")
    });

    expect(result).toMatchObject({
      fetchStatus: "success",
      reachable: true,
      requestedUrl: "https://example.com/",
      finalUrl: "https://example.com/",
      statusCode: 200,
      titleExists: true,
      metaDescriptionExists: true,
      h1Exists: true,
      contactLinkDetected: true,
      ctaKeywordDetected: true,
      formDetected: true,
      socialLinkDetected: true,
      robotsTxtAvailable: true,
      sitemapXmlAvailable: true
    });
    expect(JSON.stringify(result)).not.toContain("<html>");
  });

  it("fails gracefully on fetch timeout", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new DOMException("The operation was aborted.", "TimeoutError");
    });

    const result = await safeFetchHomepage("https://example.com/", {
      fetchImpl,
      dnsLookup: publicDns,
      now: () => new Date("2026-07-05T00:00:00.000Z")
    });

    expect(result).toMatchObject({
      fetchStatus: "failed",
      reachable: false,
      failureReason: "timeout"
    });
  });

  it("blocks unsafe redirect final URLs", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(null, {
        status: 302,
        headers: { location: "http://127.0.0.1/admin" }
      });
    });

    const result = await safeFetchHomepage("https://example.com/", {
      fetchImpl,
      dnsLookup: publicDns,
      now: () => new Date("2026-07-05T00:00:00.000Z")
    });

    expect(result).toMatchObject({
      fetchStatus: "failed",
      reachable: false,
      failureReason: "blocked_internal_target"
    });
  });

  it("follows safe redirects and stores final URL without query strings", async () => {
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === "HEAD") {
        return new Response(null, { status: 404 });
      }

      if (url === "https://example.com/") {
        return new Response(null, {
          status: 301,
          headers: { location: "https://www.example.com/home?session=secret#top" }
        });
      }

      return new Response("<html><head><title>Done</title></head><body><h1>Done</h1></body></html>", {
        status: 200,
        headers: { "content-type": "text/html" }
      });
    });

    const result = await safeFetchHomepage("https://example.com/", {
      fetchImpl,
      dnsLookup: publicDns,
      now: () => new Date("2026-07-05T00:00:00.000Z")
    });

    expect(result).toMatchObject({
      fetchStatus: "success",
      redirected: true,
      redirectCount: 1,
      finalUrl: "https://www.example.com/home"
    });
  });

  it("blocks hostnames that resolve to private addresses", async () => {
    const dnsLookup = vi.fn(async () => [{ address: "10.0.0.5", family: 4 }]);
    const fetchImpl = vi.fn();

    const result = await safeFetchHomepage("https://example.com/", {
      fetchImpl,
      dnsLookup,
      now: () => new Date("2026-07-05T00:00:00.000Z")
    });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      fetchStatus: "failed",
      reachable: false,
      failureReason: "blocked_internal_target"
    });
  });

  it("enforces homepage HTML size limit", async () => {
    const oversizedHtml = "x".repeat(maxHomepageHtmlBytes + 1);
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === "HEAD") {
        return new Response(null, { status: 404 });
      }

      return new Response(oversizedHtml, { status: 200, headers: { "content-type": "text/html" } });
    });

    const result = await safeFetchHomepage("https://example.com/", {
      fetchImpl,
      dnsLookup: publicDns,
      now: () => new Date("2026-07-05T00:00:00.000Z")
    });

    expect(result).toMatchObject({
      fetchStatus: "failed",
      reachable: true,
      failureReason: "html_size_limit_exceeded"
    });
  });
});
