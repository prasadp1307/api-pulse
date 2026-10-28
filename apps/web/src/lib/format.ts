export function formatDateTime(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function formatRelativeMs(ms: number | null | undefined): string {
  if (ms == null) return "—";
  return `${ms} ms`;
}

export function formatUptime(pct: number): string {
  return `${pct.toFixed(2)}%`;
}
