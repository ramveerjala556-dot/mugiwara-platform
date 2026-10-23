/**
 * Engine verification — proves the prompt-to-application path produces a real,
 * working static site. Run with:  npx tsx scripts/verify-engine.ts
 */
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { analyzePrompt } from "../src/lib/engine/spec";
import { buildStaticSite } from "../src/lib/engine/templates";
import { composePreview } from "../src/lib/engine/preview";
import { buildPlan, acceptanceCriteria } from "../src/lib/agents/plan";

const PROMPTS = [
  "Build a coffee shop website with a menu, cart and checkout",
  "Create a personal portfolio site for a photographer",
  "Make a task tracker app with add and complete",
  "Build an analytics dashboard with charts and CSV export",
  "A blue blog about gardening",
  "Build a college attendance management system with teacher and student login",
];

const OUT = "/scratch/work/verify-out";
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

let failures = 0;

for (const prompt of PROMPTS) {
  const spec = analyzePrompt(prompt);
  const files = buildStaticSite(spec);
  const plan = buildPlan(spec);
  const criteria = acceptanceCriteria(spec);

  const byPath = new Map(files.map((f) => [f.path, f.content]));
  const html = byPath.get("index.html") ?? "";
  const css = byPath.get("styles.css") ?? "";
  const js = byPath.get("app.js") ?? "";

  // The preview must be fully self-contained: styles and scripts inlined so it
  // renders inside a sandboxed iframe with no network access.
  const preview = composePreview(files);

  const checks: [string, boolean, string][] = [
    ["files present", files.length === 4, files.map((f) => f.path).join(", ")],
    ["preview inlines css", preview.includes("<style>") && !preview.includes('href="styles.css"'), ""],
    ["preview inlines js", /<script>\s/.test(preview) && !preview.includes('src="app.js"'), ""],
    ["preview is self-contained", !/<link[^>]+href="[^"]+\.css"/.test(preview), ""],
    ["doctype", /^<!doctype html>/i.test(html.trim()), ""],
    ["links css", html.includes("styles.css"), ""],
    ["links js", html.includes("app.js"), ""],
    ["title = name", html.includes(`<title>${spec.name}</title>`), spec.name],
    ["theme :root", css.includes(":root"), ""],
    ["palette applied", css.includes(spec.palette.primary), spec.palette.primary],
    ["js parses", (() => { try { new Function(js); return true; } catch { return false; } })(), ""],
    ["no external scripts", !/<script[^>]+src=["']https?:/i.test(html), ""],
    ["plan has tasks", plan.length >= 5, `${plan.length} tasks`],
    ["criteria present", criteria.length >= 4, `${criteria.length} criteria`],
    ["skip link", html.includes("skip-link"), ""],
    ["reduced motion", css.includes("prefers-reduced-motion"), ""],
  ];

  const failed = checks.filter(([, ok]) => !ok);
  failures += failed.length;

  const dir = join(OUT, spec.archetype + "-" + spec.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
  mkdirSync(dir, { recursive: true });
  for (const file of files) writeFileSync(join(dir, file.path), file.content, "utf8");

  console.log(
    `${failed.length === 0 ? "PASS" : "FAIL"}  ${spec.archetype.padEnd(10)} “${spec.name}” (${spec.palette.name}) ` +
      `— ${checks.filter(([, ok]) => ok).length}/${checks.length} checks, ${files.reduce((n, f) => n + f.content.length, 0)} bytes`,
  );
  for (const [name, , note] of failed) console.log(`        ✗ ${name} ${note}`);
}

console.log(`\n${failures === 0 ? "ALL GREEN" : `${failures} FAILURES`} — output written to ${OUT}`);
process.exit(failures === 0 ? 0 : 1);
