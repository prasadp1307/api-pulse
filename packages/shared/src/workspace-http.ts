import type { AuthConfig, KeyValueRow, WorkspaceRequest, WorkspaceResponse } from "./workspace-types";
import { interpolateEnv, interpolateKeyValues } from "./env-interpolate";

const MAX_RESPONSE_BYTES = 512 * 1024;
const DEFAULT_TIMEOUT_MS = 60000;

function applyAuth(
  authType: string | undefined,
  authConfig: AuthConfig | Record<string, unknown> | undefined,
  headers: Record<string, string>,
  url: URL
) {
  const cfg = authConfig as AuthConfig | undefined;
  if (!authType || authType === "none" || !cfg) return;

  if (authType === "bearer" && cfg.type === "bearer" && cfg.token) {
    headers.Authorization = `Bearer ${cfg.token}`;
  }
  if (authType === "apiKey" && cfg.type === "apiKey" && cfg.key && cfg.value) {
    if (cfg.addTo === "query") {
      url.searchParams.set(cfg.key, cfg.value);
    } else {
      headers[cfg.key] = cfg.value;
    }
  }
}

export async function executeWorkspaceRequest(
  input: WorkspaceRequest,
  options?: { timeoutMs?: number; env?: Record<string, string> }
): Promise<WorkspaceResponse> {
  const env = options?.env ?? input.environment ?? {};
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const start = performance.now();

  const queryRows = interpolateKeyValues(input.queryParams ?? [], env);
  const urlStr = interpolateEnv(input.url, env);
  const url = new URL(urlStr);
  for (const q of queryRows) {
    url.searchParams.append(q.key, q.value);
  }

  const headerRows = interpolateKeyValues(input.headers ?? [], env);
  const headers: Record<string, string> = {};
  for (const h of headerRows) {
    headers[h.key] = h.value;
  }

  applyAuth(input.authType, input.authConfig as AuthConfig, headers, url);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const method = input.method.toUpperCase();
  const init: RequestInit = { method, headers, signal: controller.signal, redirect: "follow" };

  if (input.body && !["GET", "HEAD"].includes(method)) {
    init.body = interpolateEnv(input.body, env);
    if (!headers["Content-Type"] && (input.bodyType === "json" || input.body?.trim().startsWith("{"))) {
      headers["Content-Type"] = "application/json";
    }
  }

  try {
    const res = await fetch(url.toString(), init);
    const latencyMs = Math.round(performance.now() - start);
    const buf = await res.arrayBuffer();
    const clipped = buf.byteLength > MAX_RESPONSE_BYTES ? buf.slice(0, MAX_RESPONSE_BYTES) : buf;
    const body = new TextDecoder().decode(clipped);
    const resHeaders: Record<string, string> = {};
    res.headers.forEach((v, k) => {
      resHeaders[k] = v;
    });

    let bodyParsed: unknown = body;
    try {
      bodyParsed = JSON.parse(body);
    } catch {
      bodyParsed = body;
    }

    return {
      status: res.status,
      statusText: res.statusText,
      latencyMs,
      headers: resHeaders,
      body,
      bodyParsed,
      sizeBytes: buf.byteLength,
    };
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start);
    const message =
      err instanceof Error
        ? err.name === "AbortError"
          ? `Request timed out after ${timeoutMs}ms`
          : err.message
        : "Request failed";
    return {
      status: 0,
      statusText: "Error",
      latencyMs,
      headers: {},
      body: message,
      bodyParsed: { error: message },
      sizeBytes: 0,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function rowsFromJson(json: unknown): KeyValueRow[] {
  if (!Array.isArray(json)) return [];
  return json.map((r) => ({
    key: String((r as KeyValueRow).key ?? ""),
    value: String((r as KeyValueRow).value ?? ""),
    enabled: (r as KeyValueRow).enabled !== false,
  }));
}
