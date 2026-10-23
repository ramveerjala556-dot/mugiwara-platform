import type { PlannedTask } from "./types";
import type { SiteSpec } from "@/lib/engine/spec";

/**
 * Deterministic planning. Used when no AI provider is configured, and as the
 * structural backbone when one is. Each task is assigned to a crew member and
 * wired with dependencies so the orchestrator can run it for real.
 */
export function buildPlan(spec: SiteSpec): PlannedTask[] {
  const archetypeWork: Record<SiteSpec["archetype"], string> = {
    tasks: "Implement the task list: add, complete, delete and persistence.",
    dashboard: "Implement metrics, the bar chart and CSV export.",
    store: "Implement the product grid, cart and running total.",
    booking: "Implement the booking form with validation and confirmation.",
    blog: "Implement the post list with tag filtering.",
    portfolio: "Implement the work grid with category labels.",
    landing: "Implement the hero, feature grid and sign-up form.",
  };

  return [
    {
      id: "requirements",
      agent: "navigator",
      title: "Extract requirements",
      description: `Turn the request into a concrete spec for “${spec.name}”.`,
      dependsOn: [],
      order: 0,
    },
    {
      id: "architecture",
      agent: "architect",
      title: "Design structure & data",
      description: "Decide the file structure, theming tokens and interactive state model.",
      dependsOn: ["requirements"],
      order: 1,
    },
    {
      id: "ui",
      agent: "designer",
      title: "Specify the interface",
      description: "Lay out sections, spacing, states (loading, empty, error) and accessibility.",
      dependsOn: ["requirements"],
      order: 2,
    },
    {
      id: "build",
      agent: "coder",
      title: "Generate the application",
      description: archetypeWork[spec.archetype],
      dependsOn: ["architecture", "ui"],
      order: 3,
    },
    {
      id: "verify",
      agent: "tester",
      title: "Verify the output",
      description: "Check the files parse, links resolve and the interactive section behaves.",
      dependsOn: ["build"],
      order: 4,
    },
    {
      id: "review",
      agent: "guardian",
      title: "Security review",
      description: "Confirm no secrets, no unsafe external loads and no dangerous operations.",
      dependsOn: ["build"],
      order: 5,
    },
  ];
}

/** Questions the Navigator asks when the request leaves real choices open. */
export function clarifyingQuestions(prompt: string, spec: SiteSpec): string[] {
  const questions: string[] = [];
  const lower = prompt.toLowerCase();

  if (prompt.trim().length < 40) {
    questions.push("What's the one thing a visitor should do on this page?");
  }
  if (!/\b(blue|green|purple|red|teal|gold|amber|orange|pink|dark|light|white|black)\b/.test(lower)) {
    questions.push(`I've gone with a ${spec.palette.name} theme — happy to switch colours if you prefer another.`);
  }
  if (!/\b(responsive|mobile|desktop)\b/.test(lower)) {
    questions.push("Should it be optimised mobile-first, or is desktop the priority?");
  }
  if (spec.archetype === "store" && !/\b(price|payment|checkout|cart)\b/.test(lower)) {
    questions.push("Do you need a real checkout, or is a browsable cart enough for now?");
  }
  if (spec.archetype === "dashboard" && !/\b(data|source|api|database)\b/.test(lower)) {
    questions.push("Where should the numbers come from — a file, an API, or typed in for now?");
  }
  if (spec.tags.includes("auth")) {
    questions.push("Should accounts be email/password, or would a social sign-in suit better?");
  }
  return questions.slice(0, 3);
}

/** Acceptance criteria shown to the user so "done" is well defined. */
export function acceptanceCriteria(spec: SiteSpec): string[] {
  const base = [
    "Opening index.html renders the page with no console errors.",
    "The layout is responsive down to a 360px-wide phone.",
    "The interactive section performs its core action end to end.",
    "Keyboard focus is visible on every control and a skip link is present.",
  ];
  const extra: Partial<Record<SiteSpec["archetype"], string>> = {
    tasks: "A task can be added, completed and removed, and survives a page reload.",
    dashboard: "Changing the data changes both the metrics and the bars.",
    store: "Adding items updates the cart and the total correctly.",
    booking: "An incomplete form is refused; a complete one confirms with the chosen slot.",
    blog: "Selecting a tag filters the posts shown.",
    portfolio: "Every work item renders with its title and category.",
    landing: "An invalid email is rejected; a valid one is accepted.",
  };
  const specific = extra[spec.archetype];
  return specific ? [...base, specific] : base;
}
