import { serverEnv } from "@/lib/env";
import type {
  BuildArtifact,
  ExecutionProvider,
  ExecutionResult,
} from "@/lib/engine/pipeline";

/**
 * Isolated execution. Generated code is UNTRUSTED and must never run on the
 * main application server. We expose a provider interface and ship two
 * implementations: a safe no-op and an HTTP client to a dedicated sandbox
 * service (e.g. a Firecracker/gVisor-backed runner) that you deploy separately.
 */

/** Default provider: performs no execution and says so honestly. */
class NoopExecutionProvider implements ExecutionProvider {
  readonly id = "none";
  isConfigured(): boolean {
    return true;
  }
  private unavailable(): ExecutionResult {
    return {
      ok: false,
      exitCode: 1,
      durationMs: 0,
      logs:
        "No execution provider is configured. Set EXECUTION_PROVIDER and EXECUTION_API_URL " +
        "to enable isolated builds, tests and previews. See README → Isolated execution.",
    };
  }
  async build(): Promise<ExecutionResult> {
    return this.unavailable();
  }
  async test(): Promise<ExecutionResult> {
    return this.unavailable();
  }
  async preview(): Promise<ExecutionResult> {
    return this.unavailable();
  }
  async stop(): Promise<void> {
    /* nothing to stop */
  }
}

/** HTTP client to a dedicated, network-restricted sandbox service. */
class HttpExecutionProvider implements ExecutionProvider {
  readonly id = "http";
  isConfigured(): boolean {
    const env = serverEnv();
    return Boolean(env.executionApiUrl);
  }

  private async call(
    action: "build" | "test" | "preview",
    artifact: BuildArtifact,
  ): Promise<ExecutionResult> {
    const env = serverEnv();
    const started = Date.now();
    try {
      const response = await fetch(`${env.executionApiUrl}/${action}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(env.executionApiKey ? { authorization: `Bearer ${env.executionApiKey}` } : {}),
        },
        body: JSON.stringify({ artifact, timeoutSeconds: env.runTimeoutSeconds }),
        // Never allow the sandbox call to hang the request indefinitely.
        signal: AbortSignal.timeout(env.runTimeoutSeconds * 1000),
      });
      const payload = (await response.json().catch(() => ({}))) as Partial<ExecutionResult>;
      return {
        ok: response.ok && Boolean(payload.ok),
        logs: payload.logs ?? `Execution service returned HTTP ${response.status}.`,
        exitCode: payload.exitCode ?? (response.ok ? 0 : 1),
        durationMs: payload.durationMs ?? Date.now() - started,
        url: payload.url,
      };
    } catch (error) {
      return {
        ok: false,
        exitCode: 1,
        durationMs: Date.now() - started,
        logs: `Execution service unreachable: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  build(artifact: BuildArtifact) {
    return this.call("build", artifact);
  }
  test(artifact: BuildArtifact) {
    return this.call("test", artifact);
  }
  preview(artifact: BuildArtifact) {
    return this.call("preview", artifact);
  }
  async stop(runId: string): Promise<void> {
    const env = serverEnv();
    await fetch(`${env.executionApiUrl}/runs/${runId}`, {
      method: "DELETE",
      headers: env.executionApiKey ? { authorization: `Bearer ${env.executionApiKey}` } : {},
    }).catch(() => undefined);
  }
}

export function getExecutionProvider(): ExecutionProvider {
  const env = serverEnv();
  return env.executionProvider === "http" && env.executionApiUrl
    ? new HttpExecutionProvider()
    : new NoopExecutionProvider();
}
