import { describe, expect, it } from "vitest";
import { parseHomepageHtml } from "@/lib/audits/html-signals";

describe("parseHomepageHtml", () => {
  it("extracts title, meta description, h1, headings, links, forms, contact, cta, and social signals", () => {
    const signals = parseHomepageHtml(
      `
        <!doctype html>
        <html>
          <head>
            <title>Zybe Social</title>
            <meta name="description" content="Custom websites and AI automation for growing companies.">
          </head>
          <body>
            <h1>Websites that convert</h1>
            <h2>Services</h2>
            <a href="/services">Services</a>
            <a href="https://example.com/about">About</a>
            <a href="https://linkedin.com/company/zybe">LinkedIn</a>
            <a href="mailto:hello@example.com">Contact us</a>
            <button>Book a call</button>
            <form><input name="email"></form>
          </body>
        </html>
      `,
      "https://example.com/"
    );

    expect(signals).toMatchObject({
      titleExists: true,
      titleLength: 11,
      metaDescriptionExists: true,
      h1Exists: true,
      headingCounts: { h1: 1, h2: 1, h3: 0, h4: 0, h5: 0, h6: 0 },
      internalLinkCount: 2,
      externalLinkCount: 1,
      contactLinkDetected: true,
      ctaKeywordDetected: true,
      formDetected: true,
      socialLinkDetected: true
    });
  });
});
