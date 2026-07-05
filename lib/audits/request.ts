import { createHash } from "crypto";
import { getIpHashSalt } from "@/lib/env";

export function getClientIp(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = headers.get("x-real-ip")?.trim();

  return forwarded || realIp || "unknown";
}

export function hashIp(ip: string) {
  const salt = getIpHashSalt();

  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

export function safeUserAgent(headers: Headers) {
  const userAgent = headers.get("user-agent") || undefined;

  return userAgent?.slice(0, 300);
}
