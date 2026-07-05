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

  async generateReportJson(prompt: AiReportPrompt) {
    const fetchImpl = this.config.fetchImpl || fetch;
    const response = await fetchImpl(`${this.config.baseUrl.replace(/\/+$/, "")}/v1/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.config.apiKey}`,
        "content-type": "application/json"
      },
      signal: AbortSignal.timeout(this.config.timeoutMs || 8_000),
      body: JSON.stringify({
        model: this.config.model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: prompt.system },
          { role: "user", content: prompt.user }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`openai_http_${response.status}`);
    }

    const data = (await response.json()) as OpenAiChatCompletion;
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("openai_empty_response");
    }

    return JSON.parse(content);
  }
}
