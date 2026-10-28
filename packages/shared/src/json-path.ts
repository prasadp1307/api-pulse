/** Minimal dot-path extractor e.g. data.token */
export function extractJsonPath(data: unknown, path: string): unknown {
  if (!path.trim()) return undefined;
  const parts = path.split(".").filter(Boolean);
  let cur: unknown = data;
  for (const part of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}
