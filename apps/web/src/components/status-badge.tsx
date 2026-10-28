export function StatusBadge({ status }: { status: string | null | undefined }) {
  if (status === "UP") return <span className="badge-up">Up</span>;
  if (status === "DOWN") return <span className="badge-down">Down</span>;
  if (status === "DEGRADED") return <span className="badge-degraded">Degraded</span>;
  return <span className="badge-neutral">—</span>;
}

export function HttpMethodBadge({ method }: { method: string }) {
  const m = method.toUpperCase();
  const tone =
    m === "GET"
      ? "text-sky-400 border-sky-900/70 bg-sky-950/30"
      : m === "POST"
        ? "text-emerald-400 border-emerald-900/70 bg-emerald-950/30"
        : m === "PUT" || m === "PATCH"
          ? "text-amber-400 border-amber-900/70 bg-amber-950/30"
          : m === "DELETE"
            ? "text-red-400 border-red-900/70 bg-red-950/30"
            : "text-zinc-400 border-zinc-700 bg-zinc-900";
  return (
    <span className={`badge ${tone}`}>{m}</span>
  );
}
