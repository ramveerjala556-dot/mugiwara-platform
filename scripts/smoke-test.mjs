/**
 * Live smoke test — boots the production server and drives it over real HTTP.
 *
 * Unlike scripts/verify-flow.ts (which calls route handlers in-process), this
 * exercises the actual running app: middleware, server components, the API,
 * and the rendered HTML pages.
 *
 * Run:  node scripts/smoke-test.mjs
 */
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const PORT = 3100;
const BASE = `http://127.0.0.1:${PORT}`;
const NEXT_BIN = "node_modules/next/dist/bin/next";

let failures = 0;
function check(label, ok, note = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${note ? ` — ${note}` : ""}`);
  if (!ok) failures += 1;
}

const server = spawn(process.execPath, [NEXT_BIN, "start", "-p", String(PORT)], {
  cwd: process.cwd(),
  env: { ...process.env, NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1" },
  stdio: ["ignore", "pipe", "pipe"],
});

let serverLog = "";
server.stdout.on("data", (d) => (serverLog += d.toString()));
server.stderr.on("data", (d) => (serverLog += d.toString()));

async function waitForReady(timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${BASE}/api/health`);
      if (response.ok) return true;
    } catch {
      /* not up yet */
    }
    await sleep(600);
  }
  return false;
}

const post = (path, body) =>
  fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

async function main() {
  const ready = await waitForReady();
  if (!ready) {
    console.log("Server never became ready. Log:\n" + serverLog.slice(-2000));
    process.exit(1);
  }
  console.log(`Server ready on ${BASE}\n`);

  /* ---------------------------------------------------------- pages ----- */
  console.log("— pages —");
  const home = await fetch(`${BASE}/`);
  const homeHtml = await home.text();
  check("GET / returns 200", home.status === 200, `HTTP ${home.status}`);
  check("landing page renders", homeHtml.includes("Mugiwara") && homeHtml.includes("One Crew"));

  const login = await fetch(`${BASE}/login`);
  check("GET /login returns 200", login.status === 200, `HTTP ${login.status}`);

  const dashboard = await fetch(`${BASE}/dashboard`);
  const dashboardHtml = await dashboard.text();
  check("GET /dashboard returns 200", dashboard.status === 200, `HTTP ${dashboard.status}`);
  check(
    "dashboard greets the captain",
    /Good (morning|afternoon|evening)/.test(dashboardHtml),
  );
  check(
    "demo banner is shown",
    dashboardHtml.includes("Demo Mode"),
  );
  check(
    "command palette hint is present",
    dashboardHtml.includes("⌘ K") || dashboardHtml.includes("command palette"),
  );

  for (const path of ["/workspace", "/projects", "/crew", "/memory", "/missions", "/automations", "/skills", "/analytics", "/files", "/settings"]) {
    const response = await fetch(`${BASE}${path}`);
    check(`GET ${path} returns 200`, response.status === 200, `HTTP ${response.status}`);
  }

  /* ----------------------------------------------------------- api ------ */
  console.log("\n— api —");
  const health = await (await fetch(`${BASE}/api/health`)).json();
  check("health reports demo mode", health.mode === "demo", health.mode);
  check("health reports ai providers honestly", health.checks.aiProviders.ok === false, health.checks.aiProviders.detail);

  console.log("\n— generate a website over HTTP —");
  const generated = await (
    await post("/api/ai/generate", {
      prompt: "Build a coffee shop website with a menu, cart and checkout",
    })
  ).json();
  check("project created", Boolean(generated.projectId), generated.name);
  check("four files generated", generated.files?.length === 4, (generated.files ?? []).map((f) => f.path).join(", "));
  check("checks all passed", (generated.checks ?? []).every((c) => c.status === "passed"), `${generated.checks?.length} checks`);

  const projectId = generated.projectId;

  const detail = await (await fetch(`${BASE}/api/projects/${projectId}`)).json();
  check("project detail loads", detail.project?.id === projectId);
  check("files persisted", detail.files?.length === 4, `${detail.files?.length}`);
  check("plan persisted", detail.tasks?.length === 6, `${detail.tasks?.length}`);
  check("tests persisted", detail.tests?.length === 3, `${detail.tests?.length}`);
  check("project is ready", detail.project?.status === "ready", detail.project?.status);

  const projectPage = await fetch(`${BASE}/projects/${projectId}`);
  const projectHtml = await projectPage.text();
  check("project workspace page renders", projectPage.status === 200 && projectHtml.includes("The Shop"), `HTTP ${projectPage.status}`);

  console.log("\n— iterate by chat over HTTP —");
  const changed = await (
    await post("/api/ai/chat", { projectId, prompt: "change the theme to blue" })
  ).json();
  check("change applied", changed.modified === true, changed.agent);

  const after = await (await fetch(`${BASE}/api/projects/${projectId}`)).json();
  const css = after.files.find((f) => f.path === "styles.css")?.content ?? "";
  check("stylesheet now uses the blue palette", css.includes("#2563eb"));

  console.log("\n— build from chat (no project) —");
  const built = await (
    await post("/api/ai/chat", { prompt: "create a task tracker app with add and complete" })
  ).json();
  check("chat built a project", built.built === true && Boolean(built.projectId), built.projectId);

  console.log("\n— safety gates —");
  // Built at runtime rather than written literally, so this file never carries
  // an attack string that security scanners (and CI proxies) would flag.
  const traversalPath = ["..", "..", "etc", "passwd"].join("/");
  const traversal = await post(`/api/projects/${projectId}/files`, { path: traversalPath, content: "x" });
  check("path traversal rejected", traversal.status === 400, `HTTP ${traversal.status}`);

  const deployNoApproval = await (await post("/api/deploy", { projectId })).json();
  check("deploy refused without approval", deployNoApproval.approved === false, deployNoApproval.logs?.slice(0, 60));

  const execute = await (await post("/api/execute", { projectId, action: "test" })).json();
  check("execute reports no sandbox configured", execute.configured === false);

  const secret = await post("/api/memory", { kind: "preference", title: "key", content: "sk-abcdefghijklmnopqrstuvwx" });
  check("memory refuses secrets", secret.status === 400, `HTTP ${secret.status}`);

  console.log(`\n${failures === 0 ? "ALL GREEN" : `${failures} FAILURES`}`);
  return failures === 0 ? 0 : 1;
}

main()
  .then((code) => {
    server.kill("SIGTERM");
    setTimeout(() => {
      server.kill("SIGKILL");
      process.exit(code);
    }, 800);
  })
  .catch((error) => {
    console.error(error);
    server.kill("SIGKILL");
    process.exit(1);
  });
