# MUGIWARA — Build Progress & Handoff

_Last updated: 2026-10-23. Resume notes for the next session._

Read this first when picking the project back up. For the product overview see
[`README.md`](README.md); for design rationale see
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## Status: all ten phases complete and verified

The production build passes, and both verification harnesses are green.

```
npm run build                      ✓ 29 routes
npx tsx scripts/verify-engine.ts   ✓ 6 prompts × 13 assertions — ALL GREEN
npx tsx scripts/verify-flow.ts     ✓ 24 assertions — ALL GREEN
```

### Done

- **Phases 1–2 — UI.** Design system, responsive dashboard matching the reference
  mockup, sidebar, top bar, ⌘K command palette, toasts, staggered motion, all
  module pages (workspace, projects, crew, memory, missions, automations, skills,
  analytics, files, settings).
- **Phase 3 — Auth & data.** Supabase browser/server/admin clients, session
  middleware with route gating, sign-up / sign-in / sign-out / password reset,
  `/auth/callback` with open-redirect protection. Migrations `0001_init.sql`
  (18 tables, indexes, triggers) and `0002_rls.sql` (RLS + owner-only policies).
- **Phase 4 — AI.** Provider interface with Claude, OpenAI and Gemini
  implementations, pricing/cost estimation, provider fallback.
- **Phase 5 — Crew.** Seven agents, dependency-aware planner, orchestrator with
  concurrency limits, bounded retries, timeout, cancellation and a USD ceiling.
- **Phase 6 — Generation.** Deterministic spec analysis, seven site archetypes,
  a real built-in generator, AI-assisted path with output sanitisation.
- **Phase 7 — Workspace.** Tabbed workspace (overview, plan, code, preview, logs,
  tests, deploy), Monaco editor with save, sandboxed iframe preview built by
  inlining assets, real verification checks.
- **Phase 8 — Memory Vault.** CRUD, keyword relevance ranking, untrusted-context
  formatting, credential rejection.
- **Phase 9 — Deployment.** Approval-gated, honest status reporting.
- **Phase 10 — Hardening.** Security guards (validation, rate limiting, path
  traversal, SSRF), CI workflow, README, architecture doc, two test harnesses.

### Verified behaviours

- A prompt creates a project, plans six tasks, generates four files, runs three
  checks and marks the project `ready`.
- `"change the theme to blue"` regenerates the stylesheet with the blue palette.
- `../../etc/passwd` as a file path is rejected with HTTP 400.
- Content resembling an API key is refused by the Memory Vault with HTTP 400.
- The whole thing works with **no API key and no database** (Demo Mode).

---

## Environment notes for the next session

The sandbox has a **1.5 GB virtual-memory ulimit** that makes `npm install` and
`next build` fail with "JavaScript heap out of memory" / "Zone Allocation failed"
unless it is lifted first. Prefix heavy Node commands with:

```bash
ulimit -v unlimited && NODE_OPTIONS="--max-old-space-size=1400" <command>
```

`node_modules` is **not** in the repository — run `npm install` (with the fix
above) after cloning.

---

## Deliberate decisions

- **Next.js 15.5.28**, a patched 15.x line, rather than 15.1.6 which carries
  CVE-2025-66478.
- **Fonts are CSS stacks**, not `next/font`, so the build never depends on a font
  CDN.
- **No fake data anywhere** — empty states throughout.
- **Original branding only** — the logo is an inline SVG drawn for this project.
- **Generated code never runs in-process** — execution is delegated.
- **`SupabaseStore` takes a loosely typed client** because `@supabase/ssr` and
  `@supabase/supabase-js` ship incompatible generic orderings; our own row types
  are enforced on every public method.

---

## Next steps

1. Add a Next.js / Express template family beyond the static site.
2. Wire a real scheduler behind the automations module.
3. Add the diff viewer and version rollback UI (`project_versions` already exists).
4. Swap keyword memory ranking for embeddings behind the same function.
5. Expose file uploads through the existing `files` store methods.
