import { z } from "zod";
import { websiteUrlSchema } from "./url";

export const startAuditSchema = z.object({
  websiteUrl: websiteUrlSchema
});

export const submitEmailSchema = z.object({
  auditRequestId: z.string().trim().min(8, "Audit request is required").max(128),
  email: z
    .string()
    .trim()
    .email("Enter a valid email")
    .max(320)
    .transform((email) => email.toLowerCase()),
  name: z.string().trim().max(120).optional().or(z.literal("")),
  company: z.string().trim().max(160).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  consentToContact: z.literal(true, {
    errorMap: () => ({ message: "Consent is required before saving your report" })
  })
});

export type StartAuditInput = z.infer<typeof startAuditSchema>;
export type SubmitEmailInput = z.infer<typeof submitEmailSchema>;
