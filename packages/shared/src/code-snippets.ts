import type { WorkspaceRequest } from "./workspace-types";

export function toCurl(req: WorkspaceRequest): string {
  const parts = [`curl -X ${req.method.toUpperCase()} '${req.url}'`];
  for (const h of req.headers ?? []) {
    if (h.enabled && h.key) parts.push(`  -H '${h.key}: ${h.value}'`);
  }
  if (req.body && !["GET", "HEAD"].includes(req.method.toUpperCase())) {
    parts.push(`  -d '${req.body.replace(/'/g, "'\\''")}'`);
  }
  return parts.join(" \\\n");
}

export function toFetch(req: WorkspaceRequest): string {
  const headers: Record<string, string> = {};
  for (const h of req.headers ?? []) {
    if (h.enabled && h.key) headers[h.key] = h.value;
  }
  const init: Record<string, unknown> = {
    method: req.method.toUpperCase(),
    headers,
  };
  if (req.body && !["GET", "HEAD"].includes(req.method.toUpperCase())) {
    init.body = req.body;
  }
  return `const response = await fetch(${JSON.stringify(req.url)}, ${JSON.stringify(init, null, 2)});
const data = await response.json();`;
}
