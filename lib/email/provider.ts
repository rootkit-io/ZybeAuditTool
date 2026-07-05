import { Resend } from "resend";
import { getEmailConfig } from "@/lib/env";

export type SendEmailInput = {
  to: string;
  from: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

export type SendEmailResult = {
  provider: "resend" | "disabled";
  status: "sent" | "failed" | "skipped";
  providerMessageId?: string;
  errorCode?: string;
};

export type EmailProvider = {
  send(input: SendEmailInput): Promise<SendEmailResult>;
};

export function createEmailProviderFromEnv(): EmailProvider | null {
  const config = getEmailConfig();

  if (!config) {
    return null;
  }

  return new ResendEmailProvider(config.resendApiKey);
}

export class ResendEmailProvider implements EmailProvider {
  constructor(private readonly apiKey: string) {}

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const resend = new Resend(this.apiKey);
    const response = await resend.emails.send({
      from: input.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo
    });

    if (response.error) {
      return {
        provider: "resend",
        status: "failed",
        errorCode: response.error.name || "resend_error"
      };
    }

    return {
      provider: "resend",
      status: "sent",
      providerMessageId: response.data?.id
    };
  }
}
