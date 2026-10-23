import Anthropic from "@anthropic-ai/sdk";
import { serverEnv } from "@/lib/env";
import { DEFAULT_MODELS, estimateCost, estimateTokens } from "../pricing";
import type { AIProvider, GenerateOptions, GenerateResult } from "../types";

/** Anthropic Claude provider — the default engine for the MUGIWARA crew. */
export class ClaudeProvider implements AIProvider {
  readonly id = "claude" as const;
  readonly defaultModel = DEFAULT_MODELS.claude;
  private client: Anthropic | null = null;

  isConfigured(): boolean {
    return Boolean(serverEnv().anthropicApiKey);
  }

  private getClient(): Anthropic {
    if (!this.client) {
      this.client = new Anthropic({ apiKey: serverEnv().anthropicApiKey });
    }
    return this.client;
  }

  estimateTokens(text: string): number {
    return estimateTokens(text);
  }

  async generate(options: GenerateOptions): Promise<GenerateResult> {
    const model = this.defaultModel;
    const client = this.getClient();

    // Anthropic takes the system prompt as a top-level field, not a message.
    const system = options.json
      ? `${options.system ?? ""}\n\nRespond with a single valid JSON object and nothing else.`
      : options.system;

    const response = await client.messages.create(
      {
        model,
        max_tokens: options.maxTokens ?? 4096,
        temperature: options.temperature ?? 0.2,
        system,
        messages: options.messages
          .filter((m) => m.role !== "system")
          .map((m) => ({
            role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
            content: m.content,
          })),
      },
      { signal: options.signal },
    );

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    const tokensIn = response.usage.input_tokens;
    const tokensOut = response.usage.output_tokens;

    let json: unknown;
    if (options.json) {
      try {
        json = JSON.parse(extractJson(text));
      } catch {
        json = undefined;
      }
    }

    return {
      text,
      json,
      provider: this.id,
      model,
      tokensIn,
      tokensOut,
      costUsd: estimateCost(model, tokensIn, tokensOut),
    };
  }
}

/** Pull the first JSON object/array out of a possibly chatty response. */
export function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.search(/[[{]/);
  if (start === -1) return candidate.trim();
  const openChar = candidate[start];
  const closeChar = openChar === "{" ? "}" : "]";
  const end = candidate.lastIndexOf(closeChar);
  if (end === -1) return candidate.trim();
  return candidate.slice(start, end + 1);
}
