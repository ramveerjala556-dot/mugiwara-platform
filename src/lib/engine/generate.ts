import { configuredProviders, resolveProvider } from "@/lib/ai";
import type { ProviderId } from "@/lib/ai/types";
import { assertSafeRelativePath } from "@/lib/security/guards";
import { analyzePrompt, type SiteSpec } from "./spec";
import { buildStaticSite, languageForPath, type GeneratedFile } from "./templates";

export interface GenerationResult {
  files: GeneratedFile[];
  summary: string;
  /** True only when an AI provider actually produced the files. */
  usedAI: boolean;
  provider: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  spec: SiteSpec;
}

const ALLOWED_EXTENSIONS = ["html", "css", "js", "json", "md", "txt", "svg"];

/** Keep only files we are willing to store, with safe project-relative paths. */
export function sanitizeFiles(raw: unknown): GeneratedFile[] {
  if (!Array.isArray(raw)) return [];
  const files: GeneratedFile[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const path = typeof record.path === "string" ? record.path.replace(/^\/+/, "").trim() : "";
    const content = typeof record.content === "string" ? record.content : "";
    if (!path || !content) continue;
    const ext = path.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXTENSIONS.includes(ext)) continue;
    try {
      assertSafeRelativePath(path);
    } catch {
      continue; // reject traversal attempts outright
    }
    files.push({ path, content, language: languageForPath(path) });
  }
  return files;
}

function systemPromptFor(spec: SiteSpec, modifying: boolean): string {
  return [
    "You are the Coder agent in the MUGIWARA crew.",
    modifying
      ? "You are EDITING an existing static website. Return the COMPLETE updated contents of every file that changes."
      : "You are creating a brand-new static website.",
    "",
    "Hard requirements:",
    "- Output ONLY JSON, no prose: {\"summary\": string, \"files\": [{\"path\": string, \"content\": string}]}.",
    "- Produce a dependency-free static site that runs by opening index.html directly.",
    "- Always include index.html, styles.css and app.js.",
    "- Use CSS custom properties for the theme; no external CDNs or fonts.",
    "- Responsive, accessible (semantic landmarks, labels, focus states, prefers-reduced-motion).",
    "- Real, working behaviour — never placeholders or pseudo-code. No secrets, no API keys.",
    "",
    "Design brief derived from the user's request:",
    `- Project name: ${spec.name}`,
    `- Tagline: ${spec.tagline}`,
    `- Archetype: ${spec.archetype}`,
    `- Palette: primary ${spec.palette.primary}, accent ${spec.palette.accent}, background ${spec.palette.bg}, surface ${spec.palette.surface}, text ${spec.palette.text}`,
    `- Suggested sections: ${spec.navItems.join(", ")}`,
    `- Requested capabilities: ${spec.tags.join(", ") || "none specified"}`,
  ].join("\n");
}

/**
 * Generate (or regenerate) an application from a prompt.
 *
 * Uses an AI provider when one is configured; otherwise falls back to the
 * built-in deterministic generator, which still produces a real, working site.
 * The caller can always tell which path ran via `usedAI`.
 */
export async function generateApplication(options: {
  prompt: string;
  existingFiles?: GeneratedFile[];
  providerId?: ProviderId;
  signal?: AbortSignal;
}): Promise<GenerationResult> {
  const spec = analyzePrompt(options.prompt);
  const modifying = Boolean(options.existingFiles?.length);

  if (configuredProviders().length > 0) {
    try {
      const provider = resolveProvider(options.providerId);
      const fileDump = (options.existingFiles ?? [])
        .map((f) => `--- ${f.path} ---\n${f.content}`)
        .join("\n\n")
        .slice(0, 60_000);

      const result = await provider.generate({
        system: systemPromptFor(spec, modifying),
        messages: [
          {
            role: "user",
            content: modifying
              ? `Current files:\n${fileDump}\n\nRequested change:\n${options.prompt}`
              : options.prompt,
          },
        ],
        json: true,
        temperature: 0.3,
        maxTokens: 8192,
        signal: options.signal,
      });

      const parsed = result.json as { summary?: string; files?: unknown } | undefined;
      const files = sanitizeFiles(parsed?.files);
      if (files.length > 0) {
        return {
          files,
          summary: parsed?.summary ?? "Application generated.",
          usedAI: true,
          provider: result.provider,
          model: result.model,
          tokensIn: result.tokensIn,
          tokensOut: result.tokensOut,
          costUsd: result.costUsd,
          spec,
        };
      }
      // Model answered but produced nothing usable — fall through to templates.
    } catch {
      // Provider error (bad key, rate limit, timeout) — fall through to templates.
    }
  }

  return {
    files: buildStaticSite(spec),
    summary: `Built a ${spec.archetype} site for “${spec.name}” using the built-in generator.`,
    usedAI: false,
    provider: "template",
    model: "mugiwara-static-v1",
    tokensIn: 0,
    tokensOut: 0,
    costUsd: 0,
    spec,
  };
}

/** Short, human description of what was produced — used in chat and logs. */
export function describeGeneration(result: GenerationResult): string {
  const list = result.files.map((f) => f.path).join(", ");
  return result.usedAI
    ? `Generated ${result.files.length} files with ${result.provider} (${result.model}): ${list}.`
    : `Generated ${result.files.length} files with the built-in generator: ${list}.`;
}
