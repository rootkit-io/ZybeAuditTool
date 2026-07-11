import type { DeepCrawlData, DeepCrawledPage, DeepCrawlTechnology } from "./types";

/**
 * Firecrawl deep crawl service.
 * Uses the self-hosted Firecrawl v2 API running on localhost:3002.
 * Runs in background after the initial HTTP preview is returned.
 */

const FIRECRAWL_BASE_URL = process.env.FIRECRAWL_BASE_URL || "http://localhost:3002";
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY || "";

type FirecrawlOptions = {
  maxPages?: number;
  maxDepth?: number;
  timeoutMs?: number;
  includePaths?: string[];
};

const DEFAULT_OPTIONS: FirecrawlOptions = {
  maxPages: 8,
  maxDepth: 2,
  timeoutMs: 45_000,
  includePaths: ["/", "/about", "/services", "/contact", "/blog", "/products", "/portfolio", "/work", "/pricing", "/faq"]
};

export async function startDeepCrawl(
  websiteUrl: string,
  normalizedDomain: string,
  options: FirecrawlOptions = {}
): Promise<DeepCrawlData> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const startTime = Date.now();

  // Scrape the homepage first (fast, single page)
  const homepageResult = await scrapePage(websiteUrl);
  const allPages: DeepCrawledPage[] = [];
  const allTechnologies = new Map<string, DeepCrawlTechnology>();
  const errors: string[] = [];

  if (homepageResult) {
    allPages.push(homepageResult);
    mergeTechnologies(allTechnologies, homepageResult.technologies);
  }

  // Then crawl key subpages
  const baseUrl = new URL(websiteUrl);
  const pagesToScrape = buildPageList(baseUrl.origin, baseUrl.pathname, opts);

  const pageResults = await Promise.allSettled(
    pagesToScrape.map((url) => scrapePage(url))
  );

  for (const result of pageResults) {
    if (result.status === "fulfilled" && result.value) {
      // Avoid duplicates
      if (!allPages.some((p) => p.url === result.value!.url)) {
        allPages.push(result.value);
        mergeTechnologies(allTechnologies, result.value.technologies);
      }
    } else if (result.status === "rejected") {
      errors.push(result.reason?.message || String(result.reason));
    }
  }

  const durationMs = Date.now() - startTime;
  const loadTimes = allPages.map((p) => p.loadTimeMs).filter((t) => t > 0);

  return {
    pages: allPages,
    technologies: Array.from(allTechnologies.values()),
    crawlDurationMs: durationMs,
    totalPagesCrawled: allPages.length,
    totalPagesAttempted: pagesToScrape.length + 1,
    performanceSummary: {
      avgLoadTimeMs: loadTimes.length > 0 ? Math.round(loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length) : 0,
      fastestPage: loadTimes.length > 0 ? allPages[loadTimes.indexOf(Math.min(...loadTimes))]?.url || "" : "",
      slowestPage: loadTimes.length > 0 ? allPages[loadTimes.indexOf(Math.max(...loadTimes))]?.url || "" : ""
    },
    errors
  };
}

async function scrapePage(url: string): Promise<DeepCrawledPage | null> {
  try {
    const body = {
      url,
      formats: ["markdown", "links"] as string[],
      onlyMainContent: true,
      timeout: 15_000
    };

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (FIRECRAWL_API_KEY) {
      headers["Authorization"] = `Bearer ${FIRECRAWL_API_KEY}`;
    }

    const response = await fetch(`${FIRECRAWL_BASE_URL}/v2/scrape`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000)
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      return {
        url,
        title: "",
        description: "",
        wordCount: 0,
        statusCode: response.status,
        loadTimeMs: 0,
        headings: { h1: [], h2: [], h3: [] },
        internalLinks: 0,
        externalLinks: 0,
        totalImages: 0,
        imagesWithAlt: 0,
        imagesWithoutAlt: 0,
        hasForms: false,
        hasContactInfo: false,
        hasFooter: false,
        hasNavigation: false,
        technologies: [],
        contentSnippet: "",
        error: `http_${response.status}: ${errText.slice(0, 200)}`
      };
    }

    const data = await response.json();
    const markdown = data?.data?.markdown || "";
    const metadata = data?.data?.metadata || {};
    const links = data?.data?.links || [];
    const pageUrl = metadata?.url || url;
    const title = metadata?.title || extractTitleFromMarkdown(markdown);
    const description = metadata?.description || "";
    const statusCode = metadata?.statusCode || 200;
    const wordCount = markdown ? markdown.split(/\s+/).length : 0;

    // Parse links
    const baseHost = new URL(url).hostname.replace(/^www\./, "");
    let internalLinks = 0;
    let externalLinks = 0;
    let hasContactInfo = false;
    const foundTechnologies: DeepCrawlTechnology[] = [];

    for (const link of links) {
      try {
        const linkUrl = new URL(link);
        const linkHost = linkUrl.hostname.replace(/^www\./, "");
        if (linkHost === baseHost || linkHost.endsWith("." + baseHost)) {
          internalLinks++;
        } else {
          externalLinks++;
        }
        if (link.includes("/contact") || link.includes("/about") || link.includes("mailto:")) {
          hasContactInfo = true;
        }
      } catch {
        // ignore invalid links
      }
    }

    // Detect technologies from markdown/URL
    foundTechnologies.push(...detectTechnologies(markdown + " " + pageUrl));

    return {
      url: pageUrl,
      title: title || url,
      description: description || "",
      wordCount,
      statusCode,
      loadTimeMs: metadata?.loadTime || 0,
      headings: extractHeadingsFromMarkdown(markdown),
      internalLinks,
      externalLinks,
      totalImages: 0, // Firecrawl markdown doesn't include image metadata
      imagesWithAlt: 0,
      imagesWithoutAlt: 0,
      hasForms: markdown.toLowerCase().includes("<form") || markdown.includes("input") || markdown.includes("submit"),
      hasContactInfo,
      hasFooter: markdown.toLowerCase().includes("footer") || markdown.toLowerCase().includes("privacy"),
      hasNavigation: markdown.toLowerCase().includes("nav") || markdown.toLowerCase().includes("menu"),
      technologies: foundTechnologies,
      contentSnippet: markdown.slice(0, 500),
      error: undefined
    };
  } catch (error) {
    return {
      url,
      title: "",
      description: "",
      wordCount: 0,
      statusCode: 0,
      loadTimeMs: 0,
      headings: { h1: [], h2: [], h3: [] },
      internalLinks: 0,
      externalLinks: 0,
      totalImages: 0,
      imagesWithAlt: 0,
      imagesWithoutAlt: 0,
      hasForms: false,
      hasContactInfo: false,
      hasFooter: false,
      hasNavigation: false,
      technologies: [],
      contentSnippet: "",
      error: error instanceof Error ? error.message.slice(0, 200) : "scrape_failed"
    };
  }
}

function buildPageList(origin: string, basePath: string, opts: FirecrawlOptions): string[] {
  const paths = opts.includePaths || ["/"];

  return paths
    .filter((p) => p !== "/" && p !== basePath) // Skip homepage (already scraped)
    .slice(0, (opts.maxPages || 8) - 1)
    .map((p) => {
      const url = new URL(p, origin);
      return url.toString();
    });
}

function mergeTechnologies(
  map: Map<string, DeepCrawlTechnology>,
  technologies: DeepCrawlTechnology[]
): void {
  for (const tech of technologies) {
    const existing = map.get(tech.name);
    if (existing) {
      existing.confidence = Math.max(existing.confidence, tech.confidence);
    } else {
      map.set(tech.name, { ...tech });
    }
  }
}

const techPatterns: { regex: RegExp; name: string; category: DeepCrawlTechnology["category"] }[] = [
  { regex: /wordpress/i, name: "WordPress", category: "cms" },
  { regex: /shopify/i, name: "Shopify", category: "cms" },
  { regex: /wix/i, name: "Wix", category: "cms" },
  { regex: /squarespace/i, name: "Squarespace", category: "cms" },
  { regex: /webflow/i, name: "Webflow", category: "cms" },
  { regex: /drupal/i, name: "Drupal", category: "cms" },
  { regex: /joomla/i, name: "Joomla", category: "cms" },
  { regex: /next\.js/i, name: "Next.js", category: "framework" },
  { regex: /react/i, name: "React", category: "framework" },
  { regex: /vue/i, name: "Vue.js", category: "framework" },
  { regex: /angular/i, name: "Angular", category: "framework" },
  { regex: /svelte/i, name: "Svelte", category: "framework" },
  { regex: /tailwind/i, name: "Tailwind CSS", category: "css" },
  { regex: /bootstrap/i, name: "Bootstrap", category: "css" },
  { regex: /cloudflare/i, name: "Cloudflare", category: "cdn" },
  { regex: /algolia/i, name: "Algolia", category: "other" },
  { regex: /intercom/i, name: "Intercom", category: "other" },
  { regex: /hubspot/i, name: "HubSpot", category: "other" },
  { regex: /stripe/i, name: "Stripe", category: "other" },
  { regex: /google.*analytics/i, name: "Google Analytics", category: "analytics" },
  { regex: /gtag/i, name: "Google Analytics (gtag)", category: "analytics" },
  { regex: /facebook.*pixel|fbq/i, name: "Facebook Pixel", category: "analytics" },
  { regex: /hotjar/i, name: "Hotjar", category: "analytics" },
  { regex: /clarity/i, name: "Microsoft Clarity", category: "analytics" },
  { regex: /jquery/i, name: "jQuery", category: "javascript" },
];

function detectTechnologies(content: string): DeepCrawlTechnology[] {
  const detected: DeepCrawlTechnology[] = [];
  const found = new Set<string>();

  for (const tp of techPatterns) {
    if (tp.regex.test(content) && !found.has(tp.name)) {
      found.add(tp.name);
      detected.push({ name: tp.name, category: tp.category, confidence: 70, version: undefined });
    }
  }

  return detected;
}

function extractTitleFromMarkdown(markdown: string): string {
  const firstLine = markdown.split("\n")[0]?.trim() || "";
  return firstLine.startsWith("#") ? firstLine.replace(/^#+\s*/, "") : firstLine;
}

function extractHeadingsFromMarkdown(markdown: string): { h1: string[]; h2: string[]; h3: string[] } {
  const lines = markdown.split("\n");
  const headings: { h1: string[]; h2: string[]; h3: string[] } = { h1: [], h2: [], h3: [] };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("# ")) headings.h1.push(trimmed.slice(2).trim());
    else if (trimmed.startsWith("## ")) headings.h2.push(trimmed.slice(3).trim());
    else if (trimmed.startsWith("### ")) headings.h3.push(trimmed.slice(4).trim());
  }

  return headings;
}

/**
 * Runs a deep crawl asynchronously and stores results.
 * Intended to be called fire-and-forget after the preview is returned.
 */
export async function runBackgroundCrawl(
  auditRequestId: string,
  websiteUrl: string,
  normalizedDomain: string,
  updateCrawlStatusFn: (id: string, status: string, data?: unknown) => Promise<unknown>
): Promise<void> {
  try {
    await updateCrawlStatusFn(auditRequestId, "crawling");

    const data = await startDeepCrawl(websiteUrl, normalizedDomain, {
      maxPages: 6,
      maxDepth: 1
    });

    await updateCrawlStatusFn(auditRequestId, "complete", data);
  } catch (error) {
    console.error("background_crawl_failed", {
      auditRequestId,
      error: error instanceof Error ? error.message : "unknown"
    });

    try {
      await updateCrawlStatusFn(auditRequestId, "failed");
    } catch {
      // Ignore cleanup errors
    }
  }
}
