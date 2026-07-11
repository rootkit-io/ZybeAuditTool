import type { DeepCrawlData, DeepCrawledPage, DeepCrawlTechnology, BusinessIntelligence } from "./types";

const FIRECRAWL_BASE_URL = process.env.FIRECRAWL_BASE_URL || "http://localhost:3002";
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY || "";

type FirecrawlOptions = { maxPages?: number; maxDepth?: number; timeoutMs?: number; };

const PAGE_TYPE_PATTERNS: { pattern: RegExp; type: string }[] = [
  { pattern: /\/about|about-us|about\b|who-we-are|our-story|about_us/i, type: "about" },
  { pattern: /\/services|what-we-do|our-services|service\b/i, type: "services" },
  { pattern: /\/contact|contact-us|get-in-touch|contact_us/i, type: "contact" },
  { pattern: /\/blog|\/articles|\/news|\/insights|\/journal|\/resources|\/posts/i, type: "blog" },
  { pattern: /\/pricing|\/plans|\/rates|\/pricing-table/i, type: "pricing" },
  { pattern: /\/products|\/shop|\/store|\/catalog|\/collection/i, type: "products" },
  { pattern: /\/faq|\/faqs|\/help|\/knowledge-base|\/support/i, type: "faq" },
  { pattern: /\/portfolio|\/work|\/case-studies|\/our-work|\/projects/i, type: "portfolio" },
];

function detectPageType(url: string): string {
  const path = new URL(url).pathname.toLowerCase();
  for (const p of PAGE_TYPE_PATTERNS) {
    if (p.pattern.test(path)) return p.type;
  }

  if (path === "/" || path === "") return "homepage";
  return "other";
}

export async function startDeepCrawl(websiteUrl: string, _normalizedDomain: string, options: FirecrawlOptions = {}): Promise<DeepCrawlData> {
  const maxPages = 8;
  const startTime = Date.now();

  const homepageResult = await scrapePage(websiteUrl);
  const allPages: DeepCrawledPage[] = [];
  const allTechnologies = new Map<string, DeepCrawlTechnology>();
  const errors: string[] = [];

  if (homepageResult) {
    homepageResult.pageType = "homepage";
    allPages.push(homepageResult);
    mergeTechs(allTechnologies, homepageResult.technologies);
  }

  const baseUrl = new URL(websiteUrl);
  const commonPaths = ["/about", "/services", "/contact", "/blog", "/pricing", "/products", "/faq", "/portfolio", "/work"];
  const results = await Promise.allSettled(commonPaths.map(p => scrapePage(new URL(p, baseUrl.origin).toString())));

  for (const r of results) {
    if (r.status === "fulfilled" && r.value && !allPages.some(p => p.url === r.value!.url)) {
      r.value.pageType = detectPageType(r.value.url) as DeepCrawledPage["pageType"];
      allPages.push(r.value);
      mergeTechs(allTechnologies, r.value.technologies);
    } else if (r.status === "rejected") {
      errors.push(r.reason?.message || String(r.reason));
    }
  }

  const pageTypes = [...new Set(allPages.map(p => p.pageType).filter(Boolean))] as string[];
  const hasBlog = pageTypes.includes("blog");
  const hasPricingPage = pageTypes.includes("pricing");
  const hasAboutPage = pageTypes.includes("about");
  const socialUrls: { platform: string; url: string }[] = [];

  // Collect social profiles from all pages
  for (const page of allPages) {
    if (page.contentSnippet) {
      const socials = extractSocialLinks(page.contentSnippet);
      for (const s of socials) {
        if (!socialUrls.find(x => x.platform === s.platform)) socialUrls.push(s);
      }
    }
  }

  const loadTimes = allPages.map(p => p.loadTimeMs).filter(t => t > 0);

  return {
    pages: allPages,
    technologies: Array.from(allTechnologies.values()),
    crawlDurationMs: Date.now() - startTime,
    totalPagesCrawled: allPages.length,
    totalPagesAttempted: commonPaths.length + 1,
    detectedPageTypes: pageTypes,
    hasBlog,
    hasRecentBlogPosts: hasBlog && allPages.some(p => p.pageType === "blog" && p.wordCount > 100),
    hasPricingPage,
    hasAboutPage,
    socialProfiles: socialUrls,
    estimatedBusinessCategory: undefined,
    performanceSummary: {
      avgLoadTimeMs: loadTimes.length > 0 ? Math.round(loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length) : 0,
      fastestPage: loadTimes.length > 0 ? allPages[loadTimes.indexOf(Math.min(...loadTimes))]?.url || "" : "",
      slowestPage: loadTimes.length > 0 ? allPages[loadTimes.indexOf(Math.max(...loadTimes))]?.url || "" : ""
    },
    errors
  };
}

// ─── Business Intelligence Search via Firecrawl ───────────────────

export async function searchBusinessIntelligence(domain: string, companyName?: string): Promise<BusinessIntelligence> {
  const name = companyName || domain.replace(/\.[^.]+$/, "");
  const fb = firecrawlFetch();

  // Search for what the company does
  const [descResults, compResults, brandResults] = await Promise.allSettled([
    fb.search(`${name} ${domain} company what they do business`),
    fb.search(`${name} competitors alternatives`),
    fb.search(`${name} ${domain}`)
  ]);

  const description = extractSearchSummary(descResults);
  const competitors = extractCompetitors(compResults);
  const brandFound = extractBrandPresence(brandResults, domain);

  // Infer business details from results
  const industry = inferIndustry(description + " " + domain);
  const audience = inferAudience(description);
  const reach = inferGeographicReach(domain);

  return {
    businessDescription: description || `${domain} is a website in the ${industry} space.`,
    industry,
    targetAudience: audience,
    valueProposition: extractValueProp(description),
    productsServices: extractServices(description),
    competitors: competitors.slice(0, 5),
    estimatedSize: inferSize(domain, description),
    geographicReach: reach,
    businessModel: inferBusinessModel(description, industry),
    brandSearchResults: brandFound,
    industrySeoContext: getIndustrySeoContext(industry)
  };
}

// ─── Firecrawl helpers ─────────────────────────────────────────────

function firecrawlFetch() {
  const base = FIRECRAWL_BASE_URL;
  const key = FIRECRAWL_API_KEY;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (key) headers["Authorization"] = `Bearer ${key}`;

  return {
    async search(query: string): Promise<string> {
      try {
        const res = await fetch(`${base}/v2/scrape`, {
          method: "POST", headers,
          body: JSON.stringify({
            url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
            formats: ["markdown"],
            onlyMainContent: true,
            timeout: 10000
          }),
          signal: AbortSignal.timeout(12000)
        });
        if (!res.ok) return "";
        const data = await res.json();
        return data?.data?.markdown || "";
      } catch { return ""; }
    }
  };
}

async function scrapePage(url: string): Promise<DeepCrawledPage | null> {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (FIRECRAWL_API_KEY) headers["Authorization"] = `Bearer ${FIRECRAWL_API_KEY}`;

    const response = await fetch(`${FIRECRAWL_BASE_URL}/v2/scrape`, {
      method: "POST", headers,
      body: JSON.stringify({ url, formats: ["markdown", "links"], onlyMainContent: true, timeout: 15000 }),
      signal: AbortSignal.timeout(20000)
    });

    if (!response.ok) {
      return {
        url, title: "", description: "", wordCount: 0, statusCode: response.status, loadTimeMs: 0,
        headings: { h1: [], h2: [], h3: [] }, internalLinks: 0, externalLinks: 0,
        totalImages: 0, imagesWithAlt: 0, imagesWithoutAlt: 0, hasForms: false,
        hasContactInfo: false, hasFooter: false, hasNavigation: false, technologies: [],
        contentSnippet: "", error: `http_${response.status}`
      };
    }

    const data = await response.json();
    const md = data?.data?.markdown || "";
    const meta = data?.data?.metadata || {};
    const links = data?.data?.links || [];
    const pageUrl = meta?.url || url;
    const title = meta?.title || extractTitle(md);
    const wordCount = md ? md.split(/\s+/).length : 0;
    const baseHost = new URL(url).hostname.replace(/^www\./, "");

    let internalLinks = 0, externalLinks = 0, hasContactInfo = false;
    for (const link of links) {
      try {
        const lu = new URL(link);
        const lh = lu.hostname.replace(/^www\./, "");
        if (lh === baseHost || lh.endsWith("." + baseHost)) internalLinks++;
        else externalLinks++;
        if (link.includes("/contact") || link.includes("mailto:")) hasContactInfo = true;
      } catch {}
    }

    const techs = detectTechnologies(md + " " + pageUrl);

    return {
      url: pageUrl, title: title || url, description: meta?.description || "",
      wordCount, statusCode: meta?.statusCode || 200, loadTimeMs: meta?.loadTime || 0,
      headings: extractHeadings(md), internalLinks, externalLinks,
      totalImages: 0, imagesWithAlt: 0, imagesWithoutAlt: 0,
      hasForms: md.toLowerCase().includes("<form") || md.includes("input"),
      hasContactInfo, hasFooter: md.toLowerCase().includes("footer") || md.toLowerCase().includes("privacy"),
      hasNavigation: md.toLowerCase().includes("nav") || md.toLowerCase().includes("menu"),
      technologies: techs, contentSnippet: md.slice(0, 500), error: undefined
    };
  } catch (error) {
    return {
      url, title: "", description: "", wordCount: 0, statusCode: 0, loadTimeMs: 0,
      headings: { h1: [], h2: [], h3: [] }, internalLinks: 0, externalLinks: 0,
      totalImages: 0, imagesWithAlt: 0, imagesWithoutAlt: 0, hasForms: false,
      hasContactInfo: false, hasFooter: false, hasNavigation: false, technologies: [],
      contentSnippet: "", error: error instanceof Error ? error.message.slice(0, 200) : "scrape_failed"
    };
  }
}

export async function runBackgroundCrawl(
  auditRequestId: string, websiteUrl: string, normalizedDomain: string,
  updateCrawlStatusFn: (id: string, status: string, data?: unknown) => Promise<unknown>
): Promise<void> {
  try {
    await updateCrawlStatusFn(auditRequestId, "crawling");
    const crawlData = await startDeepCrawl(websiteUrl, normalizedDomain, { maxPages: 6, maxDepth: 1 });

    // Also search for business intelligence
    const businessIntel = await searchBusinessIntelligence(normalizedDomain, crawlData.estimatedBusinessCategory);

    await updateCrawlStatusFn(auditRequestId, "complete", {
      ...crawlData,
      _businessIntel: businessIntel
    });
  } catch (error) {
    console.error("background_crawl_failed", { auditRequestId, error: error instanceof Error ? error.message : "unknown" });
    try { await updateCrawlStatusFn(auditRequestId, "failed"); } catch {}
  }
}

// ─── Extraction helpers ────────────────────────────────────────────

function extractSearchSummary(result: PromiseSettledResult<string>): string {
  if (result.status === "fulfilled" && result.value) {
    const text = result.value.replace(/\[.*?\]/g, "").replace(/\|/g, "").trim();
    return text.slice(0, 1000);
  }
  return "";
}

function extractCompetitors(result: PromiseSettledResult<string>): { name: string; domain: string; description: string; }[] {
  if (result.status !== "fulfilled" || !result.value) return [];
  const comps: { name: string; domain: string; description: string; }[] = [];
  const lines = result.value.split("\n");
  for (const line of lines) {
    const match = line.match(/([A-Z][A-Za-z0-9\s]+)(?:\.com|\.io|\.ai|\.net|\.org)/);
    if (match) {
      const name = match[1].trim();
      if (!comps.find(c => c.name === name)) {
        comps.push({ name, domain: name.toLowerCase().replace(/\s+/g, "") + ".com", description: line.slice(0, 150) });
      }
    }
  }
  return comps.slice(0, 8);
}

function extractBrandPresence(result: PromiseSettledResult<string>, domain: string): { query: string; found: boolean; position?: number; }[] {
  const q = `${domain}`;
  if (result.status !== "fulfilled" || !result.value) return [{ query: q, found: false }];
  const found = result.value.toLowerCase().includes(domain) || result.value.toLowerCase().includes(domain.replace(/\.[^.]+$/, ""));
  return [{ query: q, found }];
}

function extractSocialLinks(text: string): { platform: string; url: string; }[] {
  const platforms = [
    { regex: /https?:\/\/(?:www\.)?facebook\.com\/[A-Za-z0-9.]+/i, name: "Facebook" },
    { regex: /https?:\/\/(?:www\.)?instagram\.com\/[A-Za-z0-9._]+/i, name: "Instagram" },
    { regex: /https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in)\/[A-Za-z0-9-]+/i, name: "LinkedIn" },
    { regex: /https?:\/\/(?:www\.)?twitter\.com\/[A-Za-z0-9_]+|https?:\/\/x\.com\/[A-Za-z0-9_]+/i, name: "X/Twitter" },
    { regex: /https?:\/\/(?:www\.)?youtube\.com\/@?[A-Za-z0-9_-]+/i, name: "YouTube" },
    { regex: /https?:\/\/(?:www\.)?tiktok\.com\/@?[A-Za-z0-9_.]+/i, name: "TikTok" },
  ];
  const found: { platform: string; url: string; }[] = [];
  for (const p of platforms) {
    const m = text.match(p.regex);
    if (m) found.push({ platform: p.name, url: m[0] });
  }
  return found;
}

function inferIndustry(text: string): string {
  const keywords: [RegExp, string][] = [
    [/saas|software|app|platform|cloud/i, "SaaS / Technology"],
    [/ecommerce|shop|store|retail|product/i, "E-commerce / Retail"],
    [/agency|consulting|consultant|marketing|design/i, "Agency / Consulting"],
    [/health|medical|clinic|doctor|wellness|fitness/i, "Healthcare / Wellness"],
    [/real estate|property|rental|mortgage/i, "Real Estate"],
    [/legal|lawyer|attorney|law firm/i, "Legal"],
    [/finance|banking|insurance|invest|wealth/i, "Financial Services"],
    [/education|course|training|academy|learn/i, "Education"],
    [/restaurant|food|catering|chef|cuisine/i, "Food & Hospitality"],
    [/construction|contractor|building|renovation/i, "Construction"],
    [/travel|hotel|tourism|vacation|destination/i, "Travel & Tourism"],
    [/nonprofit|charity|foundation|ngo/i, "Nonprofit"],
    [/fashion|beauty|cosmetic|style|apparel/i, "Fashion & Beauty"],
    [/manufactur|industrial|factory|production/i, "Manufacturing"],
    [/church|ministry|faith|worship|religious/i, "Religious Organization"],
  ];
  for (const [re, industry] of keywords) {
    if (re.test(text)) return industry;
  }
  return "General Business";
}

function inferAudience(text: string): string {
  if (/b2b|business|enterprise|corporate|company|organization/i.test(text)) return "B2B (businesses)";
  if (/consumer|customer|client|individual|person|people/i.test(text)) return "B2C (consumers)";
  if (/small business|startup|founder|entrepreneur/i.test(text)) return "Small businesses / startups";
  if (/agency|freelancer|professional/i.test(text)) return "Agencies / Professionals";
  return "General audience";
}

function extractValueProp(text: string): string {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
  if (sentences.length > 0) return sentences[0].trim();
  return "Value proposition not clearly identified from available data.";
}

function extractServices(text: string): string[] {
  const services: string[] = [];
  const lines = text.split("\n");
  for (const line of lines) {
    const trimmed = line.trim().replace(/^[-*\d.]+\s*/, "");
    if (trimmed.length > 10 && trimmed.length < 100 && !trimmed.includes("http")) {
      services.push(trimmed);
    }
  }
  return services.slice(0, 8);
}

function inferSize(_domain: string, text: string): "freelance" | "small" | "medium" | "large" | "enterprise" | "unknown" {
  if (/enterprise|fortune|global|multinational/i.test(text)) return "enterprise";
  if (/team of|employees|staff|offices? in/i.test(text)) return "medium";
  if (/startup|small business|freelance|solo/i.test(text)) return "small";
  if (/hundreds|thousands|million/i.test(text)) return "large";
  return "unknown";
}

function inferGeographicReach(domain: string): string {
  const tld = domain.split(".").pop()?.toLowerCase();
  if (tld === "co.uk" || tld === "uk") return "United Kingdom";
  if (tld === "de") return "Germany";
  if (tld === "fr") return "France";
  if (tld === "ca") return "Canada";
  if (tld === "au") return "Australia";
  if (tld === "in") return "India";
  if (tld === "jp") return "Japan";
  if (tld === "br") return "Brazil";
  if (tld === "cn" || tld === "cn.com") return "China";
  return "Global / United States";
}

function inferBusinessModel(text: string, industry: string): string {
  if (/subscription|saas|monthly|annual|plan/i.test(text)) return "Subscription-based (SaaS)";
  if (/ecommerce|shop|cart|checkout|buy now|add to cart/i.test(text)) return "E-commerce / Transactional";
  if (/consulting|agency|service|project|retainer/i.test(text)) return "Service-based / Agency";
  if (/lead|generate|free consult|quote/i.test(text)) return "Lead generation";
  if (/donate|donation|nonprofit|charity/i.test(text)) return "Nonprofit / Donation-funded";
  if (/advertise|sponsor|affiliate/i.test(text)) return "Advertising / Affiliate";
  return industry === "E-commerce / Retail" ? "E-commerce / Transactional" : "Service-based";
}

function getIndustrySeoContext(industry: string): string {
  const contexts: Record<string, string> = {
    "SaaS / Technology": "SaaS sites need strong technical SEO, clear CTAs, and comparison pages. Content marketing and blog are essential.",
    "E-commerce / Retail": "E-commerce requires product schema, optimized category pages, reviews, and fast load times. Image optimization is critical.",
    "Agency / Consulting": "Agencies need portfolio pages, case studies, service pages with local SEO, and trust signals like testimonials.",
    "Healthcare / Wellness": "Healthcare needs E-E-A-T signals, local SEO, appointment booking schema, and authoritative content.",
    "Real Estate": "Real estate sites need local schema, property listings with structured data, neighborhood content, and mobile-first design.",
    "Legal": "Legal sites require E-E-A-T, practice area pages, local SEO, attorney schema, and authoritative backlinks.",
    "Financial Services": "Finance needs YMYL compliance, E-E-A-T signals, secure pages, calculator tools, and transparent fee pages.",
    "Education": "Education sites need course schema, program pages, student reviews, FAQ schema, and mobile-friendly applications.",
    "Food & Hospitality": "Hospitality needs local SEO, menu schema, reservation integration, Google Business Profile, and review management.",
    "Construction": "Construction requires project galleries, service area pages, license verification, and local service schema.",
    "Travel & Tourism": "Travel sites need destination content, booking schema, user reviews, multilingual support, and fast image loading.",
    "Nonprofit": "Nonprofits need donation schema, impact stories, volunteer pages, grant information, and transparent financials.",
    "Fashion & Beauty": "Fashion needs visual optimization, product schema, size guides, lookbooks, and social proof integration.",
    "Manufacturing": "Manufacturing needs technical specifications, B2B content, certification badges, and industry-specific schema.",
    "Religious Organization": "Religious sites need event schema, location pages, sermon content, community pages, and donation integration.",
  };
  return contexts[industry] || "General SEO best practices apply: quality content, proper schema, fast load times, and mobile optimization.";
}

function extractTitle(md: string): string {
  return md.split("\n")[0]?.trim().replace(/^#+\s*/, "") || "";
}

function extractHeadings(md: string): { h1: string[]; h2: string[]; h3: string[] } {
  const headings: { h1: string[]; h2: string[]; h3: string[] } = { h1: [], h2: [], h3: [] };
  for (const line of md.split("\n")) {
    const t = line.trim();
    if (t.startsWith("# ")) headings.h1.push(t.slice(2).trim());
    else if (t.startsWith("## ")) headings.h2.push(t.slice(3).trim());
    else if (t.startsWith("### ")) headings.h3.push(t.slice(4).trim());
  }
  return headings;
}

const TECHS = [
  { re: /wordpress/i, name: "WordPress", cat: "cms" as const },
  { re: /shopify/i, name: "Shopify", cat: "cms" as const },
  { re: /wix/i, name: "Wix", cat: "cms" as const },
  { re: /squarespace/i, name: "Squarespace", cat: "cms" as const },
  { re: /webflow/i, name: "Webflow", cat: "cms" as const },
  { re: /drupal/i, name: "Drupal", cat: "cms" as const },
  { re: /next\.js/i, name: "Next.js", cat: "framework" as const },
  { re: /react/i, name: "React", cat: "framework" as const },
  { re: /vue/i, name: "Vue.js", cat: "framework" as const },
  { re: /angular/i, name: "Angular", cat: "framework" as const },
  { re: /tailwind/i, name: "Tailwind CSS", cat: "css" as const },
  { re: /bootstrap/i, name: "Bootstrap", cat: "css" as const },
  { re: /cloudflare/i, name: "Cloudflare", cat: "cdn" as const },
  { re: /algolia/i, name: "Algolia", cat: "other" as const },
  { re: /intercom/i, name: "Intercom", cat: "other" as const },
  { re: /hubspot/i, name: "HubSpot", cat: "other" as const },
  { re: /stripe/i, name: "Stripe", cat: "other" as const },
  { re: /google.*analytics|gtag/i, name: "Google Analytics", cat: "analytics" as const },
  { re: /facebook.*pixel|fbq/i, name: "Facebook Pixel", cat: "analytics" as const },
  { re: /hotjar/i, name: "Hotjar", cat: "analytics" as const },
  { re: /clarity/i, name: "Microsoft Clarity", cat: "analytics" as const },
  { re: /jquery/i, name: "jQuery", cat: "javascript" as const },
];

function detectTechnologies(content: string): DeepCrawlTechnology[] {
  const found = new Set<string>();
  return TECHS.filter(t => t.re.test(content) && !found.has(t.name) && found.add(t.name))
    .map(t => ({ name: t.name, category: t.cat, confidence: 70 }));
}

function mergeTechs(map: Map<string, DeepCrawlTechnology>, techs: DeepCrawlTechnology[]) {
  for (const t of techs) {
    const e = map.get(t.name);
    if (e) e.confidence = Math.max(e.confidence, t.confidence);
    else map.set(t.name, { ...t });
  }
}
