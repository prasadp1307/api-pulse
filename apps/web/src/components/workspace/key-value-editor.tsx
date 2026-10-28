"use client";

import type { KeyValueRow } from "@/components/workspace/types";

export function KeyValueEditor({
  rows,
  onChange,
  placeholderKey = "Key",
  placeholderValue = "Value",
}: {
  rows: KeyValueRow[];
  onChange: (rows: KeyValueRow[]) => void;
  placeholderKey?: string;
  placeholderValue?: string;
}) {
  function update(i: number, patch: Partial<KeyValueRow>) {
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function addRow() {
    onChange([...rows, { key: "", value: "", enabled: true }]);
  }

  function remove(i: number) {
    onChange(rows.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-1.5">
      {rows.map((row, i) => (
        <div key={i} className="grid grid-cols-[auto_1fr_1fr_auto] gap-2">
          <input
            type="checkbox"
            checked={row.enabled}
            onChange={(e) => update(i, { enabled: e.target.checked })}
            className="mt-2"
            aria-label={`Enable row ${i + 1}`}
          />
          <input
            className="input font-mono text-xs"
            placeholder={placeholderKey}
            value={row.key}
            onChange={(e) => update(i, { key: e.target.value })}
          />
          <input
            className="input font-mono text-xs"
            placeholder={placeholderValue}
            value={row.value}
            onChange={(e) => update(i, { value: e.target.value })}
          />
          <button
            type="button"
            className="btn-ghost px-2 text-xs text-zinc-600"
            onClick={() => remove(i)}
            aria-label="Remove row"
          >
            ×
          </button>
        </div>
      ))}
      <button type="button" className="btn-ghost text-xs" onClick={addRow}>
        Add row
      </button>
    </div>
  );
}
