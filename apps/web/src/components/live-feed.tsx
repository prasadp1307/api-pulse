"use client";

import { useEffect, useState } from "react";
import { StatusBadge } from "./status-badge";
import { formatDateTime, formatRelativeMs } from "@/lib/format";

type LiveEvent = {
  type: string;
  monitorName?: string;
  status?: string;
  latencyMs?: number;
  checkedAt?: string;
};

export function LiveFeed() {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const es = new EventSource("/api/live");
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data) as LiveEvent;
        if (data.type === "health_check") {
          setEvents((prev) => [data, ...prev].slice(0, 25));
        }
      } catch {
        /* ignore */
      }
    };
    return () => es.close();
  }, []);

  return (
    <section className="panel flex flex-col">
      <div className="panel-header">
        <h2 className="panel-title">Live probe stream</h2>
        <span
          className={`font-mono text-2xs ${connected ? "text-emerald-500" : "text-zinc-600"}`}
          title={connected ? "Connected" : "Disconnected"}
        >
          {connected ? "SSE live" : "Offline"}
        </span>
      </div>
      <div className="max-h-80 flex-1 overflow-y-auto p-2">
        {events.length === 0 ? (
          <p className="px-2 py-6 text-sm text-zinc-500">
            Probe events appear here when the worker is running.
          </p>
        ) : (
          <ul className="space-y-1">
            {events.map((e, i) => (
              <li
                key={`${e.checkedAt}-${i}`}
                className="flex items-start justify-between gap-2 rounded border border-transparent px-2 py-1.5 hover:border-[var(--border-subtle)] hover:bg-zinc-900/30"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-zinc-300">{e.monitorName}</p>
                  <p className="font-mono text-2xs text-zinc-600">
                    {e.checkedAt ? formatDateTime(e.checkedAt) : "—"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-mono text-2xs text-zinc-500">
                    {formatRelativeMs(e.latencyMs)}
                  </span>
                  <StatusBadge status={e.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
