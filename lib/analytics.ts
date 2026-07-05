type AnalyticsEventName =
  | "audit_started"
  | "audit_preview_created"
  | "email_submitted"
  | "report_generated"
  | "report_email_attempted"
  | "internal_email_attempted"
  | "report_viewed";

type AnalyticsProperties = Record<string, unknown>;

const sensitiveKeyPattern = /(email|phone|name|html|apiKey|token|secret|authorization)/i;

export function trackAnalyticsEvent(event: AnalyticsEventName, properties: AnalyticsProperties = {}) {
  console.info("analytics_event", {
    event,
    properties: sanitizeAnalyticsValue(properties),
    timestamp: new Date().toISOString()
  });
}

export function sanitizeAnalyticsValue(value: unknown): unknown {
  if (typeof value === "string") {
    return sanitizeString(value);
  }

  if (typeof value === "number" || typeof value === "boolean" || value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeAnalyticsValue(item));
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        sensitiveKeyPattern.test(key) ? "[redacted]" : sanitizeAnalyticsValue(item)
      ])
    );
  }

  return undefined;
}

function sanitizeString(value: string) {
  const withoutHtml = value.replace(/<[^>]*>/g, "").replace(/[<>]/g, "");

  try {
    const parsed = new URL(withoutHtml);
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return withoutHtml.length > 300 ? `${withoutHtml.slice(0, 300)}...` : withoutHtml;
  }
}
