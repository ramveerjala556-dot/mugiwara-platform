import OpenAI from "openai";
import { serverEnv } from "@/lib/env";
import { DEFAULT_MODELS, estimateCost, estimateTokens } from "../pricing";
import type { AIProvider, GenerateOptions, GenerateResult } from "../types";
import { extractJson } from "./claude";

/** OpenAI provider (GPT-4o family). Optional — enabled when a key is present. */
export class OpenAIProvider implements AIProvider {
  readonly id = "openai" as const;
  readonly defaultModel = DEFAULT_MODELS.openai;
  private client: OpenAI | null = null;

  isConfigured(): boolean {
    return Boolean(serverEnv().openaiApiKey);
  }

  private getClient(): OpenAI {
    if (!this.client) {
      this.client = new OpenAI({ apiKey: serverEnv().openaiApiKey });
    }
    return this.client;
  }

  estimateTokens(text: string): number {
    return estimateTokens(text);
  }

  async generate(options: GenerateOptions): Promise<GenerateResult> {
    const model = this.defaultModel;
    const client = this.getClient();

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
    if (options.system) messages.push({ role: "system", content: options.system });
    for (const m of options.messages) {
      if (m.role === "system") {
        messages.push({ role: "system", content: m.content });
      } else {
        messages.push({ role: m.role, content: m.content });
      }
    }

    const response = await client.chat.completions.create(
      {
        model,
        messages,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens ?? 4096,
        ...(options.json ? { response_format: { type: "json_object" as const } } : {}),
      },
      { signal: options.signal },
    );

    const text = response.choices[0]?.message?.content ?? "";
    const tokensIn = response.usage?.prompt_tokens ?? 0;
    const tokensOut = response.usage?.completion_tokens ?? 0;

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
