import { z } from "zod";

const optionalNonEmptyString = (message: string) =>
  z.preprocess((value) => (value === "" ? undefined : value), z.string().min(1, message).optional());

const optionalUrl = (message: string) =>
  z.preprocess((value) => (value === "" ? undefined : value), z.string().url(message).optional());

const serverEnvSchema = z
  .object({
    NODE_ENV: z.string().optional(),
    DATABASE_URL: optionalNonEmptyString("DATABASE_URL is required"),
    DIRECT_URL: optionalNonEmptyString("DIRECT_URL is required for Prisma migrations"),
    IP_HASH_SALT: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.string().min(24, "IP_HASH_SALT must be at least 24 characters").optional()
    ),
    APP_BASE_URL: optionalUrl("APP_BASE_URL must be a valid URL"),
    BOOKING_URL: optionalUrl("BOOKING_URL must be a valid URL"),
    CONTACT_EMAIL: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.string().email("CONTACT_EMAIL must be a valid email").optional()
    ),
    CONTACT_URL: optionalUrl("CONTACT_URL must be a valid URL"),
    AI_REPORT_PROVIDER: z.preprocess((value) => (value === "" ? undefined : value), z.enum(["openai"]).optional()),
    OPENAI_API_KEY: optionalNonEmptyString("OPENAI_API_KEY is required when AI_REPORT_PROVIDER=openai"),
    OPENAI_MODEL: optionalNonEmptyString("OPENAI_MODEL is required when AI_REPORT_PROVIDER=openai"),
    OPENAI_BASE_URL: optionalUrl("OPENAI_BASE_URL must be a valid URL"),
    RESEND_API_KEY: optionalNonEmptyString("RESEND_API_KEY is required for email delivery"),
    FROM_EMAIL: optionalNonEmptyString("FROM_EMAIL is required for email delivery"),
    INTERNAL_LEAD_NOTIFY_EMAIL: optionalNonEmptyString("INTERNAL_LEAD_NOTIFY_EMAIL is required for email delivery"),
    UPSTASH_REDIS_REST_URL: optionalUrl("UPSTASH_REDIS_REST_URL must be a valid URL"),
    UPSTASH_REDIS_REST_TOKEN: optionalNonEmptyString("UPSTASH_REDIS_REST_TOKEN is required when UPSTASH_REDIS_REST_URL is set")
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === "production") {
      requireField(ctx, env.DATABASE_URL, "DATABASE_URL", "DATABASE_URL is required in production");
      requireField(ctx, env.DIRECT_URL, "DIRECT_URL", "DIRECT_URL is required in production");
      requireField(ctx, env.IP_HASH_SALT, "IP_HASH_SALT", "IP_HASH_SALT is required in production");
      requireField(ctx, env.APP_BASE_URL, "APP_BASE_URL", "APP_BASE_URL is required in production");
      requireField(ctx, env.BOOKING_URL, "BOOKING_URL", "BOOKING_URL is required in production");

      if (!env.CONTACT_EMAIL && !env.CONTACT_URL) {
        requireField(ctx, undefined, "CONTACT_EMAIL", "CONTACT_EMAIL or CONTACT_URL is required in production");
      }
    }

    if (env.AI_REPORT_PROVIDER === "openai") {
      requireField(ctx, env.OPENAI_API_KEY, "OPENAI_API_KEY", "OPENAI_API_KEY is required when AI_REPORT_PROVIDER=openai");
      requireField(ctx, env.OPENAI_MODEL, "OPENAI_MODEL", "OPENAI_MODEL is required when AI_REPORT_PROVIDER=openai");
    }

    const anyEmailEnv =
      Boolean(env.RESEND_API_KEY) ||
      Boolean(env.FROM_EMAIL) ||
      Boolean(env.INTERNAL_LEAD_NOTIFY_EMAIL);

    if (anyEmailEnv) {
      requireField(ctx, env.RESEND_API_KEY, "RESEND_API_KEY", "RESEND_API_KEY is required for email delivery");
      requireField(ctx, env.FROM_EMAIL, "FROM_EMAIL", "FROM_EMAIL is required for email delivery");
      requireField(
        ctx,
        env.INTERNAL_LEAD_NOTIFY_EMAIL,
        "INTERNAL_LEAD_NOTIFY_EMAIL",
        "INTERNAL_LEAD_NOTIFY_EMAIL is required for email delivery"
      );
      requireField(ctx, env.APP_BASE_URL, "APP_BASE_URL", "APP_BASE_URL is required for email delivery");
    }

    if (env.UPSTASH_REDIS_REST_URL && !env.UPSTASH_REDIS_REST_TOKEN) {
      requireField(
        ctx,
        undefined,
        "UPSTASH_REDIS_REST_TOKEN",
        "UPSTASH_REDIS_REST_TOKEN is required when UPSTASH_REDIS_REST_URL is set"
      );
    }

    if (env.UPSTASH_REDIS_REST_TOKEN && !env.UPSTASH_REDIS_REST_URL) {
      requireField(
        ctx,
        undefined,
        "UPSTASH_REDIS_REST_URL",
        "UPSTASH_REDIS_REST_URL is required when UPSTASH_REDIS_REST_TOKEN is set"
      );
    }
  });

export function validateServerEnv() {
  const parsed = serverEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    throw new Error(
      `Invalid server environment: ${parsed.error.issues.map((issue) => issue.path.join(".")).join(", ")}`
    );
  }
}

export function getIpHashSalt() {
  if (process.env.NODE_ENV === "production" && !process.env.IP_HASH_SALT) {
    throw new Error("Invalid server environment: IP_HASH_SALT");
  }

  return process.env.IP_HASH_SALT || "zybe-audit-tool-dev-only-salt";
}

export function getEmailConfig() {
  const config = {
    resendApiKey: process.env.RESEND_API_KEY || "",
    fromEmail: process.env.FROM_EMAIL || "",
    internalLeadNotifyEmail: process.env.INTERNAL_LEAD_NOTIFY_EMAIL || "",
    appBaseUrl: process.env.APP_BASE_URL || ""
  };

  if (
    !config.resendApiKey ||
    !config.fromEmail ||
    !config.internalLeadNotifyEmail ||
    !config.appBaseUrl
  ) {
    return null;
  }

  return config;
}

function requireField(ctx: z.RefinementCtx, value: unknown, path: string, message: string) {
  if (!value) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [path],
      message
    });
  }
}
