"use client";

import { Plus, Search, FolderPlus } from "lucide-react";
import { HttpMethodBadge } from "@/components/status-badge";
import { formatRelativeMs } from "@/lib/format";

type Collection = {
  id: string;
  name: string;
  requests: { id: string; name: string; method: string }[];
};

export function WorkspaceSidebar({
  collections,
  collectionSearch,
  onSearchChange,
  onAddCollection,
  onAddApi,
  onSelectRequest,
  onExport,
  onImport,
  environments,
  activeEnvId,
  onSelectEnv,
  onCreateEnv,
  history,
}: {
  collections: Collection[];
  collectionSearch: string;
  onSearchChange: (q: string) => void;
  onAddCollection: () => void;
  onAddApi: (collectionId: string) => void;
  onSelectRequest: (req: Record<string, unknown>) => void;
  onExport: (collectionId: string) => void;
  onImport: (collectionId: string) => void;
  environments: { id: string; name: string }[];
  activeEnvId?: string;
  onSelectEnv: (id: string) => void;
  onCreateEnv: () => void;
  history: { id: string; method: string; url: string; statusCode: number | null; latencyMs: number }[];
}) {
  const q = collectionSearch.trim().toLowerCase();
  const filtered = collections
    .map((c) => ({
      ...c,
      requests: c.requests.filter(
        (r) =>
          !q ||
          r.name.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q)
      ),
    }))
    .filter((c) => !q || c.requests.length > 0 || c.name.toLowerCase().includes(q));

  return (
    <aside className="flex w-full shrink-0 flex-col gap-3 lg:w-64 xl:w-72">
      <div className="panel">
        <div className="panel-header">
          <h2 className="panel-title">Collections</h2>
          <button type="button" className="btn-primary text-xs" onClick={onAddCollection}>
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Add API
          </button>
        </div>
        <div className="border-b border-[var(--border-subtle)] px-2 py-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-2 h-3.5 w-3.5 text-zinc-600" />
            <input
              className="input pl-8 text-xs"
              placeholder="Search requests…"
              value={collectionSearch}
              onChange={(e) => onSearchChange(e.target.value)}
              aria-label="Search collections"
            />
          </div>
        </div>
        <div className="max-h-56 space-y-2 overflow-y-auto p-2">
          {filtered.map((c) => (
            <div key={c.id} className="rounded border border-[var(--border-subtle)]">
              <div className="flex items-center justify-between gap-1 border-b border-[var(--border-subtle)] px-2 py-1.5">
                <span className="truncate text-xs font-medium text-zinc-300">{c.name}</span>
                <button
                  type="button"
                  className="btn-ghost px-1.5 py-0.5 text-2xs"
                  onClick={() => onAddApi(c.id)}
                  title="Add API to collection"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
              <ul className="py-0.5">
                {c.requests.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-2 py-1 text-left hover:bg-zinc-900/50"
                      onClick={() => onSelectRequest(r as unknown as Record<string, unknown>)}
                    >
                      <HttpMethodBadge method={r.method} />
                      <span className="truncate text-xs text-zinc-500">{r.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex border-t border-[var(--border-subtle)]">
                <button type="button" className="btn-ghost flex-1 py-1 text-2xs" onClick={() => onExport(c.id)}>
                  Export
                </button>
                <button type="button" className="btn-ghost flex-1 py-1 text-2xs" onClick={() => onImport(c.id)}>
                  Import
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="px-1 py-4 text-center text-xs text-zinc-600">
              No collections. Click <strong>Add API</strong> to start.
            </p>
          )}
        </div>
        <div className="border-t border-[var(--border-subtle)] p-2">
          <button type="button" className="btn-secondary w-full text-xs" onClick={onAddCollection}>
            <FolderPlus className="h-3.5 w-3.5" aria-hidden />
            New collection
          </button>
        </div>
      </div>

      <div className="panel p-3">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-medium text-zinc-400">Environment</h2>
          <button type="button" className="btn-ghost px-2 py-0.5 text-2xs" onClick={onCreateEnv}>
            Add
          </button>
        </div>
        <select
          className="select text-xs"
          value={activeEnvId ?? ""}
          onChange={(e) => onSelectEnv(e.target.value)}
        >
          {environments.map((env) => (
            <option key={env.id} value={env.id}>
              {env.name}
            </option>
          ))}
        </select>
      </div>

      <div className="panel p-3">
        <h2 className="mb-2 text-xs font-medium text-zinc-400">History</h2>
        <ul className="max-h-32 space-y-1 overflow-y-auto text-xs">
          {history.map((h) => (
            <li key={h.id} className="border-b border-[var(--border-subtle)] py-1 text-zinc-600 last:border-0">
              <span className="font-mono text-2xs">{h.method}</span> {h.statusCode ?? "—"} ·{" "}
              {formatRelativeMs(h.latencyMs)}
              <div className="truncate font-mono text-2xs">{h.url}</div>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
