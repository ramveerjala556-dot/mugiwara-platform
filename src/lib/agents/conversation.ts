import { configuredProviders, resolveProvider } from "@/lib/ai";
import type { ProviderId } from "@/lib/ai/types";
import { analyzePrompt } from "@/lib/engine/spec";
import { acceptanceCriteria, buildPlan, clarifyingQuestions } from "./plan";
import type { PlannedTask } from "./types";

export interface CrewReply {
  /** Markdown-ish plain text shown in the chat panel. */
  content: string;
  questions: string[];
  acceptance: string[];
  tasks: PlannedTask[];
  /** Which crew member "speaks" in the UI. */
  agent: "navigator" | "architect" | "designer" | "researcher" | "coder" | "tester" | "guardian";
  usedAI: boolean;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  provider: string;
  model: string;
}

/**
 * The crew's answer to a prompt. It ALWAYS reflects the user's actual request:
 * it names the project, states the archetype it inferred, lists the plan it
 * will run, and asks only questions that genuinely affect the build.
 */
export async function crewRespond(options: {
  prompt: string;
  providerId?: ProviderId;
  signal?: AbortSignal;
}): Promise<CrewReply> {
  const spec = analyzePrompt(options.prompt);
  const tasks = buildPlan(spec);
  const questions = clarifyingQuestions(options.prompt, spec);
  const acceptance = acceptanceCriteria(spec);

  const header = [
    `**Navigator here.** I've read your request and broken it down.`,
    "",
    `**What I understood**`,
    `- Project: **${spec.name}**`,
    `- Type: a ${describeArchetype(spec.archetype)}`,
    `- Theme: ${spec.palette.name} (primary ${spec.palette.primary}, accent ${spec.palette.accent})`,
    `- Capabilities detected: ${spec.tags.join(", ") || "core page only"}`,
    "",
    `**Plan (${tasks.length} tasks)**`,
    ...tasks.map((t, i) => `${i + 1}. ${t.title} — _${t.agent}_`),
    "",
    `**Acceptance criteria**`,
    ...acceptance.map((c) => `- ${c}`),
  ];

  if (questions.length > 0) {
    header.push("", "**Before I build**", ...questions.map((q) => `- ${q}`));
  }
  header.push("", "Say **go** and I'll build it now — or answer any of the above and I'll adjust the plan.");

  const deterministic = header.join("\n");

  // If a provider is available, let the Navigator add a natural-language layer
  // on top of the deterministic structure (structure is never left to chance).
  if (configuredProviders().length > 0) {
    try {
      const provider = resolveProvider(options.providerId);
      const result = await provider.generate({
        system: [
          "You are the Navigator, planning lead of an AI software crew.",
          "The user has asked for something to be built. Respond with a SHORT, warm, concrete plan",
          "in plain text (no code). Mention what you understood, the approach, and any essential",
          "clarifying question. Do not invent requirements. Keep it under 180 words.",
        ].join(" "),
        messages: [
          {
            role: "user",
            content: `Request: ${options.prompt}\n\nInferred project name: ${spec.name}\nInferred type: ${spec.archetype}\nCapabilities: ${spec.tags.join(", ")}`,
          },
        ],
        temperature: 0.4,
        maxTokens: 600,
        signal: options.signal,
      });
      return {
        content: `${result.text.trim()}\n\n---\n\n${deterministic}`,
        questions,
        acceptance,
        tasks,
        agent: "navigator",
        usedAI: true,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        costUsd: result.costUsd,
        provider: result.provider,
        model: result.model,
      };
    } catch {
      // fall through to the deterministic reply
    }
  }

  return {
    content: deterministic,
    questions,
    acceptance,
    tasks,
    agent: "navigator",
    usedAI: false,
    tokensIn: 0,
    tokensOut: 0,
    costUsd: 0,
    provider: "template",
    model: "mugiwara-navigator-v1",
  };
}

/** Answer a follow-up message about an already-built project. */
export async function crewFollowUp(options: {
  message: string;
  projectName: string;
  filePaths: string[];
  providerId?: ProviderId;
  signal?: AbortSignal;
}): Promise<CrewReply> {
  const lower = options.message.toLowerCase();
  const isChangeRequest =
    /\b(change|add|remove|update|fix|make|rename|adjust|switch|move|delete|replace|tweak|improve)\b/.test(lower);

  const agent = isChangeRequest ? "coder" : "navigator";
  const spec = analyzePrompt(options.message);
  const tasks = buildPlan(spec).filter((t) => (isChangeRequest ? t.id === "build" || t.id === "verify" : true));

  const deterministic = isChangeRequest
    ? [
        `**Coder here.** Understood — I'll apply that to **${options.projectName}**.`,
        "",
        `Requested change: ${options.message.trim()}`,
        "",
        `Current files: ${options.filePaths.join(", ") || "none yet"}`,
        "",
        "I'll regenerate the affected files and re-run verification. Nothing is deployed without your say-so.",
      ].join("\n")
    : [
        `**Navigator here.** Noted for **${options.projectName}**.`,
        "",
        `You said: ${options.message.trim()}`,
        "",
        "If you'd like me to act on that, describe the change you want (for example “make the theme blue” or “add a search box”) and I'll rebuild the files.",
      ].join("\n");

  if (configuredProviders().length > 0) {
    try {
      const provider = resolveProvider(options.providerId);
      const result = await provider.generate({
        system: [
          "You are a member of the MUGIWARA crew answering a follow-up about a website you built.",
          "Be concise (under 120 words), concrete and honest. Do not claim to have changed anything",
          "you have not. Plain text only, no code blocks.",
        ].join(" "),
        messages: [
          {
            role: "user",
            content: `Project: ${options.projectName}\nFiles: ${options.filePaths.join(", ")}\nUser: ${options.message}`,
          },
        ],
        temperature: 0.4,
        maxTokens: 500,
        signal: options.signal,
      });
      return {
        content: result.text.trim(),
        questions: [],
        acceptance: [],
        tasks,
        agent,
        usedAI: true,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        costUsd: result.costUsd,
        provider: result.provider,
        model: result.model,
      };
    } catch {
      // fall through
    }
  }

  return {
    content: deterministic,
    questions: [],
    acceptance: [],
    tasks,
    agent,
    usedAI: false,
    tokensIn: 0,
    tokensOut: 0,
    costUsd: 0,
    provider: "template",
    model: "mugiwara-crew-v1",
  };
}

function describeArchetype(archetype: string): string {
  const map: Record<string, string> = {
    landing: "landing page",
    portfolio: "portfolio site",
    tasks: "task-tracking app",
    dashboard: "analytics dashboard",
    blog: "blog",
    booking: "booking page",
    store: "store front",
  };
  return map[archetype] ?? "website";
}
