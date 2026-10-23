/** Shared types for the pluggable AI provider layer. */

export type ProviderId = "claude" | "openai" | "gemini";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GenerateOptions {
  /** System prompt / instructions for the model. */
  system?: string;
  /** Conversation turns. */
  messages: ChatMessage[];
  /** Sampling temperature. Defaults are provider-specific. */
  temperature?: number;
  /** Hard cap on output tokens. */
  maxTokens?: number;
  /**
   * Ask the provider to return strict JSON. Providers that support a native
   * JSON mode use it; others fall back to prompt instruction + parsing.
   */
  json?: boolean;
  /** Abort signal so long runs can be cancelled. */
  signal?: AbortSignal;
}

export interface GenerateResult {
  text: string;
  provider: ProviderId;
  model: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  /** Parsed JSON when `json: true` was requested and parsing succeeded. */
  json?: unknown;
}

export interface AIProvider {
  readonly id: ProviderId;
  readonly defaultModel: string;
  /** Whether this provider has credentials configured. */
  isConfigured(): boolean;
  generate(options: GenerateOptions): Promise<GenerateResult>;
  /** Rough token estimate used for pre-flight cost guards. */
  estimateTokens(text: string): number;
}
