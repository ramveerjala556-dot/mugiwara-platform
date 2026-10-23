# MUGIWARA

**One Crew. One Goal.**

MUGIWARA is an AI software creation platform. Describe what you want to build in
plain language, and a crew of specialised agents plans it, designs it, writes it,
verifies it and hands you a working application you can preview, edit and iterate
on — through chat.

> **Try it in 60 seconds:** clone, `npm install`, `npm run dev`, open
> `http://localhost:3000`, and type *"build a coffee shop website with a menu and
> cart"*. No API keys, no database, no sign-up required to see it work.

---

## Table of contents

- [What it does](#what-it-does)
- [Quick start](#quick-start)
- [How it works](#how-it-works)
- [Demo Mode vs. production](#demo-mode-vs-production)
- [Environment variables](#environment-variables)
- [Database setup](#database-setup)
- [Architecture](#architecture)
- [Project structure](#project-structure)
- [The crew](#the-crew)
- [Security model](#security-model)
- [Testing](#testing)
- [Roadmap](#roadmap)
- [Known limitations](#known-limitations)
- [Scripts](#scripts)
- [License](#license)

---

## What it does

| Capability | What actually happens |
| --- | --- |
| **Prompt → application** | Your prompt is analysed, turned into a spec and a task plan, then real files are generated and saved. |
| **Live preview** | The generated site runs in a sandboxed iframe with styles and scripts inlined — no build step. |
| **Iterate by chat** | *"Change the theme to blue"*, *"add a search box"* — the change is applied to the files and re-verified. |
| **Code editor** | Browse and edit every generated file with a Monaco editor, then save. |
| **Real verification** | The output is genuinely checked: doctype, asset wiring, stylesheet theme block, and whether the JavaScript parses. |
| **Honest reporting** | Every panel shows real data or an empty state. Nothing displays fake progress or fake success. |
| **Memory Vault** | Preferences, decisions and verified fixes are stored and reused on later prompts. |
| **Deploy with approval** | Deployment is gated behind explicit approval and reports the provider's real status — never a claimed success. |

### What "build a website" actually produces

For *"build a coffee shop website with a menu, cart and checkout"* MUGIWARA
generates a dependency-free, responsive site:

```
index.html    ← semantic markup, skip link, nav, hero, feature grid
styles.css    ← CSS custom properties for theming, responsive, reduced-motion aware
app.js        ← working product grid + cart with a live running total
README.md     ← what it is and how to re-theme it
```

Open `index.html` directly in a browser — it works with no install and no network.

The generator recognises seven archetypes and adapts the interactive section to
each: **landing page, portfolio, task app, dashboard, blog, booking, store.** It
also picks up theme colours, project names and capabilities from the prompt.

---

## Quick start

**Requirements:** Node.js 20+, npm 10+.

```bash
git clone https://github.com/ramveerjala556-dot/mugiwara.git
cd mugiwara
npm install
cp .env.example .env.local      # optional for Demo Mode
npm run dev
```

Open <http://localhost:3000>. With no environment variables set you are in
**Demo Mode**: everything works, data lives in memory, and a banner tells you so.

---

## How it works

```
your prompt
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│ 1. Navigator   analyses the request, infers a spec, plans tasks   │
│ 2. Architect   designs structure, theming and state               │
│ 3. Designer    specifies sections, states and accessibility       │
│ 4. Researcher  pulls in references (when a provider is configured)│
│ 5. Coder       writes the files                                   │
│ 6. Tester      runs real checks on the artefacts                  │
│ 7. Guardian    scans for secrets, external loads and eval()       │
└──────────────────────────────────────────────────────────────────┘
    │
    ▼
 project → files → preview → edit → iterate → deploy (with approval)
```

The orchestrator enforces **concurrency limits, bounded retries, a wall-clock
timeout, cancellation and a hard USD cost ceiling** on every run.

Two generation paths, chosen automatically:

1. **AI-assisted** — when an API key is configured, a model produces the files
   (with the same structural spec as a guardrail). Output is validated before
   anything is saved.
2. **Built-in generator** — when no key is configured, a deterministic generator
   builds the site from the analysed spec. This is a real, working generator, not
   a placeholder — it is what makes the 60-second demo possible.

The UI always tells you which path ran.

---

## Demo Mode vs. production

| | Demo Mode | Production |
| --- | --- | --- |
| Trigger | Supabase env vars absent | Supabase env vars present |
| Accounts | none (a single local identity) | full sign-up / sign-in / reset |
| Storage | in-process, resets on restart | Postgres with Row Level Security |
| AI | built-in generator | configured providers, or the generator as fallback |
| Isolation | per-user | per-user, enforced in the database |

Demo Mode exists so the platform is usable the moment you clone it. The UI labels
it clearly rather than pretending data is persisted.

---

## Environment variables

Copy `.env.example` to `.env.local`. **Every secret is server-only** — nothing
prefixed `NEXT_PUBLIC_` is secret, and no key is ever sent to the browser.

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | for production | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | for production | Publishable key (safe for the browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | optional | Server-only; bypasses RLS for privileged background work |
| `ANTHROPIC_API_KEY` | optional | Claude — the default provider |
| `OPENAI_API_KEY` | optional | OpenAI |
| `GOOGLE_GENERATIVE_AI_API_KEY` | optional | Google Gemini |
| `AI_DEFAULT_PROVIDER` | optional | `claude` \| `openai` \| `gemini` |
| `AI_MAX_RUN_COST_USD` | optional | Hard cost ceiling per run (default `2.00`) |
| `AI_MAX_AGENT_STEPS` | optional | Step cap per run (default `40`) |
| `AI_RUN_TIMEOUT_SECONDS` | optional | Wall-clock timeout (default `600`) |
| `AI_MAX_CONCURRENCY` | optional | Parallel agents (default `3`) |
| `EXECUTION_PROVIDER` / `EXECUTION_API_URL` / `EXECUTION_API_KEY` | optional | Isolated sandbox for builds/tests |
| `DEPLOY_PROVIDER` / `DEPLOY_API_TOKEN` | optional | Deployment provider |

Anything left blank degrades gracefully and the UI says so.

---

## Database setup

Migrations live in `supabase/migrations`:

| File | Contents |
| --- | --- |
| `0001_init.sql` | 18 tables, indexes, `updated_at` triggers and a signup trigger that creates a profile |
| `0002_rls.sql` | Row Level Security enabled on every table, with owner-only policies |

```bash
# hosted project
supabase link --project-ref <your-ref>
supabase db push

# or a local stack
supabase start
supabase db reset
```

**Every table is user-scoped.** Policies compare `user_id` to `auth.uid()`, so
one user can never read or write another's rows. `milestones` inherits ownership
through its parent mission.

Tables: `profiles`, `user_settings`, `projects`, `project_versions`,
`conversations`, `messages`, `tasks`, `agent_runs`, `files`, `memories`,
`missions`, `milestones`, `automations`, `skills`, `test_results`,
`execution_logs`, `deployments`, `usage_events`.

---

## Architecture

```
Browser
  │  React Server Components + a small set of client islands
  ▼
Next.js App Router (server)
  ├─ middleware.ts ......... refreshes the session, gates protected routes
  ├─ app/api/* ............. route handlers (the only place secrets are used)
  ├─ lib/engine/* .......... prompt → spec → files → verification
  ├─ lib/agents/* .......... the crew, planning, orchestration, conversation
  ├─ lib/store/* ........... DataStore: SupabaseStore | LocalStore
  ├─ lib/ai/* .............. provider abstraction (Claude / OpenAI / Gemini)
  ├─ lib/security/* ........ validation, rate limiting, path & SSRF guards
  └─ lib/execution|deploy .. interfaces for isolated runs and deployment
        │
        ▼
  Supabase (Postgres + Auth + RLS)   ·   AI providers   ·   Sandbox / host
```

**One interface, two stores.** All persistence goes through `DataStore`. The app
never talks to a driver directly, which is why it runs identically with or
without Supabase configured.

**Generated code never runs on the app server.** Builds, tests and previews are
delegated to an execution provider over HTTP. The default provider performs no
execution and says so.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the detailed version.

---

## Project structure

```
src/
├── app/
│   ├── (auth)/               login · signup · forgot-password · update-password
│   ├── (app)/                dashboard · workspace · projects · crew · memory
│   │                         missions · automations · skills · analytics
│   │                         files · settings
│   ├── api/
│   │   ├── ai/chat           answer · build · modify
│   │   ├── ai/generate       prompt-to-application
│   │   ├── projects/…        CRUD + file saving
│   │   ├── memory            Memory Vault CRUD
│   │   ├── execute           isolated build / test / preview
│   │   ├── deploy            approval-gated deployment
│   │   └── health            truthful configuration report
│   ├── auth/                 OAuth callback + sign-out
│   └── globals.css
├── components/
│   ├── assistant/            crew chat
│   ├── dashboard/            sidebar · topbar · hero · panels
│   ├── workspace/            tabs · file explorer · Monaco editor · preview
│   ├── memory/               vault manager
│   ├── ui/                   accessible primitives (Radix-based)
│   ├── command-palette.tsx   ⌘K palette
│   └── motion.tsx            shared animation variants
├── lib/
│   ├── agents/               crew · plan · orchestrator · conversation
│   ├── ai/                   provider interface + implementations + pricing
│   ├── engine/               spec · templates · generate · preview · pipeline
│   ├── store/                DataStore interface + Supabase + local
│   ├── supabase/             browser · server · admin clients
│   ├── security/             guards
│   └── memory/               vault retrieval
├── types/database.ts         row types mirroring the SQL schema
supabase/migrations/          schema + RLS
scripts/                      verification harnesses
```

---

## The crew

| Agent | Role | Tools |
| --- | --- | --- |
| **Navigator** | Understands the request, clarifies, plans | `search_web`, `read_docs` |
| **Architect** | Architecture, data model, dependencies | `read_docs`, `query_db` |
| **Designer** | UI specification, states, accessibility | `read_docs` |
| **Researcher** | Documentation retrieval (treated as untrusted) | `search_web`, `read_docs` |
| **Coder** | Writes and edits files | `read_file`, `write_file` |
| **Tester** | Runs lint, type checks, builds and tests | `run_tests`, `run_lint`, `run_typecheck` |
| **Guardian** | Security and risk review | `review_security`, `read_file` |

Agents share models but each carries its own instructions and tool permissions.

---

## Security model

Prompt instructions are **not** security controls. These are:

- **Row Level Security** on every table, scoped to `auth.uid()`.
- **Server-side authorization** on every route handler; 401 before any work.
- **Input validation** with Zod on every request body.
- **Rate limiting** per user per endpoint.
- **Path-traversal guards** — generated and edited file paths must stay inside
  the project; absolute paths, `..` and NUL bytes are rejected.
- **SSRF protection** — outbound fetches refuse private, link-local and
  cloud-metadata addresses.
- **Secret hygiene** — keys are read lazily, server-side only, and never bundled.
  The Memory Vault actively refuses content that looks like a credential.
- **Cost and resource ceilings** — per-run USD cap, step cap, wall-clock timeout
  and concurrency limit.
- **Approval gates** — deployment and destructive operations require explicit
  confirmation, and destructive shell patterns are detected and blocked.
- **Untrusted-by-default** — retrieved web content and memory are passed to
  models as clearly delimited *data*, never as instructions.
- **Generated code never executes in-process** — it is delegated to a sandbox.

---

## Testing

Three harnesses verify the system — none need an API key, and only the last one
needs a build:

```bash
npx tsx scripts/verify-engine.ts   # 6 prompts → 16 assertions each on the output
npx tsx scripts/verify-flow.ts     # the real route handlers, in-process
node scripts/smoke-test.mjs        # boots the production server, drives it over HTTP
```

`verify-engine.ts` checks the generated site: file set, doctype, asset wiring,
theme block, JavaScript parses, no external scripts, the plan and acceptance
criteria, and that the **preview is fully self-contained** (styles and scripts
inlined so it renders in a sandboxed iframe with no network).

`verify-flow.ts` covers: health, project creation, file generation, verification
checks, listing, detail loading, plan persistence, file editing, **path-traversal
rejection**, a chat-driven change request, building from chat, and Memory Vault
creation plus **secret rejection**.

`smoke-test.mjs` starts the real server and asserts over HTTP: every page
returns 200, the dashboard greets you and shows the Demo Mode banner, a prompt
builds a project end to end, a chat follow-up re-themes it, and the safety gates
hold — **traversal rejected, deployment refused without approval, execution
reported as unconfigured, secrets refused**. 38 assertions.

All three exit non-zero on failure, so they work as CI gates. `npm test` runs
the lot.

---

## Roadmap

- [x] Phase 1 — design system and responsive dashboard
- [x] Phase 2 — navigation, projects, workspace shell
- [x] Phase 3 — authentication and database persistence
- [x] Phase 4 — real AI provider integration
- [x] Phase 5 — agent orchestration
- [x] Phase 6 — application generation
- [x] Phase 7 — editor, preview, verification
- [x] Phase 8 — Memory Vault
- [x] Phase 9 — deployment interface with approval gates
- [ ] Phase 10 — full integration suite, security review, performance pass
- [ ] Additional templates (Next.js, Express) beyond the static site
- [ ] Semantic memory retrieval alongside keyword search
- [ ] Real scheduler behind the automations module
- [ ] Diff viewer and version rollback UI

---

## Known limitations

Being straight about what is not finished:

- **One template family.** Generated applications are dependency-free static
  sites. Next.js and Express templates are on the roadmap.
- **Verification is static.** The Tester parses and inspects the output; it does
  not execute it in a browser. Real execution needs an execution provider.
- **Preview is inlined, not served.** Assets are inlined into one document for
  the sandboxed iframe. Multi-file routing is not simulated.
- **Demo Mode is not durable.** The local store lives in memory and resets on
  restart. Configure Supabase for persistence.
- **The Supabase client boundary is loosely typed.** `@supabase/ssr` and
  `@supabase/supabase-js` ship different generic orderings; the store accepts the
  client loosely and enforces our own row types on every public method.
- **Automations and missions have no write UI yet.** Missions are computed from
  real task state; automations are deliberately gated off.
- **No file upload UI.** The `files` table and store support it; the interface
  does not expose it yet.

---

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm test` | All three verification suites |
| `npx tsx scripts/verify-engine.ts` | Generation checks (6 prompts × 16 assertions) |
| `npx tsx scripts/verify-flow.ts` | End-to-end API checks, in-process |
| `node scripts/smoke-test.mjs` | Live server smoke test over HTTP |

---

## License

Released under the MIT License. See [`LICENSE`](LICENSE).

MUGIWARA ships **original branding only** — the logo is an inline SVG drawn for
this project. No third-party artwork is bundled. The "pirate adventure" theme is
an aesthetic direction, not an affiliation.
