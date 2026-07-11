import type { AiReportPrompt } from "./ai-report-prompt";

export type AuditAiProvider = {
  generateReportJson(prompt: AiReportPrompt): Promise<unknown>;
};

type OpenAiChatCompletion = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1_000;

export function createAuditAiProviderFromEnv(): AuditAiProvider | null {
  if (process.env.AI_REPORT_PROVIDER !== "openai") {
    return null;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;

  if (!apiKey || !model) {
    return null;
  }

  return new OpenAiAuditProvider({
    apiKey,
    model,
    baseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com"
  });
}

export class OpenAiAuditProvider implements AuditAiProvider {
  constructor(
    private readonly config: {
      apiKey: string;
      model: string;
      baseUrl: string;
      fetchImpl?: typeof fetch;
      timeoutMs?: number;
    }
  ) {}

  async generateReportJson(prompt: AiReportPrompt): Promise<unknown> {
    const fetchImpl = this.config.fetchImpl || fetch;
    const timeoutMs = this.config.timeoutMs || 30_000; // 30s default (was 8s - too low for Mistral!)

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetchImpl(
          `${this.config.baseUrl.replace(/\/+$/, "")}/v1/chat/completions`,
          {
            method: "POST",
            headers: {
              authorization: `Bearer ${this.config.apiKey}`,
              "content-type": "application/json"
            },
            signal: AbortSignal.timeout(timeoutMs),
            body: JSON.stringify({
              model: this.config.model,
              temperature: 0.2,
              response_format: { type: "json_object" },
              messages: [
                { role: "system", content: prompt.system },
                { role: "user", content: prompt.user }
              ]
            })
          }
        );

        if (response.status === 429 && attempt < MAX_RETRIES) {
          // Rate limited — wait with exponential backoff and retry
          const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
          await sleep(delay);
          continue;
        }

        if (!response.ok) {
          // Non-retryable or last attempt
          if (attempt < MAX_RETRIES && response.status >= 500) {
            const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
            await sleep(delay);
            continue;
          }
          throw new Error(`openai_http_${response.status}`);
        }

        const data = (await response.json()) as OpenAiChatCompletion;
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
          throw new Error("openai_empty_response");
        }

        return JSON.parse(content);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on JSON parse errors (client's fault)
        if (lastError.message.includes("JSON") || lastError.message.includes("parse")) {
          throw lastError;
        }

        // Retry on network errors & timeouts with exponential backoff
        if (attempt < MAX_RETRIES) {
          const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
          await sleep(delay);
          continue;
        }
      }
    }

    throw lastError || new Error("openai_max_retries_exceeded");
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
