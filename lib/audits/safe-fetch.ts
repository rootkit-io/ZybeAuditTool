import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { parseHomepageHtml } from "./html-signals";
import type { HomepageObservedSignals } from "./types";
import { isPrivateOrInternalIp, normalizeWebsiteUrl } from "./url";

const defaultTimeoutMs = 5_000;
const wellKnownTimeoutMs = 1_500;
const maxRedirects = 3;
export const maxHomepageHtmlBytes = 256_000;

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;
type DnsLookupLike = (
  hostname: string,
  options: { all: true; verbatim: true }
) => Promise<Array<{ address: string; family: number }>>;

type SafeFetchOptions = {
  fetchImpl?: FetchLike;
  dnsLookup?: DnsLookupLike;
  timeoutMs?: number;
  now?: () => Date;
};

type WellKnownAvailability = {
  robotTxtAvailable?: boolean;
  sitemapXmlAvailable?: boolean;
};

export async function safeFetchHomepage(
  websiteUrl: string,
  options: SafeFetchOptions = {}
): Promise<HomepageObservedSignals> {
  const fetchImpl = options.fetchImpl || fetch;
  const dnsLookup = options.dnsLookup || lookup;
  const now = options.now || (() => new Date());
  const timeoutMs = options.timeoutMs || defaultTimeoutMs;
  const requestedUrl = toHomepageUrl(websiteUrl);
  const usesHttps = requestedUrl.startsWith("https://");

  try {
    await assertSafeNetworkTarget(requestedUrl, dnsLookup);

    const responseResult = await fetchWithRedirects(requestedUrl, {
      fetchImpl,
      dnsLookup,
      timeoutMs
    });
    const finalUrl = responseResult.finalUrl;
    const wellKnown = await checkWellKnownAvailability(finalUrl, { fetchImpl, dnsLookup }).catch(() => ({}));
    const contentType = responseResult.response.headers.get("content-type") || undefined;
    const contentEncoding = responseResult.response.headers.get("content-encoding") || undefined;
    const server = responseResult.response.headers.get("server") || undefined;
    const xFrameOptions = responseResult.response.headers.get("x-frame-options") || undefined;
    const csp = responseResult.response.headers.get("content-security-policy") || undefined;

    // Determine if compression is used
    const hasCompression = contentEncoding !== undefined && contentEncoding.length > 0;

    const redirectUrl = new URL(finalUrl);
    const redirectUsesHttps = redirectUrl.protocol === "https:";

    const baseSignals = {
      requestedUrl,
      finalUrl: sanitizeObservedUrl(finalUrl),
      statusCode: responseResult.response.status,
      redirected: responseResult.redirectCount > 0,
      redirectCount: responseResult.redirectCount,
      contentType,
      htmlSizeLimitBytes: maxHomepageHtmlBytes,
      // HTTP header signals (100% confirmed)
      usesHttps: usesHttps && redirectUsesHttps,
      hasCompression,
      serverHeader: server,
      xFrameOptionsHeader: xFrameOptions,
      contentSecurityPolicyHeader: csp,
      checkedAt: now().toISOString(),
      ...wellKnown
    };

    if (!responseResult.response.ok) {
      return {
        ...baseSignals,
        fetchStatus: "failed",
        reachable: true,
        failureReason: `status_${responseResult.response.status}`
      } as HomepageObservedSignals;
    }

    if (contentType && !contentType.toLowerCase().includes("text/html")) {
      return {
        ...baseSignals,
        fetchStatus: "failed",
        reachable: true,
        failureReason: "non_html_response"
      } as HomepageObservedSignals;
    }

    const htmlResult = await readLimitedText(responseResult.response, maxHomepageHtmlBytes);

    if (!htmlResult.ok) {
      return {
        ...baseSignals,
        fetchStatus: "failed",
        reachable: true,
        htmlSizeBytes: htmlResult.bytesRead,
        failureReason: "html_size_limit_exceeded"
      } as HomepageObservedSignals;
    }

    // Parse HTML for all signals
    const htmlSignals = parseHomepageHtml(htmlResult.text, finalUrl);

    return {
      ...baseSignals,
      ...htmlSignals,
      fetchStatus: "success",
      reachable: true,
      htmlSizeBytes: htmlResult.bytesRead
    } as HomepageObservedSignals;
  } catch (error) {
    return {
      fetchStatus: "failed",
      reachable: false,
      requestedUrl,
      redirected: false,
      redirectCount: 0,
      htmlSizeLimitBytes: maxHomepageHtmlBytes,
      usesHttps,
      hasCompression: false,
      checkedAt: now().toISOString(),
      failureReason: toFailureReason(error)
    } as HomepageObservedSignals;
  }
}

async function fetchWithRedirects(
  initialUrl: string,
  {
    fetchImpl,
    dnsLookup,
    timeoutMs
  }: {
    fetchImpl: FetchLike;
    dnsLookup: DnsLookupLike;
    timeoutMs: number;
  }
) {
  let currentUrl = initialUrl;

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
    await assertSafeNetworkTarget(currentUrl, dnsLookup);

    const response = await fetchImpl(currentUrl, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
        "user-agent": "ZybeSocialAuditBot/1.0 (+https://zybesocial.com)"
      }
    });

    if (!isRedirectStatus(response.status)) {
      await assertSafeNetworkTarget(currentUrl, dnsLookup);
      return { response, finalUrl: currentUrl, redirectCount };
    }

    const location = response.headers.get("location");

    if (!location) {
      return { response, finalUrl: currentUrl, redirectCount };
    }

    if (redirectCount === maxRedirects) {
      throw new Error("redirect_limit_exceeded");
    }

    currentUrl = new URL(location, currentUrl).toString();
    assertSafeUrl(currentUrl);
  }

  throw new Error("redirect_limit_exceeded");
}

async function checkWellKnownAvailability(
  finalUrl: string,
  {
    fetchImpl,
    dnsLookup
  }: {
    fetchImpl: FetchLike;
    dnsLookup: DnsLookupLike;
  }
): Promise<WellKnownAvailability> {
  const origin = new URL(finalUrl).origin;
  const [robotsTxtAvailable, sitemapXmlAvailable] = await Promise.all([
    checkWellKnownUrl(`${origin}/robots.txt`, fetchImpl, dnsLookup),
    checkWellKnownUrl(`${origin}/sitemap.xml`, fetchImpl, dnsLookup)
  ]);

  return { robotTxtAvailable: robotsTxtAvailable, sitemapXmlAvailable };
}

async function checkWellKnownUrl(url: string, fetchImpl: FetchLike, dnsLookup: DnsLookupLike) {
  try {
    await assertSafeNetworkTarget(url, dnsLookup);
    const response = await fetchImpl(url, {
      method: "HEAD",
      redirect: "manual",
      signal: AbortSignal.timeout(wellKnownTimeoutMs),
      headers: {
        "user-agent": "ZybeSocialAuditBot/1.0 (+https://zybesocial.com)"
      }
    });

    return response.ok;
  } catch {
    return false;
  }
}

async function readLimitedText(response: Response, maxBytes: number) {
  const reader = response.body?.getReader();

  if (!reader) {
    const text = await response.text();
    const bytesRead = new TextEncoder().encode(text).byteLength;

    return bytesRead > maxBytes ? { ok: false as const, bytesRead } : { ok: true as const, text, bytesRead };
  }

  const chunks: Uint8Array[] = [];
  let bytesRead = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    bytesRead += value.byteLength;

    if (bytesRead > maxBytes) {
      await reader.cancel();
      return { ok: false as const, bytesRead };
    }

    chunks.push(value);
  }

  return {
    ok: true as const,
    text: new TextDecoder("utf-8", { fatal: false }).decode(concatChunks(chunks, bytesRead)),
    bytesRead
  };
}

async function assertSafeNetworkTarget(url: string, dnsLookup: DnsLookupLike) {
  const parsed = assertSafeUrl(url);
  const hostname = parsed.hostname.replace(/^\[|\]$/g, "");

  if (isIP(hostname) !== 0) {
    if (isPrivateOrInternalIp(hostname)) {
      throw new Error("blocked_internal_target");
    }

    return parsed;
  }

  const addresses = await dnsLookup(hostname, { all: true, verbatim: true });

  if (addresses.some((address) => isPrivateOrInternalIp(address.address))) {
    throw new Error("blocked_internal_target");
  }

  return parsed;
}

function assertSafeUrl(url: string) {
  const normalized = normalizeWebsiteUrl(url);

  if (!normalized.ok) {
    throw new Error("blocked_internal_target");
  }

  return new URL(normalized.value.websiteUrl);
}

function toHomepageUrl(websiteUrl: string) {
  const parsed = new URL(websiteUrl);
  parsed.pathname = "/";
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString();
}

function sanitizeObservedUrl(url: string) {
  const parsed = new URL(url);
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString();
}

function concatChunks(chunks: Uint8Array[], totalLength: number) {
  const output = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return output;
}

function isRedirectStatus(status: number) {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

function toFailureReason(error: unknown) {
  if (error && typeof error === "object") {
    const name = "name" in error && typeof error.name === "string" ? error.name : "";

    if (name === "TimeoutError" || name === "AbortError") {
      return "timeout";
    }

    if (error instanceof Error) {
      return error.message || "fetch_failed";
    }
  }

  if (error instanceof Error) {
    return error.message || "fetch_failed";
  }

  return "fetch_failed";
}
