import { serverEnv } from "@/lib/env";

/**
 * Deployment provider interface (Phase 9). We ship a safe default that refuses
 * to pretend a deployment happened, and a generic HTTP provider you can point
 * at a real host. A deployment is never reported as successful unless the
 * provider confirms it — see `DeployResult.status`.
 */
export interface DeployRequest {
  projectId: string;
  sourceUrl: string;
  envVars: Record<string, string>;
}

export interface DeployResult {
  status: "pending" | "building" | "ready" | "error" | "unconfigured";
  url?: string;
  logs: string;
}

export interface DeployProvider {
  readonly id: string;
  isConfigured(): boolean;
  deploy(request: DeployRequest): Promise<DeployResult>;
  status(deploymentId: string): Promise<DeployResult>;
}

class NoopDeployProvider implements DeployProvider {
  readonly id = "none";
  isConfigured(): boolean {
    return false;
  }
  async deploy(): Promise<DeployResult> {
    return {
      status: "unconfigured",
      logs:
        "No deployment provider is configured. Set DEPLOY_PROVIDER and DEPLOY_API_TOKEN, " +
        "then approve a deployment to proceed. Nothing was deployed.",
    };
  }
  async status(): Promise<DeployResult> {
    return { status: "unconfigured", logs: "No deployment provider is configured." };
  }
}

class HttpDeployProvider implements DeployProvider {
  readonly id = "http";
  isConfigured(): boolean {
    const env = serverEnv();
    return Boolean(env.deployApiToken) && env.deployProvider === "http";
  }
  async deploy(request: DeployRequest): Promise<DeployResult> {
    const env = serverEnv();
    const response = await fetch(`${env.executionApiUrl}/deploy`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${env.deployApiToken}`,
      },
      body: JSON.stringify(request),
    }).catch(() => null);
    if (!response) {
      return { status: "error", logs: "Deployment provider unreachable." };
    }
    const payload = (await response.json().catch(() => ({}))) as Partial<DeployResult>;
    return {
      status: payload.status ?? (response.ok ? "pending" : "error"),
      url: payload.url,
      logs: payload.logs ?? `Provider responded HTTP ${response.status}.`,
    };
  }
  async status(deploymentId: string): Promise<DeployResult> {
    const env = serverEnv();
    const response = await fetch(`${env.executionApiUrl}/deploy/${deploymentId}`, {
      headers: { authorization: `Bearer ${env.deployApiToken}` },
    }).catch(() => null);
    if (!response) return { status: "error", logs: "Deployment provider unreachable." };
    const payload = (await response.json().catch(() => ({}))) as Partial<DeployResult>;
    return { status: payload.status ?? "error", url: payload.url, logs: payload.logs ?? "" };
  }
}

export function getDeployProvider(): DeployProvider {
  const env = serverEnv();
  return env.deployProvider === "http" && env.deployApiToken
    ? new HttpDeployProvider()
    : new NoopDeployProvider();
}
