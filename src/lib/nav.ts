import {
  LayoutDashboard,
  Sparkles,
  FolderKanban,
  Users,
  Brain,
  Target,
  Workflow,
  Puzzle,
  BarChart3,
  FolderOpen,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
}

/** Primary navigation — mirrors the sidebar in the reference design. */
export const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard, description: "Command deck" },
  { label: "Workspace", href: "/workspace", icon: Sparkles, description: "Prompt to application" },
  { label: "Projects", href: "/projects", icon: FolderKanban, description: "Everything you're building" },
  { label: "Crew", href: "/crew", icon: Users, description: "Your AI specialists" },
  { label: "Memory", href: "/memory", icon: Brain, description: "Memory Vault" },
  { label: "Missions", href: "/missions", icon: Target, description: "Milestones & tasks" },
  { label: "Automations", href: "/automations", icon: Workflow, description: "Scheduled workflows" },
  { label: "Skills", href: "/skills", icon: Puzzle, description: "Reusable capabilities" },
  { label: "Analytics", href: "/analytics", icon: BarChart3, description: "Usage & outcomes" },
  { label: "Files", href: "/files", icon: FolderOpen, description: "Project files" },
  { label: "Settings", href: "/settings", icon: Settings, description: "Account & providers" },
];
