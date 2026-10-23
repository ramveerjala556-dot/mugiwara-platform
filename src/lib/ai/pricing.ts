import type { ProviderId } from "./types";

/**
 * Approximate public list prices, in USD per 1,000,000 tokens, as of early 2026.
 * These are ESTIMATES used only for the in-app cost guard and analytics — the
 * authoritative numbers are on each provider's pricing page. Update as needed.
 */
export interface ModelPricing {
  inputPerMillion: number;
  outputPerMillion: number;
}

export const PRICING: Record<string, ModelPricing> = {
  // Anthropic
  "claude-sonnet-4-5": { inputPerMillion: 3, outputPerMillion: 15 },
  "claude-haiku-4-5": { inputPerMillion: 1, outputPerMillion: 5 },
  // OpenAI
  "gpt-4o": { inputPerMillion: 2.5, outputPerMillion: 10 },
  "gpt-4o-mini": { inputPerMillion: 0.15, outputPerMillion: 0.6 },
  // Google
  "gemini-1.5-pro": { inputPerMillion: 1.25, outputPerMillion: 5 },
  "gemini-1.5-flash": { inputPerMillion: 0.075, outputPerMillion: 0.3 },
};

export const DEFAULT_MODELS: Record<ProviderId, string> = {
  claude: "claude-sonnet-4-5",
  openai: "gpt-4o",
  gemini: "gemini-1.5-flash",
};

/** Estimate USD cost from token counts. Unknown models fall back to a mid price. */
export function estimateCost(model: string, tokensIn: number, tokensOut: number): number {
  const price = PRICING[model] ?? { inputPerMillion: 3, outputPerMillion: 15 };
  return (
    (tokensIn / 1_000_000) * price.inputPerMillion +
    (tokensOut / 1_000_000) * price.outputPerMillion
  );
}

/** Cheap heuristic: ~4 characters per token for English/code. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
