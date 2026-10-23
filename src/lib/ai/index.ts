import { serverEnv } from "@/lib/env";
import { ClaudeProvider } from "./providers/claude";
import { OpenAIProvider } from "./providers/openai";
import { GeminiProvider } from "./providers/gemini";
import type { AIProvider, ProviderId } from "./types";

export * from "./types";
export * from "./pricing";

const registry: Record<ProviderId, AIProvider> = {
  claude: new ClaudeProvider(),
  openai: new OpenAIProvider(),
  gemini: new GeminiProvider(),
};

export function getProvider(id?: ProviderId): AIProvider {
  const wanted = id ?? serverEnv().defaultProvider;
  return registry[wanted] ?? registry.claude;
}

/** Every provider that has credentials configured right now. */
export function configuredProviders(): ProviderId[] {
  return (Object.keys(registry) as ProviderId[]).filter((id) => registry[id].isConfigured());
}

/**
 * Pick a working provider: the requested one if configured, else the first
 * configured fallback, else the default (which will raise a clear error).
 */
export function resolveProvider(preferred?: ProviderId): AIProvider {
  const first = getProvider(preferred);
  if (first.isConfigured()) return first;
  const fallback = configuredProviders()[0];
  return fallback ? registry[fallback] : first;
}
