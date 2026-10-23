# MUGIWARA — Architecture

This document explains how the system is put together and, more importantly,
*why* the boundaries sit where they do.

---

## 1. Guiding principles

1. **Honesty over polish.** If something is not configured, not run, or not
   verified, the UI says so. There is no simulated progress anywhere.
2. **Generated code is untrusted.** It is never executed on the application
   server. Builds, tests and previews are delegated to a separate sandbox.
3. **One interface per external concern.** Persistence, AI, execution and
   deployment each sit behind an interface with a safe default.
4. **Prompt instructions are not security controls.** Authorization, validation
   and limits are enforced in code, not in a system prompt.
5. **Works on clone.** The platform is fully usable with no keys and no database.

---

## 2. Request lifecycle

```
Request
  │
  ├─ middleware.ts ─── refreshes the Supabase session cookie
  │                    and gates protected routes (redirect to /login)
  │
  ├─ Server Component ─ reads data through the DataStore
  │                     (never touches a driver directly)
  │
  └─ Route Handler ──── requireApiUser() → 401 or rate-limited
                        Zod validation → 400
                        business logic
                        → NextResponse.json
```

Every route handler follows the same first three steps. There is no path to
business logic that skips authentication or validation.

---

## 3. The generation pipeline

```
prompt
  │
  ├─ analyzePrompt()      → SiteSpec { name, archetype, palette, features, tags }
  │                          (deterministic; always runs)
  │
  ├─ buildPlan()          → PlannedTask[] with agents and dependencies
  │
  ├─ generateApplication() → GeneratedFile[]
  │     ├─ if a provider is configured:  model returns JSON → sanitizeFiles()
  │     └─ otherwise:                    buildStaticSite(spec)
  │
  ├─ runVerification()    → real checks: doctype, asset wiring,
  │                          :root theme block, JavaScript parses
  │
  ├─ reviewSecurity()     → secrets, external scripts, eval()
  │
  └─ persist: project · tasks · files · logs · tests · usage · messages
```

### Why a deterministic generator exists

It is not a fallback stub. It is the reason the platform is demonstrable in one
minute, and it doubles as the structural guardrail for AI output: the spec is
computed first, so even the model works against a concrete brief.

`sanitizeFiles()` is the trust boundary for model output. It enforces an
allowlist of extensions and rejects any path that fails `assertSafeRelativePath`.

---

## 4. The store abstraction

```ts
interface DataStore {
  readonly mode: "supabase" | "local";
  // projects, files, tasks, messages, logs, tests,
  // memories, usage, agent runs, deployments
}
```

| Implementation | When | Durability |
| --- | --- | --- |
| `SupabaseStore` | `NEXT_PUBLIC_SUPABASE_*` set | Postgres + RLS |
| `LocalStore` | otherwise | in-process, resets on restart |

`getStore()` chooses. Pages and routes import `getStore`, never a driver.

**Why the client is loosely typed in `SupabaseStore`:** `@supabase/ssr` and
`@supabase/supabase-js` publish different generic orderings for their client
types, so passing a `Database` generic through both produces incompatible
signatures. The store therefore accepts the client loosely and enforces the
project's own row types (`src/types/database.ts`) on every public method. The
type safety that matters — what callers get back — is intact.

---

## 5. The crew and the orchestrator

Each agent is a name, a system prompt and a tool allowlist (`lib/agents/crew.ts`).
Agents share models but differ in instructions — which is the whole point of a
crew rather than one large prompt.

`AgentOrchestrator` runs a `PlannedTask[]`:

- **Dependency resolution** — a task runs only when every task in `dependsOn`
  succeeded. Tasks whose dependencies failed are cancelled, not silently skipped.
- **Concurrency** — at most `AI_MAX_CONCURRENCY` tasks in flight.
- **Bounded retries** — exponential backoff, capped attempts, no infinite loops.
- **Timeout & cancellation** — a single `AbortController` covers the run.
- **Cost ceiling** — a `CostBudget` is checked before every wave; the run stops
  when the ceiling is reached and reports that it did.

Every step emits an event, so the UI reflects genuine progress.

---

## 6. Security boundaries

| Boundary | Control |
| --- | --- |
| Data access | RLS policies comparing `user_id` to `auth.uid()` |
| API entry | `requireApiUser()` — 401, then per-user rate limiting |
| Input | Zod schemas on every body |
| File paths | `assertSafeRelativePath` — no absolute paths, no `..`, no NUL |
| Outbound network | `isSafeOutboundUrl` — blocks private, link-local and metadata IPs |
| Secrets | read lazily server-side; never `NEXT_PUBLIC_`; vault refuses credentials |
| Spend | per-run USD ceiling, step cap, timeout |
| Destructive actions | `requiresApproval` detection + explicit user approval |
| Untrusted content | memory and web results are wrapped as delimited data |
| Generated code | executed only by an external sandbox provider |

---

## 7. UI architecture

- **Server Components** fetch through the store and render panels.
- **Client islands** are used only where interaction demands it: the prompt
  composer, chat, command palette, editor, workspace tabs, memory manager.
- **Motion** is centralised in `components/motion.tsx` and always respects
  `prefers-reduced-motion` (handled in `globals.css`).
- **Accessibility** — semantic landmarks, labelled controls, visible focus rings,
  `aria-live` on toasts, keyboard-driven palette (⌘K, ↑↓, ⏎, Esc).
- **Empty states are first-class.** `EmptyState` is used wherever data may be
  absent, so the interface never invents content.

---

## 8. Extension points

| To add… | Do this |
| --- | --- |
| A new AI provider | Implement `AIProvider` in `lib/ai/providers/` and register it in `lib/ai/index.ts` |
| A new template family | Add a builder in `lib/engine/templates.ts` and extend `analyzePrompt` |
| Real execution | Implement `ExecutionProvider` in `lib/execution/index.ts` |
| A hosting provider | Implement `DeployProvider` in `lib/deploy/index.ts` |
| Semantic memory | Replace `scoreMemories` in `lib/memory/vault.ts`; callers are unaffected |
| A new persisted entity | Add the table + RLS policy, the row type, and the `DataStore` methods |
