import { z } from "zod";

const optionalNonEmptyString = (message: string) =>
  z.preprocess((value) => (value === "" ? undefined : value), z.string().min(1, message).optional());

const serverEnvSchema = z
  .object({
    NODE_ENV: z.string().optional(),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required").optional(),
    DIRECT_URL: z.string().min(1, "DIRECT_URL is required for Prisma migrations").optional(),
    IP_HASH_SALT: z.string().min(24, "IP_HASH_SALT must be at least 24 characters").optional(),
    AI_REPORT_PROVIDER: z.preprocess((value) => (value === "" ? undefined : value), z.enum(["openai"]).optional()),
    OPENAI_API_KEY: optionalNonEmptyString("OPENAI_API_KEY is required when AI_REPORT_PROVIDER=openai"),
    OPENAI_MODEL: optionalNonEmptyString("OPENAI_MODEL is required when AI_REPORT_PROVIDER=openai"),
    OPENAI_BASE_URL: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.string().url("OPENAI_BASE_URL must be a valid URL").optional()
    ),
    RESEND_API_KEY: optionalNonEmptyString("RESEND_API_KEY is required for email delivery"),
    FROM_EMAIL: optionalNonEmptyString("FROM_EMAIL is required for email delivery"),
    INTERNAL_LEAD_NOTIFY_EMAIL: optionalNonEmptyString("INTERNAL_LEAD_NOTIFY_EMAIL is required for email delivery"),
    APP_BASE_URL: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.string().url("APP_BASE_URL must be a valid URL").optional()
    )
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === "production" && !env.DATABASE_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["DATABASE_URL"],
        message: "DATABASE_URL is required in production"
      });
    }

    if (env.NODE_ENV === "production" && !env.IP_HASH_SALT) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["IP_HASH_SALT"],
        message: "IP_HASH_SALT is required in production"
      });
    }

    if (env.AI_REPORT_PROVIDER === "openai" && !env.OPENAI_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["OPENAI_API_KEY"],
        message: "OPENAI_API_KEY is required when AI_REPORT_PROVIDER=openai"
      });
    }

    if (env.AI_REPORT_PROVIDER === "openai" && !env.OPENAI_MODEL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["OPENAI_MODEL"],
        message: "OPENAI_MODEL is required when AI_REPORT_PROVIDER=openai"
      });
    }

    const anyEmailEnv =
      Boolean(env.RESEND_API_KEY) ||
      Boolean(env.FROM_EMAIL) ||
      Boolean(env.INTERNAL_LEAD_NOTIFY_EMAIL) ||
      Boolean(env.APP_BASE_URL);
    const requireEmailEnv = anyEmailEnv;

    if (requireEmailEnv && !env.RESEND_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["RESEND_API_KEY"],
        message: "RESEND_API_KEY is required for email delivery"
      });
    }

    if (requireEmailEnv && !env.FROM_EMAIL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["FROM_EMAIL"],
        message: "FROM_EMAIL is required for email delivery"
      });
    }

    if (requireEmailEnv && !env.INTERNAL_LEAD_NOTIFY_EMAIL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["INTERNAL_LEAD_NOTIFY_EMAIL"],
        message: "INTERNAL_LEAD_NOTIFY_EMAIL is required for email delivery"
      });
    }

    if (requireEmailEnv && !env.APP_BASE_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["APP_BASE_URL"],
        message: "APP_BASE_URL is required for email delivery"
      });
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
