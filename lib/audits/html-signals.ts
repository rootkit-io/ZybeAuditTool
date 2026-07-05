import * as cheerio from "cheerio";
import type { HomepageObservedSignals } from "./types";

const ctaKeywords = [
  "book a call",
  "schedule a call",
  "get started",
  "contact us",
  "request a quote",
  "free consultation",
  "start project",
  "talk to us",
  "let's talk",
  "buy now",
  "sign up"
];

const socialHosts = [
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "youtube.com",
  "youtu.be",
  "tiktok.com",
  "twitter.com",
  "x.com",
  "pinterest.com",
  "threads.net"
];

export function parseHomepageHtml(html: string, finalUrl: string) {
  const $ = cheerio.load(html);
  const baseUrl = new URL(finalUrl);
  const title = $("title").first().text().trim();
  const metaDescription = $('meta[name="description" i]').first().attr("content")?.trim() || "";
  const headingCounts = {
    h1: $("h1").length,
    h2: $("h2").length,
    h3: $("h3").length,
    h4: $("h4").length,
    h5: $("h5").length,
    h6: $("h6").length
  };

  let internalLinkCount = 0;
  let externalLinkCount = 0;
  let contactLinkDetected = false;
  let socialLinkDetected = false;

  $("a[href]").each((_, element) => {
    const href = ($(element).attr("href") || "").trim();
    const text = $(element).text().trim().toLowerCase();
    const lowerHref = href.toLowerCase();

    if (
      lowerHref.startsWith("mailto:") ||
      lowerHref.startsWith("tel:") ||
      lowerHref.includes("/contact") ||
      text.includes("contact")
    ) {
      contactLinkDetected = true;
    }

    const linkUrl = toHttpUrl(href, baseUrl);

    if (!linkUrl) {
      return;
    }

    if (isSameRegistrableHost(baseUrl.hostname, linkUrl.hostname)) {
      internalLinkCount += 1;
    } else {
      externalLinkCount += 1;
    }

    if (socialHosts.some((host) => linkUrl.hostname === host || linkUrl.hostname.endsWith(`.${host}`))) {
      socialLinkDetected = true;
    }
  });

  const ctaText = $("a, button, input[type='submit'], input[type='button']")
    .map((_, element) => {
      const $element = $(element);

      return [
        $element.text(),
        $element.attr("value"),
        $element.attr("aria-label"),
        $element.attr("title")
      ]
        .filter(Boolean)
        .join(" ");
    })
    .get()
    .join(" ")
    .toLowerCase();

  return {
    titleExists: title.length > 0,
    titleLength: title.length,
    metaDescriptionExists: metaDescription.length > 0,
    metaDescriptionLength: metaDescription.length,
    h1Exists: headingCounts.h1 > 0,
    headingCounts,
    internalLinkCount,
    externalLinkCount,
    contactLinkDetected,
    ctaKeywordDetected: ctaKeywords.some((keyword) => ctaText.includes(keyword)),
    formDetected: $("form").length > 0,
    socialLinkDetected
  } satisfies Partial<HomepageObservedSignals>;
}

function toHttpUrl(href: string, baseUrl: URL) {
  try {
    const url = new URL(href, baseUrl);

    return ["http:", "https:"].includes(url.protocol) ? url : null;
  } catch {
    return null;
  }
}

function isSameRegistrableHost(left: string, right: string) {
  return stripWww(left.toLowerCase()) === stripWww(right.toLowerCase());
}

function stripWww(hostname: string) {
  return hostname.startsWith("www.") ? hostname.slice(4) : hostname;
}
