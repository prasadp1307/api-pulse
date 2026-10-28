"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { LatencyChart } from "@/components/latency-chart";
import { StatusBadge } from "@/components/status-badge";
import { PageHeader } from "@/components/ui/page-header";
import { formatDateTime, formatRelativeMs, formatUptime } from "@/lib/format";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function MonitorDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const { data: monitorData, mutate: mutateMonitor } = useSWR(
    id ? `/api/monitors/${id}` : null,
    fetcher,
    { refreshInterval: 10000 }
  );
  const { data: stats, mutate: mutateStats } = useSWR(
    id ? `/api/monitors/${id}/stats?hours=24` : null,
    fetcher,
    { refreshInterval: 10000 }
  );

  async function checkNow() {
    await fetch(`/api/monitors/${id}/check-now`, { method: "POST" });
    mutateMonitor();
    mutateStats();
  }

  async function removeMonitor() {
    if (!confirm("Delete this monitor and all check history?")) return;
    await fetch(`/api/monitors/${id}`, { method: "DELETE" });
    window.location.href = "/monitors";
  }

  const monitor = monitorData?.monitor;
  if (!monitor) {
    return <p className="text-sm text-zinc-500">Loading monitor…</p>;
  }

  const latest = monitor.checks?.[0];

  return (
    <div>
      <PageHeader
        title={monitor.name}
        description={monitor.url}
        actions={
          <>
            <Link href="/monitors" className="btn-ghost text-xs">
              Back
            </Link>
            <button type="button" className="btn-secondary" onClick={checkNow}>
              Run check
            </button>
            <button type="button" className="btn-danger" onClick={removeMonitor}>
              Delete
            </button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="metric">
          <p className="metric-label">Current state</p>
          <div className="mt-2">
            <StatusBadge status={latest?.status} />
          </div>
        </div>
        <div className="metric">
          <p className="metric-label">Uptime (24h)</p>
          <p className="metric-value text-xl">
            {stats?.uptimePercent != null ? formatUptime(stats.uptimePercent) : "—"}
          </p>
        </div>
        <div className="metric">
          <p className="metric-label">p95</p>
          <p className="metric-value text-xl">
            {stats?.latency?.p95 != null ? formatRelativeMs(stats.latency.p95) : "—"}
          </p>
        </div>
        <div className="metric">
          <p className="metric-label">p99</p>
          <p className="metric-value text-xl">
            {stats?.latency?.p99 != null ? formatRelativeMs(stats.latency.p99) : "—"}
          </p>
        </div>
        <div className="metric">
          <p className="metric-label">Failures (24h)</p>
          <p className="metric-value text-xl">{stats?.failures ?? 0}</p>
        </div>
      </div>

      <section className="panel mt-4 p-4">
        <h2 className="mb-3 text-sm font-medium text-zinc-300">Latency trend</h2>
        <LatencyChart data={stats?.timeline ?? []} />
      </section>

      <section className="panel mt-4 overflow-hidden">
        <div className="panel-header">
          <h2 className="panel-title">Check log</h2>
        </div>
        <ul className="max-h-96 divide-y divide-[var(--border-subtle)] overflow-y-auto">
          {(monitor.checks ?? []).map(
            (c: {
              id: string;
              status: string;
              latencyMs: number;
              httpStatus: number | null;
              errorMessage: string | null;
              checkedAt: string;
            }) => (
              <li
                key={c.id}
                className="flex flex-col gap-2 px-4 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-mono text-xs text-zinc-500">{formatDateTime(c.checkedAt)}</p>
                  {c.errorMessage && (
                    <p className="mt-0.5 text-xs text-red-400/90">{c.errorMessage}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 font-mono text-xs text-zinc-500">
                  <span>HTTP {c.httpStatus ?? "—"}</span>
                  <span>{formatRelativeMs(c.latencyMs)}</span>
                  <StatusBadge status={c.status} />
                </div>
              </li>
            )
          )}
        </ul>
      </section>
    </div>
  );
}
