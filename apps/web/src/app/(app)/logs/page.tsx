"use client";

import useSWR from "swr";
import { StatusBadge, HttpMethodBadge } from "@/components/status-badge";
import { PageHeader } from "@/components/ui/page-header";
import { formatDateTime, formatRelativeMs } from "@/lib/format";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function LogsPage() {
  const { data, isLoading } = useSWR("/api/logs?limit=80", fetcher, { refreshInterval: 10000 });

  return (
    <div>
      <PageHeader
        title="Logs"
        description="Application API traffic and stored health-check results."
      />

      {isLoading ? (
        <p className="text-sm text-zinc-500">Loading log entries…</p>
      ) : (
        <div className="space-y-6">
          <section>
            <h2 className="mb-2 text-sm font-medium text-zinc-300">Control plane</h2>
            <div className="table-wrap">
              <table className="data-table font-mono text-xs">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Method</th>
                    <th>Path</th>
                    <th>Status</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.apiLogs ?? []).map(
                    (l: {
                      id: string;
                      createdAt: string;
                      method: string;
                      path: string;
                      statusCode: number;
                      latencyMs: number;
                    }) => (
                      <tr key={l.id}>
                        <td className="text-zinc-500">{formatDateTime(l.createdAt)}</td>
                        <td>
                          <HttpMethodBadge method={l.method} />
                        </td>
                        <td className="text-zinc-400">{l.path}</td>
                        <td className="text-zinc-300">{l.statusCode}</td>
                        <td className="text-zinc-500">{formatRelativeMs(l.latencyMs)}</td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-medium text-zinc-300">Probe results</h2>
            <div className="table-wrap">
              <table className="data-table text-sm">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Monitor</th>
                    <th>Status</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.healthCheckLogs ?? []).map(
                    (c: {
                      id: string;
                      checkedAt: string;
                      status: string;
                      latencyMs: number;
                      monitor: { name: string };
                    }) => (
                      <tr key={c.id}>
                        <td className="font-mono text-xs text-zinc-500">
                          {formatDateTime(c.checkedAt)}
                        </td>
                        <td className="text-zinc-300">{c.monitor.name}</td>
                        <td>
                          <StatusBadge status={c.status} />
                        </td>
                        <td className="font-mono text-xs text-zinc-500">
                          {formatRelativeMs(c.latencyMs)}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
