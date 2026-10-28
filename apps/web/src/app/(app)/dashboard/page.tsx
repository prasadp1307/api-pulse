"use client";

import Link from "next/link";
import useSWR from "swr";
import { RefreshCw } from "lucide-react";
import { LiveFeed } from "@/components/live-feed";
import { StatusBadge } from "@/components/status-badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime, formatRelativeMs, formatUptime } from "@/lib/format";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function DashboardPage() {
  const { data, error, isLoading, mutate } = useSWR("/api/dashboard", fetcher, {
    refreshInterval: 15000,
  });

  if (isLoading) {
    return <p className="text-sm text-zinc-500">Loading overview…</p>;
  }
  if (error || data?.error) {
    return <p className="alert-error">Could not load dashboard data.</p>;
  }

  const totals = data.totals;

  return (
    <div>
      <PageHeader
        title="Overview"
        description="Rolling 24-hour health summary across all monitors."
        actions={
          <button type="button" className="btn-secondary" onClick={() => mutate()}>
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Refresh
          </button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total monitors", value: String(totals.monitors) },
          { label: "Active", value: String(totals.enabled) },
          { label: "Probe runs (24h)", value: totals.checks24h.toLocaleString() },
          { label: "Aggregate uptime", value: formatUptime(totals.uptime24h) },
        ].map((s) => (
          <div key={s.label} className="metric">
            <p className="metric-label">{s.label}</p>
            <p className="metric-value">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <section className="panel overflow-hidden">
            <div className="panel-header">
              <h2 className="panel-title">Monitors</h2>
              <Link href="/monitors/new" className="btn-ghost text-xs">
                Add monitor
              </Link>
            </div>
            {data.monitors.length === 0 ? (
              <EmptyState
                title="No monitors configured"
                description="Create an HTTP probe to start collecting uptime and latency data."
                action={
                  <Link href="/monitors/new" className="btn-primary">
                    New monitor
                  </Link>
                }
              />
            ) : (
              <ul className="divide-y divide-[var(--border-subtle)]">
                {data.monitors.map(
                  (m: {
                    id: string;
                    name: string;
                    url: string;
                    lastStatus: string | null;
                    lastLatencyMs: number | null;
                    lastCheckedAt: string | null;
                    uptime24h: number;
                  }) => (
                    <li key={m.id}>
                      <Link
                        href={`/monitors/${m.id}`}
                        className="flex flex-col gap-2 px-4 py-3 hover:bg-zinc-900/40 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-zinc-200">{m.name}</p>
                          <p className="truncate font-mono text-2xs text-zinc-500">{m.url}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                          <span>{formatUptime(m.uptime24h)}</span>
                          <span className="font-mono">{formatRelativeMs(m.lastLatencyMs)}</span>
                          {m.lastCheckedAt && (
                            <span className="hidden md:inline">{formatDateTime(m.lastCheckedAt)}</span>
                          )}
                          <StatusBadge status={m.lastStatus} />
                        </div>
                      </Link>
                    </li>
                  )
                )}
              </ul>
            )}
          </section>

          <section className="panel">
            <div className="panel-header border-b-0 pb-0">
              <h2 className="panel-title">Alerts (24h)</h2>
            </div>
            <div className="panel-body pt-2">
              {data.alerts.length === 0 ? (
                <p className="text-sm text-zinc-500">No alert events in the last 24 hours.</p>
              ) : (
                <ul className="space-y-2">
                  {data.alerts.map(
                    (a: {
                      id: string;
                      severity: string;
                      monitorName: string;
                      message: string;
                      createdAt: string;
                    }) => (
                      <li
                        key={a.id}
                        className="rounded border border-[var(--border-subtle)] px-3 py-2 text-sm"
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="font-medium text-zinc-300">{a.monitorName}</span>
                          <span className="font-mono text-2xs uppercase text-zinc-500">
                            {a.severity}
                          </span>
                        </div>
                        <p className="mt-1 text-zinc-500">{a.message}</p>
                        <p className="mt-1 font-mono text-2xs text-zinc-600">
                          {formatDateTime(a.createdAt)}
                        </p>
                      </li>
                    )
                  )}
                </ul>
              )}
            </div>
          </section>
        </div>

        <LiveFeed />
      </div>
    </div>
  );
}
