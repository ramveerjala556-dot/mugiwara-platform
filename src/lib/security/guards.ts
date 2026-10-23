import { z } from "zod";

/**
 * Server-side safety helpers. Prompt instructions are NOT security controls —
 * these are the actual controls: input validation, rate limiting, path and
 * URL checks, and a spend ceiling per user.
 */

/* -------------------------------------------------------------------------- */
/* Input validation                                                            */
/* -------------------------------------------------------------------------- */

export const promptSchema = z
  .string()
  .trim()
  .min(3, "Prompt is too short.")
  .max(8000, "Prompt is too long (8000 characters max).");

export const projectInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional(),
  framework: z.enum(["nextjs", "vite-react", "express"]).default("nextjs"),
});

export const memoryInputSchema = z.object({
  kind: z.enum(["preference", "decision", "architecture", "fix", "learning", "open_task"]),
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1).max(8000),
  projectId: z.string().uuid().optional(),
  verified: z.boolean().default(false),
  tags: z.array(z.string().trim().max(40)).max(20).default([]),
});

export const chatInputSchema = z.object({
  prompt: promptSchema,
  projectId: z.string().uuid().optional(),
  conversationId: z.string().uuid().optional(),
  provider: z.enum(["claude", "openai", "gemini"]).optional(),
});

/* -------------------------------------------------------------------------- */
/* Rate limiting (in-memory token bucket)                                      */
/* -------------------------------------------------------------------------- */

interface Bucket {
  tokens: number;
  updatedAt: number;
}

const buckets = new Map<string, Bucket>();

/**
 * Simple per-key token bucket. Good enough for a single instance; in
 * production back this with Redis/Upstash so limits hold across instances.
 */
export function rateLimit(
  key: string,
  { capacity = 20, refillPerSecond = 0.5 }: { capacity?: number; refillPerSecond?: number } = {},
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { tokens: capacity, updatedAt: now };
  const elapsed = (now - bucket.updatedAt) / 1000;
  bucket.tokens = Math.min(capacity, bucket.tokens + elapsed * refillPerSecond);
  bucket.updatedAt = now;

  if (bucket.tokens < 1) {
    buckets.set(key, bucket);
    return { allowed: false, remaining: 0 };
  }
  bucket.tokens -= 1;
  buckets.set(key, bucket);
  return { allowed: true, remaining: Math.floor(bucket.tokens) };
}

/* -------------------------------------------------------------------------- */
/* Filesystem path safety                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Reject absolute paths, parent traversal, and NUL bytes. Generated file paths
 * are always project-relative and must stay inside the project root.
 */
export function isSafeRelativePath(path: string): boolean {
  if (!path || path.includes("\0")) return false;
  if (path.startsWith("/") || /^[a-zA-Z]:/.test(path)) return false;
  const segments = path.split(/[\\/]+/);
  return !segments.includes("..");
}

export function assertSafeRelativePath(path: string): void {
  if (!isSafeRelativePath(path)) {
    throw new Error(`Unsafe file path rejected: ${path}`);
  }
}

/* -------------------------------------------------------------------------- */
/* SSRF protection for outbound fetches (research, deployment checks)          */
/* -------------------------------------------------------------------------- */

const BLOCKED_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^0\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./, // link-local / cloud metadata
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
  /\.internal$/i,
];

/** Returns true only for public http(s) URLs that are not private/metadata hosts. */
export function isSafeOutboundUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  const host = url.hostname;
  return !BLOCKED_HOST_PATTERNS.some((re) => re.test(host));
}

/* -------------------------------------------------------------------------- */
/* Destructive-action gating                                                   */
/* -------------------------------------------------------------------------- */

const DESTRUCTIVE_PATTERNS = [
  /\brm\s+-rf\b/i,
  /\bdrop\s+(table|database|schema)\b/i,
  /\btruncate\s+table\b/i,
  /\bgit\s+push\s+--force\b/i,
  /\bgit\s+reset\s+--hard\b/i,
  /\bdelete\s+from\b/i,
];

/** Detect operations that must require explicit user approval before running. */
export function requiresApproval(command: string): boolean {
  return DESTRUCTIVE_PATTERNS.some((re) => re.test(command));
}
