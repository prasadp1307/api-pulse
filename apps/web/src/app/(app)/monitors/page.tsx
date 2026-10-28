"use client";

import Link from "next/link";
import useSWR from "swr";
import { Plus } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime, formatRelativeMs } from "@/lib/format";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function MonitorsPage() {
  const { data, isLoading, mutate } = useSWR("/api/monitors", fetcher);

  async function toggleEnabled(id: string, enabled: boolean) {
    await fetch(`/api/monitors/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !enabled }),
    });
    mutate();
  }

  return (
    <div>
      <PageHeader
        title="Monitors"
        description="HTTP endpoints polled on a fixed interval by the background worker."
        actions={
          <Link href="/monitors/new" className="btn-primary">
            <Plus className="h-3.5 w-3.5" aria-hidden />
            New monitor
          </Link>
        }
      />

      {isLoading ? (
        <p className="text-sm text-zinc-500">Loading monitors…</p>
      ) : (data?.monitors?.length ?? 0) === 0 ? (
        <div className="panel">
          <EmptyState
            title="No monitors"
            description="Add a URL to track availability and response time."
            action={
              <Link href="/monitors/new" className="btn-primary">
                Create monitor
              </Link>
            }
          />
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th className="hidden md:table-cell">URL</th>
                <th>Interval</th>
                <th className="hidden sm:table-cell">Last run</th>
                <th>Status</th>
                <th className="w-24 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(data?.monitors ?? []).map(
                (m: {
                  id: string;
                  name: string;
                  url: string;
                  intervalSec: number;
                  enabled: boolean;
                  checks: { status: string; latencyMs: number; checkedAt: string }[];
                }) => {
                  const last = m.checks[0];
                  return (
                    <tr key={m.id}>
                      <td>
                        <Link
                          href={`/monitors/${m.id}`}
                          className="font-medium text-zinc-200 hover:text-blue-400"
                        >
                          {m.name}
                        </Link>
                        {!m.enabled && (
                          <span className="ml-2 text-2xs text-zinc-600">Paused</span>
                        )}
                      </td>
                      <td className="hidden max-w-xs truncate font-mono text-2xs text-zinc-500 md:table-cell">
                        {m.url}
                      </td>
                      <td className="font-mono text-xs text-zinc-400">{m.intervalSec}s</td>
                      <td className="hidden text-xs text-zinc-500 sm:table-cell">
                        {last ? (
                          <>
                            {formatRelativeMs(last.latencyMs)}
                            <span className="mt-0.5 block font-mono text-2xs text-zinc-600">
                              {formatDateTime(last.checkedAt)}
                            </span>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        <StatusBadge status={last?.status} />
                      </td>
                      <td className="text-right">
                        <button
                          type="button"
                          className="btn-ghost text-xs"
                          onClick={() => toggleEnabled(m.id, m.enabled)}
                        >
                          {m.enabled ? "Pause" : "Resume"}
                        </button>
                      </td>
                    </tr>
                  );
                }
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
