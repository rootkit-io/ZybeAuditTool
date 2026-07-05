import { z } from "zod";

const serverEnvSchema = z
  .object({
    NODE_ENV: z.string().optional(),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required").optional(),
    DIRECT_URL: z.string().min(1, "DIRECT_URL is required for Prisma migrations").optional(),
    IP_HASH_SALT: z.string().min(24, "IP_HASH_SALT must be at least 24 characters").optional()
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
