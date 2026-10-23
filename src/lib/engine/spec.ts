/**
 * Prompt analysis: turn a natural-language request into a concrete build spec.
 *
 * This runs for every prompt. When an AI provider is configured its output
 * refines the spec; when one isn't, the spec is still good enough to build a
 * real, working website. Nothing here is a stub — the spec drives real files.
 */

export type Archetype =
  | "landing"
  | "portfolio"
  | "tasks"
  | "dashboard"
  | "blog"
  | "booking"
  | "store";

export interface Palette {
  name: string;
  primary: string;
  accent: string;
  bg: string;
  surface: string;
  text: string;
  muted: string;
}

export interface Feature {
  title: string;
  body: string;
}

export interface SiteSpec {
  name: string;
  tagline: string;
  description: string;
  archetype: Archetype;
  palette: Palette;
  features: Feature[];
  navItems: string[];
  /** Extra keyword tags detected, e.g. ["login", "chart", "search"]. */
  tags: string[];
}

const PALETTES: Record<string, Palette> = {
  gold: {
    name: "gold",
    primary: "#c8891a",
    accent: "#f0b429",
    bg: "#0b1220",
    surface: "#141d31",
    text: "#f6f1e4",
    muted: "#9aa6bd",
  },
  blue: {
    name: "blue",
    primary: "#2563eb",
    accent: "#38bdf8",
    bg: "#0a1020",
    surface: "#131c33",
    text: "#eaf1ff",
    muted: "#93a4c4",
  },
  green: {
    name: "green",
    primary: "#15803d",
    accent: "#34d399",
    bg: "#071410",
    surface: "#10241d",
    text: "#e8f7f0",
    muted: "#8fb8a8",
  },
  purple: {
    name: "purple",
    primary: "#7c3aed",
    accent: "#c084fc",
    bg: "#0d0a1c",
    surface: "#1a1433",
    text: "#f1ecff",
    muted: "#a99fc9",
  },
  red: {
    name: "red",
    primary: "#dc2626",
    accent: "#fb923c",
    bg: "#150a0a",
    surface: "#261313",
    text: "#fdeeea",
    muted: "#c9a49c",
  },
  teal: {
    name: "teal",
    primary: "#0d9488",
    accent: "#5eead4",
    bg: "#061414",
    surface: "#0f2626",
    text: "#e6fbf8",
    muted: "#8dbdb7",
  },
  light: {
    name: "light",
    primary: "#1d4ed8",
    accent: "#0ea5e9",
    bg: "#f8fafc",
    surface: "#ffffff",
    text: "#0f172a",
    muted: "#64748b",
  },
};

const PALETTE_KEYWORDS: Record<string, keyof typeof PALETTES> = {
  blue: "blue", azure: "blue", navy: "blue", ocean: "blue", sky: "blue",
  green: "green", emerald: "green", eco: "green", nature: "green", garden: "green",
  purple: "purple", violet: "purple", magenta: "purple", lavender: "purple",
  red: "red", crimson: "red", maroon: "red", fiery: "red", warm: "red",
  teal: "teal", turquoise: "teal", mint: "teal", aqua: "teal",
  light: "light", white: "light", bright: "light", clean: "light",
  gold: "gold", golden: "gold", amber: "gold", luxury: "gold", premium: "gold",
  dark: "gold", midnight: "gold",
};

const ARCHETYPE_KEYWORDS: { archetype: Archetype; words: string[] }[] = [
  { archetype: "tasks", words: ["todo", "to-do", "task manager", "task app", "kanban", "checklist", "attendance", "tracker", "notes app"] },
  { archetype: "dashboard", words: ["dashboard", "analytics", "admin panel", "metrics", "reports", "crm", "insights"] },
  { archetype: "store", words: ["store", "shop", "ecommerce", "e-commerce", "products", "cart", "checkout", "menu", "restaurant", "cafe", "coffee"] },
  { archetype: "booking", words: ["booking", "reservation", "appointment", "schedule a", "book a", "clinic", "salon"] },
  { archetype: "blog", words: ["blog", "articles", "news", "magazine", "posts", "publication"] },
  { archetype: "portfolio", words: ["portfolio", "personal site", "resume", "cv", "photographer", "designer portfolio", "freelancer"] },
  { archetype: "landing", words: ["landing", "website", "marketing", "startup", "saas", "product page", "homepage", "site"] },
];

const FEATURE_LIBRARY: Record<string, Feature> = {
  auth: { title: "Accounts & login", body: "Sign up, sign in and protected areas for your users." },
  search: { title: "Instant search", body: "Filter everything as you type — no page reloads." },
  charts: { title: "Live charts", body: "Visualise the numbers that matter, updated in real time." },
  export: { title: "CSV export", body: "Download your data in one click for spreadsheets and reports." },
  darkmode: { title: "Light & dark", body: "A theme that follows the visitor's system preference." },
  payments: { title: "Payments ready", body: "Checkout flow wired for a payment provider of your choice." },
  notifications: { title: "Notifications", body: "Keep users informed with timely, unobtrusive updates." },
  responsive: { title: "Fully responsive", body: "Looks right on phones, tablets and wide desktops." },
  accessibility: { title: "Accessible by default", body: "Keyboard navigation, focus states and semantic markup." },
  realtime: { title: "Real-time updates", body: "Changes appear instantly for everyone on the page." },
};

/** Extract a human-sounding project name from the prompt. */
function extractName(prompt: string, archetype: Archetype): string {
  const quoted = prompt.match(/["“'‘]([^"”'’]{2,50})["”'’]/);
  if (quoted) return titleCase(quoted[1]);

  const named = prompt.match(/\b(?:called|named|for|about)\s+([A-Za-z0-9][A-Za-z0-9 &'-]{2,40})/i);
  if (named) {
    const candidate = named[1].split(/\b(?:with|that|which|using|and|to|so|where)\b/i)[0].trim();
    if (candidate.length >= 3) return titleCase(candidate);
  }

  const defaults: Record<Archetype, string> = {
    landing: "Launchpad",
    portfolio: "Portfolio",
    tasks: "TaskFlow",
    dashboard: "Insight Board",
    blog: "The Journal",
    booking: "BookEasy",
    store: "The Shop",
  };
  return defaults[archetype];
}

function titleCase(input: string): string {
  return input
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function detectPalette(prompt: string): Palette {
  const lower = prompt.toLowerCase();
  for (const [keyword, key] of Object.entries(PALETTE_KEYWORDS)) {
    if (new RegExp(`\\b${keyword}\\b`).test(lower)) return PALETTES[key];
  }
  return PALETTES.gold;
}

function detectTags(prompt: string): string[] {
  const lower = prompt.toLowerCase();
  const found: string[] = [];
  const map: Record<string, string[]> = {
    auth: ["login", "sign in", "signup", "sign up", "auth", "accounts", "users", "teacher", "admin"],
    search: ["search", "filter", "find"],
    charts: ["chart", "graph", "analytics", "statistics", "report", "insights"],
    export: ["export", "csv", "download", "excel"],
    darkmode: ["dark mode", "light mode", "theme"],
    payments: ["payment", "checkout", "stripe", "billing", "cart"],
    notifications: ["notification", "alert", "email"],
    realtime: ["real-time", "realtime", "live"],
  };
  for (const [tag, words] of Object.entries(map)) {
    if (words.some((w) => lower.includes(w))) found.push(tag);
  }
  found.push("responsive", "accessibility");
  return Array.from(new Set(found));
}

function detectArchetype(prompt: string): Archetype {
  const lower = prompt.toLowerCase();
  for (const { archetype, words } of ARCHETYPE_KEYWORDS) {
    if (words.some((w) => lower.includes(w))) return archetype;
  }
  return "landing";
}

function buildFeatures(archetype: Archetype, tags: string[]): Feature[] {
  const base: Record<Archetype, Feature[]> = {
    landing: [
      { title: "Fast by default", body: "A single static page that loads instantly on any connection." },
      { title: "Clear call to action", body: "Every section points the visitor toward one next step." },
    ],
    portfolio: [
      { title: "Work that speaks", body: "A curated grid of projects with room for context and results." },
      { title: "About & contact", body: "Tell your story and make it effortless to get in touch." },
    ],
    tasks: [
      { title: "Add & complete", body: "Capture tasks instantly and tick them off as you go." },
      { title: "Saved locally", body: "Your list persists between visits — no account required." },
    ],
    dashboard: [
      { title: "At-a-glance metrics", body: "Key numbers surfaced above the fold with clear trend lines." },
      { title: "Breakdown tables", body: "Drill from a summary into the detail behind it." },
    ],
    blog: [
      { title: "Readable by design", body: "Generous type, comfortable measure and calm spacing." },
      { title: "Tag & browse", body: "Organise posts so readers can find the thread they care about." },
    ],
    booking: [
      { title: "Pick a slot", body: "A simple date and time picker with instant confirmation." },
      { title: "Confirmations", body: "Clear success states so nobody wonders whether it worked." },
    ],
    store: [
      { title: "Browse the range", body: "A clean product grid with prices and quick detail views." },
      { title: "Cart that works", body: "Add items, adjust quantities and see the running total." },
    ],
  };
  const extras = tags.map((tag) => FEATURE_LIBRARY[tag]).filter(Boolean);
  const seen = new Set<string>();
  return [...base[archetype], ...extras].filter((f) => {
    if (seen.has(f.title)) return false;
    seen.add(f.title);
    return true;
  }).slice(0, 6);
}

function navFor(archetype: Archetype): string[] {
  switch (archetype) {
    case "tasks":
      return ["Overview", "Tasks", "About"];
    case "dashboard":
      return ["Overview", "Reports", "Settings"];
    case "store":
      return ["Home", "Products", "Cart"];
    case "blog":
      return ["Home", "Articles", "About"];
    case "booking":
      return ["Home", "Book", "Contact"];
    case "portfolio":
      return ["Work", "About", "Contact"];
    default:
      return ["Home", "Features", "Contact"];
  }
}

/** Build the full spec for a prompt. */
export function analyzePrompt(prompt: string): SiteSpec {
  const archetype = detectArchetype(prompt);
  const palette = detectPalette(prompt);
  const tags = detectTags(prompt);
  const name = extractName(prompt, archetype);

  const taglines: Record<Archetype, string> = {
    landing: "Built to convert, designed to be remembered.",
    portfolio: "Selected work, thoughtfully presented.",
    tasks: "Everything on your plate, finally under control.",
    dashboard: "The numbers you need, without the noise.",
    blog: "Ideas worth your time.",
    booking: "Your next appointment, two clicks away.",
    store: "Quality you can browse from anywhere.",
  };

  return {
    name,
    tagline: taglines[archetype],
    description: prompt.trim().slice(0, 400),
    archetype,
    palette,
    features: buildFeatures(archetype, tags),
    navItems: navFor(archetype),
    tags,
  };
}
