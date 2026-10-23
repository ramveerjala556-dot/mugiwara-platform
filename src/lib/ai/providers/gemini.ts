import { GoogleGenerativeAI } from "@google/generative-ai";
import { serverEnv } from "@/lib/env";
import { DEFAULT_MODELS, estimateCost, estimateTokens } from "../pricing";
import type { AIProvider, GenerateOptions, GenerateResult } from "../types";
import { extractJson } from "./claude";

/** Google Gemini provider. Optional — enabled when a key is present. */
export class GeminiProvider implements AIProvider {
  readonly id = "gemini" as const;
  readonly defaultModel = DEFAULT_MODELS.gemini;
  private client: GoogleGenerativeAI | null = null;

  isConfigured(): boolean {
    return Boolean(serverEnv().googleApiKey);
  }

  private getClient(): GoogleGenerativeAI {
    if (!this.client) {
      this.client = new GoogleGenerativeAI(serverEnv().googleApiKey);
    }
    return this.client;
  }

  estimateTokens(text: string): number {
    return estimateTokens(text);
  }

  async generate(options: GenerateOptions): Promise<GenerateResult> {
    const model = this.defaultModel;
    const client = this.getClient();

    const generativeModel = client.getGenerativeModel({
      model,
      ...(options.system ? { systemInstruction: options.system } : {}),
      generationConfig: {
        temperature: options.temperature ?? 0.2,
        maxOutputTokens: options.maxTokens ?? 4096,
        ...(options.json ? { responseMimeType: "application/json" } : {}),
      },
    });

    const contents = options.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const result = await generativeModel.generateContent({ contents });
    const text = result.response.text();
    const usage = result.response.usageMetadata;
    const tokensIn = usage?.promptTokenCount ?? 0;
    const tokensOut = usage?.candidatesTokenCount ?? 0;

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
