import type { TestScriptResult, WorkspaceResponse } from "./workspace-types";

export function runTestScript(
  script: string | null | undefined,
  response: WorkspaceResponse,
  env: Record<string, string>
): TestScriptResult {
  const logs: string[] = [];
  if (!script?.trim()) {
    return { passed: true, logs: ["No tests defined"] };
  }

  try {
    const assert = (condition: boolean, message?: string) => {
      if (!condition) {
        throw new Error(message ?? "Assertion failed");
      }
      logs.push(message ? `✓ ${message}` : "✓ assertion passed");
    };

    const responseProxy = {
      status: response.status,
      statusText: response.statusText,
      latencyMs: response.latencyMs,
      headers: response.headers,
      body: response.body,
      json: response.bodyParsed,
    };

    // eslint-disable-next-line no-new-func
    const fn = new Function("response", "env", "assert", script);
    fn(responseProxy, env, assert);
    logs.push("All tests passed");
    return { passed: true, logs };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Test script error";
    return { passed: false, logs, error: message };
  }
}
