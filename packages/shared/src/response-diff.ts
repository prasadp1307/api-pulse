export type DiffEntry = {
  path: string;
  type: "added" | "removed" | "changed" | "type_mismatch";
  before?: unknown;
  after?: unknown;
  detail?: string;
};

function typeOf(v: unknown): string {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  return typeof v;
}

export function diffJson(before: unknown, after: unknown, basePath = ""): DiffEntry[] {
  const out: DiffEntry[] = [];

  if (typeOf(before) !== typeOf(after)) {
    out.push({
      path: basePath || "/",
      type: "type_mismatch",
      before,
      after,
      detail: `${typeOf(before)} → ${typeOf(after)}`,
    });
    return out;
  }

  if (before === null || after === null || typeof before !== "object" || typeof after !== "object") {
    if (before !== after) {
      out.push({ path: basePath || "/", type: "changed", before, after });
    }
    return out;
  }

  if (Array.isArray(before) && Array.isArray(after)) {
    const max = Math.max(before.length, after.length);
    for (let i = 0; i < max; i++) {
      const p = `${basePath}[${i}]`;
      if (i >= before.length) out.push({ path: p, type: "added", after: after[i] });
      else if (i >= after.length) out.push({ path: p, type: "removed", before: before[i] });
      else out.push(...diffJson(before[i], after[i], p));
    }
    return out;
  }

  const b = before as Record<string, unknown>;
  const a = after as Record<string, unknown>;
  const keys = new Set([...Object.keys(b), ...Object.keys(a)]);
  for (const key of keys) {
    const p = basePath ? `${basePath}.${key}` : key;
    if (!(key in b)) out.push({ path: p, type: "added", after: a[key] });
    else if (!(key in a)) out.push({ path: p, type: "removed", before: b[key] });
    else out.push(...diffJson(b[key], a[key], p));
  }
  return out;
}
