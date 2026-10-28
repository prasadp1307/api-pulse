export type MonitorCheckInput = {
  url: string;
  method: string;
  timeoutMs: number;
  expectedStatus: number;
  headers?: Record<string, string>;
  body?: string | null;
};

export type MonitorCheckResult = {
  status: "UP" | "DOWN" | "DEGRADED";
  httpStatus: number | null;
  latencyMs: number;
  errorMessage: string | null;
  responseBody: string | null;
};

const MAX_BODY_SNIPPET = 4096;

export async function runHealthCheck(input: MonitorCheckInput): Promise<MonitorCheckResult> {
  const start = performance.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs);

  try {
    const headers: Record<string, string> = {
      "User-Agent": "API-Pulse/1.0 Health-Checker",
      ...input.headers,
    };

    const init: RequestInit = {
      method: input.method,
      headers,
      signal: controller.signal,
      redirect: "follow",
    };

    if (input.body && !["GET", "HEAD"].includes(input.method)) {
      init.body = input.body;
      if (!headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
      }
    }

    const res = await fetch(input.url, init);
    const latencyMs = Math.round(performance.now() - start);
    let responseBody: string | null = null;
    try {
      const text = await res.text();
      responseBody = text.slice(0, MAX_BODY_SNIPPET);
    } catch {
      responseBody = null;
    }

    if (res.status !== input.expectedStatus) {
      return {
        status: res.ok ? "DEGRADED" : "DOWN",
        httpStatus: res.status,
        latencyMs,
        errorMessage: `Expected HTTP ${input.expectedStatus}, got ${res.status}`,
        responseBody,
      };
    }

    return {
      status: "UP",
      httpStatus: res.status,
      latencyMs,
      errorMessage: null,
      responseBody,
    };
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start);
    const message =
      err instanceof Error
        ? err.name === "AbortError"
          ? `Timeout after ${input.timeoutMs}ms`
          : err.message
        : "Unknown error";
    return {
      status: "DOWN",
      httpStatus: null,
      latencyMs,
      errorMessage: message,
      responseBody: null,
    };
  } finally {
    clearTimeout(timeout);
  }
}
