import { z } from "zod";

const blockedHostnames = new Set(["localhost", "localhost.localdomain"]);

export type NormalizedWebsiteUrl = {
  websiteUrl: string;
  normalizedDomain: string;
};

export const websiteUrlSchema = z
  .string()
  .trim()
  .min(1, "Website URL is required")
  .max(2048, "Website URL is too long")
  .superRefine((value, ctx) => {
    const result = normalizeWebsiteUrl(value);

    if (!result.ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: result.error
      });
    }
  });

export function normalizeWebsiteUrl(input: string):
  | { ok: true; value: NormalizedWebsiteUrl }
  | { ok: false; error: string } {
  let parsed: URL;

  try {
    parsed = new URL(input.trim());
  } catch {
    return { ok: false, error: "Enter a full URL including https:// or http://" };
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return { ok: false, error: "Only http and https URLs are supported" };
  }

  if (parsed.username || parsed.password) {
    return { ok: false, error: "URLs with embedded credentials are not allowed" };
  }

  parsed.hash = "";

  const hostname = parsed.hostname.toLowerCase().replace(/\.$/, "");

  if (!hostname || isBlockedHostname(hostname) || isPrivateOrInternalIp(hostname)) {
    return { ok: false, error: "Local, private, or internal URLs are not allowed" };
  }

  parsed.hostname = hostname;

  const pathname = parsed.pathname === "/" ? "" : parsed.pathname.replace(/\/+$/, "");
  parsed.pathname = pathname || "/";

  return {
    ok: true,
    value: {
      websiteUrl: parsed.toString(),
      normalizedDomain: stripWww(hostname)
    }
  };
}

export function isBlockedHostname(hostname: string) {
  if (blockedHostnames.has(hostname)) {
    return true;
  }

  return hostname.endsWith(".localhost") || hostname.endsWith(".local") || hostname.endsWith(".internal");
}

export function stripWww(hostname: string) {
  return hostname.startsWith("www.") ? hostname.slice(4) : hostname;
}

export function isPrivateOrInternalIp(hostname: string) {
  const normalized = hostname.replace(/^\[|\]$/g, "");

  if (isPrivateIpv4(normalized)) {
    return true;
  }

  return isPrivateIpv6(normalized);
}

function isPrivateIpv4(value: string) {
  const parts = value.split(".");

  if (parts.length !== 4) {
    return false;
  }

  const octets = parts.map((part) => {
    if (!/^\d+$/.test(part)) {
      return Number.NaN;
    }

    return Number(part);
  });

  if (octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return false;
  }

  const [a, b] = octets;

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 224 && b === 0) ||
    a >= 240
  );
}

function isPrivateIpv6(value: string) {
  const lower = value.toLowerCase();

  if (!lower.includes(":")) {
    return false;
  }

  return (
    lower === "::1" ||
    lower === "::" ||
    lower.startsWith("fc") ||
    lower.startsWith("fd") ||
    lower.startsWith("fe80:") ||
    lower.startsWith("::ffff:127.") ||
    lower.startsWith("::ffff:10.") ||
    lower.startsWith("::ffff:192.168.")
  );
}
