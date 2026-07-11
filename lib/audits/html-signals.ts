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
  "sign up",
  "free trial",
  "get a quote",
  "learn more",
  "subscribe"
];

const socialHosts: { host: string; name: string }[] = [
  { host: "facebook.com", name: "Facebook" },
  { host: "instagram.com", name: "Instagram" },
  { host: "linkedin.com", name: "LinkedIn" },
  { host: "youtube.com", name: "YouTube" },
  { host: "youtu.be", name: "YouTube" },
  { host: "tiktok.com", name: "TikTok" },
  { host: "twitter.com", name: "X/Twitter" },
  { host: "x.com", name: "X/Twitter" },
  { host: "pinterest.com", name: "Pinterest" },
  { host: "threads.net", name: "Threads" },
  { host: "github.com", name: "GitHub" },
  { host: "discord.com", name: "Discord" },
  { host: "behance.net", name: "Behance" },
  { host: "dribbble.com", name: "Dribbble" },
  { host: "medium.com", name: "Medium" },
  { host: "reddit.com", name: "Reddit" }
];

const genericLinkPhrases = ["click here", "read more", "learn more", "more", "details", "this page", "here", "go", "link"];

const trackingScriptPatterns = [
  { pattern: /gtag\s*\(/i, name: "Google Analytics (gtag)" },
  { pattern: /google-analytics\.com\/analytics\.js/i, name: "Google Analytics (Universal)" },
  { pattern: /gtm\.js/i, name: "Google Tag Manager" },
  { pattern: /fbq\s*\(/i, name: "Facebook Pixel" },
  { pattern: /connect\.facebook\.net/i, name: "Facebook Pixel" },
  { pattern: /hotjar/i, name: "Hotjar" },
  { pattern: /clarity\.microsoft/i, name: "Microsoft Clarity" },
  { pattern: /analytics\..*\/plausible/i, name: "Plausible Analytics" },
  { pattern: /script\.simpleanalytics/i, name: "Simple Analytics" },
  { pattern: /amplitude\.com/i, name: "Amplitude" },
  { pattern: /mixpanel/i, name: "Mixpanel" },
  { pattern: /hubspot.*analytics/i, name: "HubSpot Analytics" },
  { pattern: /linkedin.*insight/i, name: "LinkedIn Insight Tag" },
  { pattern: /snapchat.*pixel/i, name: "Snapchat Pixel" },
  { pattern: /tiktok.*pixel/i, name: "TikTok Pixel" },
  { pattern: /pinterest.*tag/i, name: "Pinterest Tag" }
];

const technologyPatterns: { pattern: RegExp; name: string; category: string }[] = [
  { pattern: /wp-content|wp-includes|wordpress/i, name: "WordPress", category: "cms" },
  { pattern: /\/wp-json\//i, name: "WordPress REST API", category: "cms" },
  { pattern: /drupal/i, name: "Drupal", category: "cms" },
  { pattern: /joomla/i, name: "Joomla", category: "cms" },
  { pattern: /shopify/i, name: "Shopify", category: "cms" },
  { pattern: /squarespace/i, name: "Squarespace", category: "cms" },
  { pattern: /wix/i, name: "Wix", category: "cms" },
  { pattern: /webflow/i, name: "Webflow", category: "cms" },
  { pattern: /next\.js|__next|_next\//i, name: "Next.js", category: "framework" },
  { pattern: /react\.js|react\/|react-dom/i, name: "React", category: "framework" },
  { pattern: /vue\.js|vue\/|__vue__/i, name: "Vue.js", category: "framework" },
  { pattern: /angular/i, name: "Angular", category: "framework" },
  { pattern: /svelte/i, name: "Svelte", category: "framework" },
  { pattern: /tailwind/i, name: "Tailwind CSS", category: "css" },
  { pattern: /bootstrap/i, name: "Bootstrap", category: "css" },
  { pattern: /cloudflare/i, name: "Cloudflare", category: "cdn" },
  { pattern: /cf-ray/i, name: "Cloudflare", category: "cdn" },
  { pattern: /cloudfront\.net/i, name: "AWS CloudFront", category: "cdn" },
  { pattern: /fastly/i, name: "Fastly", category: "cdn" },
  { pattern: /algolia/i, name: "Algolia", category: "other" },
  { pattern: /intercom/i, name: "Intercom", category: "other" },
  { pattern: /hubspot/i, name: "HubSpot", category: "other" },
  { pattern: /mailchimp/i, name: "Mailchimp", category: "other" },
  { pattern: /stripe/i, name: "Stripe", category: "other" },
  { pattern: /jquery/i, name: "jQuery", category: "javascript" },
  { pattern: /lodash/i, name: "Lodash", category: "javascript" },
  { pattern: /swiper/i, name: "Swiper", category: "javascript" },
  { pattern: /fancybox|lightbox/i, name: "Lightbox", category: "javascript" },
  { pattern: /recaptcha|g-recaptcha/i, name: "reCAPTCHA", category: "other" },
  { pattern: /google.*maps/i, name: "Google Maps", category: "other" },
  { pattern: /typekit|fonts\.googleapis/i, name: "Google Fonts", category: "css" },
  { pattern: /font-awesome|fontawesome/i, name: "Font Awesome", category: "css" }
];

export function parseHomepageHtml(html: string, finalUrl: string): Partial<HomepageObservedSignals> {
  const $ = cheerio.load(html);
  const baseUrl = new URL(finalUrl);

  // ─── Title ────────────────────────────────────────────────────────
  const title = $("title").first().text().trim();
  const metaDescription = $('meta[name="description" i]').first().attr("content")?.trim() || "";

  // ─── Headings ─────────────────────────────────────────────────────
  const headingCounts = {
    h1: $("h1").length,
    h2: $("h2").length,
    h3: $("h3").length,
    h4: $("h4").length,
    h5: $("h5").length,
    h6: $("h6").length
  };

  // ─── Links ────────────────────────────────────────────────────────
  let internalLinkCount = 0;
  let externalLinkCount = 0;
  let contactLinkDetected = false;
  let socialLinkDetected = false;
  let nofollowLinkCount = 0;
  let hasGenericLinkText = false;
  let hasMailtoLinks = false;
  let hasTelLinks = false;
  const socialProfiles: { platform: string; url: string }[] = [];
  const foundPlatforms = new Set<string>();

  $("a[href]").each((_, element) => {
    const href = ($(element).attr("href") || "").trim();
    const text = $(element).text().trim().toLowerCase();
    const lowerHref = href.toLowerCase();
    const rel = ($(element).attr("rel") || "").toLowerCase();

    // Contact detection
    if (
      lowerHref.startsWith("mailto:") ||
      lowerHref.startsWith("tel:") ||
      lowerHref.includes("/contact") ||
      lowerHref.includes("/kontakt") ||
      text.includes("contact") ||
      text.includes("kontakt")
    ) {
      contactLinkDetected = true;
      if (lowerHref.startsWith("mailto:")) hasMailtoLinks = true;
      if (lowerHref.startsWith("tel:")) hasTelLinks = true;
    }

    // Nofollow detection
    if (rel.includes("nofollow")) {
      nofollowLinkCount++;
    }

    // Generic link text detection
    if (text.length > 0 && text.length < 30 && genericLinkPhrases.includes(text)) {
      hasGenericLinkText = true;
    }

    const linkUrl = toHttpUrl(href, baseUrl);
    if (!linkUrl) return;

    if (isSameRegistrableHost(baseUrl.hostname, linkUrl.hostname)) {
      internalLinkCount += 1;
    } else {
      externalLinkCount += 1;
    }

    // Social profile detection
    for (const sh of socialHosts) {
      const linkHost = linkUrl.hostname.replace(/^www\./, "");
      if (linkHost === sh.host || linkHost.endsWith("." + sh.host)) {
        socialLinkDetected = true;
        if (!foundPlatforms.has(sh.name)) {
          foundPlatforms.add(sh.name);
          socialProfiles.push({ platform: sh.name, url: linkUrl.toString() });
        }
      }
    }
  });

  // ─── CTA Detection ────────────────────────────────────────────────
  const ctaElements = $("a, button, input[type='submit'], input[type='button']");
  const ctaText = ctaElements
    .map((_, el) => {
      const $el = $(el);
      return [$el.text(), $el.attr("value"), $el.attr("aria-label"), $el.attr("title")].filter(Boolean).join(" ");
    })
    .get()
    .join(" ")
    .toLowerCase();

  const ctaKeywordDetected = ctaKeywords.some((keyword) => ctaText.includes(keyword));

  // ─── Viewport Meta ────────────────────────────────────────────────
  const viewportContent = $('meta[name="viewport" i]').attr("content") || "";
  const viewportMetaExists = viewportContent.length > 0;

  // ─── Charset ──────────────────────────────────────────────────────
  const charsetMeta = $('meta[charset]').attr("charset") || "";
  const charsetDeclared = charsetMeta.length > 0;

  // ─── Favicon ──────────────────────────────────────────────────────
  const faviconLink =
    $('link[rel="icon" i]').attr("href") ||
    $('link[rel="shortcut icon" i]').attr("href") ||
    $('link[rel="apple-touch-icon" i]').attr("href") ||
    "";
  const faviconExists = faviconLink.length > 0;

  // ─── Open Graph ───────────────────────────────────────────────────
  const ogTitle = $('meta[property="og:title" i]').attr("content") || "";
  const ogDescription = $('meta[property="og:description" i]').attr("content") || "";
  const ogImage = $('meta[property="og:image" i]').attr("content") || "";
  const ogTitleExists = ogTitle.length > 0;
  const ogDescriptionExists = ogDescription.length > 0;
  const ogImageExists = ogImage.length > 0;

  // ─── Twitter Card ─────────────────────────────────────────────────
  const twitterCard =
    $('meta[name="twitter:card" i]').attr("content") ||
    $('meta[property="twitter:card" i]').attr("content") ||
    "";
  const twitterCardExists = twitterCard.length > 0;

  // ─── Canonical URL ────────────────────────────────────────────────
  const canonicalLink = $('link[rel="canonical" i]').attr("href") || "";
  const canonicalUrlExists = canonicalLink.length > 0;

  // ─── Language ─────────────────────────────────────────────────────
  const htmlLang = $("html").attr("lang") || "";
  const htmlLanguageDeclared = htmlLang.length > 0;

  // ─── Structured Data ──────────────────────────────────────────────
  let hasJsonLdStructuredData = false;
  $('script[type="application/ld+json"]').each(() => {
    hasJsonLdStructuredData = true;
    return false; // break
  });

  // ─── Schema.org / Microdata ───────────────────────────────────────
  const schemaOrgDetected = $("[itemscope][itemtype]").length > 0;

  // ─── Word Count ───────────────────────────────────────────────────
  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  const wordCount = bodyText ? bodyText.split(/\s+/).length : 0;

  // ─── CSS & JS Files ────────────────────────────────────────────────
  const cssFileCount = $('link[rel="stylesheet" i]').length;
  const jsFileCount = $('script[src]').length;
  const inlineScripts = $("script:not([src])").length;
  const renderBlockingResources = cssFileCount + jsFileCount;

  // ─── Images ───────────────────────────────────────────────────────
  let totalImages = 0;
  let imagesWithAlt = 0;
  let imagesWithoutAlt = 0;
  $("img").each((_, el) => {
    totalImages++;
    const alt = $(el).attr("alt");
    if (alt !== undefined && alt.trim().length > 0) {
      imagesWithAlt++;
    } else {
      imagesWithoutAlt++;
    }
  });

  // ─── Tracking Detection ───────────────────────────────────────────
  const allScripts = $("script")
    .map((_, el) => $(el).attr("src") || $(el).html() || "")
    .get()
    .join(" ");
  let gtagDetected = false;
  let facebookPixelDetected = false;
  for (const tp of trackingScriptPatterns) {
    if (tp.pattern.test(allScripts)) {
      if (tp.name.includes("Google")) gtagDetected = true;
      if (tp.name.includes("Facebook") || tp.name.includes("Pixel")) facebookPixelDetected = true;
    }
  }

  // ─── Page Structure ───────────────────────────────────────────────
  const hasNavigation = $("nav, [role='navigation'], header nav").length > 0;
  const hasFooter = $("footer, [role='contentinfo']").length > 0;
  const hasMainElement = $("main, [role='main']").length > 0;

  // ─── Form Detection ───────────────────────────────────────────────
  const formDetected = $("form").length > 0;

  // ─── Technology Detection (from HTML) ─────────────────────────────
  // (We just check scripts and HTML for known patterns)
  const allHtml = html.toLowerCase();

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
    ctaKeywordDetected,
    formDetected,
    socialLinkDetected,
    socialProfiles: socialProfiles.length > 0 ? socialProfiles : undefined,
    nofollowLinkCount,
    hasGenericLinkText,
    hasMailtoLinks,
    hasTelLinks,

    // New 100% confirmed signals
    viewportMetaExists,
    charsetDeclared,
    faviconExists,
    ogTitleExists,
    ogDescriptionExists,
    ogImageExists,
    twitterCardExists,
    canonicalUrlExists,
    htmlLanguageDeclared,
    htmlLanguage: htmlLang || undefined,
    hasJsonLdStructuredData,
    wordCount,
    cssFileCount,
    jsFileCount,
    totalImages,
    imagesWithAlt,
    imagesWithoutAlt,
    schemaOrgDetected,
    renderBlockingResources,
    gtagDetected,
    facebookPixelDetected,
    hasNavigation,
    hasFooter,
    hasMainElement
  };
}

export function extractTechnologiesFromHtml(html: string): { name: string; category: string; confidence: number }[] {
  const detected: { name: string; category: string; confidence: number }[] = [];
  const found = new Set<string>();

  for (const tp of technologyPatterns) {
    if (tp.pattern.test(html) && !found.has(tp.name)) {
      found.add(tp.name);
      detected.push({ name: tp.name, category: tp.category, confidence: 80 });
    }
  }

  return detected;
}

function toHttpUrl(href: string, baseUrl: URL): URL | null {
  try {
    const url = new URL(href, baseUrl);
    return ["http:", "https:"].includes(url.protocol) ? url : null;
  } catch {
    return null;
  }
}

function isSameRegistrableHost(left: string, right: string): boolean {
  return stripWww(left.toLowerCase()) === stripWww(right.toLowerCase());
}

function stripWww(hostname: string): string {
  return hostname.startsWith("www.") ? hostname.slice(4) : hostname;
}
