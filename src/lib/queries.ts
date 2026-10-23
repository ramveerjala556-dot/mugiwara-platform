import { getStore } from "@/lib/store";
import type {
  AgentRunRow,
  DeploymentRow,
  ExecutionLogRow,
  FileRow,
  MemoryRow,
  MessageRow,
  MissionRow,
  ProjectRow,
  TaskRow,
  TestResultRow,
  UsageEventRow,
} from "@/types/database";

/**
 * Server-side read helpers used by pages. All of them go through the active
 * DataStore, so they work identically against Supabase or the local fallback,
 * and they never throw into a page render — a failed read becomes an empty
 * list and an honest empty state.
 */

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export const listProjects = (userId: string, limit?: number): Promise<ProjectRow[]> =>
  safe(async () => (await getStore()).listProjects(userId, limit), []);

export const getProject = (userId: string, id: string): Promise<ProjectRow | null> =>
  safe(async () => (await getStore()).getProject(userId, id), null);

export const listMemories = (userId: string, limit?: number): Promise<MemoryRow[]> =>
  safe(async () => (await getStore()).listMemories(userId, limit), []);

export const listRecentLogs = (userId: string, limit = 8): Promise<ExecutionLogRow[]> =>
  safe(async () => (await getStore()).listLogs(userId, undefined, limit), []);

export const listUsage = (userId: string, limit = 500): Promise<UsageEventRow[]> =>
  safe(async () => (await getStore()).listUsage(userId, limit), []);

export const listFiles = (userId: string, projectId: string): Promise<FileRow[]> =>
  safe(async () => (await getStore()).listFiles(userId, projectId), []);

export const listTasks = (userId: string, projectId: string): Promise<TaskRow[]> =>
  safe(async () => (await getStore()).listTasks(userId, projectId), []);

export const listMessages = (userId: string, projectId: string): Promise<MessageRow[]> =>
  safe(async () => (await getStore()).listMessages(userId, projectId), []);

export const listProjectLogs = (userId: string, projectId: string, limit = 200): Promise<ExecutionLogRow[]> =>
  safe(async () => (await getStore()).listLogs(userId, projectId, limit), []);

export const listTests = (userId: string, projectId: string): Promise<TestResultRow[]> =>
  safe(async () => (await getStore()).listTests(userId, projectId), []);

export const listAgentRuns = (userId: string, projectId: string): Promise<AgentRunRow[]> =>
  safe(async () => (await getStore()).listAgentRuns(userId, projectId), []);

export const listDeployments = (userId: string, projectId: string): Promise<DeploymentRow[]> =>
  safe(async () => (await getStore()).listDeployments(userId, projectId), []);

/** Missions are not yet wired to a UI write path; kept for parity. */
export const listMissions = async (_userId: string): Promise<MissionRow[]> => [];

/** Agent runs per day for the last 7 days — used by the Productivity panel. */
export function weeklyRunCounts(usage: UsageEventRow[]): { day: string; value: number }[] {
  const days: { day: string; value: number }[] = [];
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    const value = usage.filter(
      (event) => event.kind === "agent_run" && event.created_at.slice(0, 10) === key,
    ).length;
    days.push({ day: labels[date.getDay()], value });
  }
  return days;
}
