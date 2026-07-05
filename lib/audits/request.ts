import { createHash } from "crypto";

export function getClientIp(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = headers.get("x-real-ip")?.trim();

  return forwarded || realIp || "unknown";
}

export function hashIp(ip: string) {
  const salt = process.env.IP_HASH_SALT || "zybe-audit-tool-dev";

  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

export function safeUserAgent(headers: Headers) {
  const userAgent = headers.get("user-agent") || undefined;

  return userAgent?.slice(0, 300);
}
