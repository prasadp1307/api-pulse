"use client";

import { useMemo, useState } from "react";
import type { ApiResponseView } from "./types";
import { formatRelativeMs } from "@/lib/format";

export function ResponseViewer({
  response,
  tests,
}: {
  response: ApiResponseView | null;
  tests?: { passed: boolean; logs: string[]; error?: string } | null;
}) {
  const [tab, setTab] = useState<"body" | "headers" | "tests">("body");

  const formattedBody = useMemo(() => {
    if (!response) return "";
    if (typeof response.bodyParsed === "object") {
      try {
        return JSON.stringify(response.bodyParsed, null, 2);
      } catch {
        return response.body;
      }
    }
    return response.body;
  }, [response]);

  if (!response) {
    return (
      <div className="panel flex min-h-[240px] items-center justify-center border-dashed p-6">
        <p className="text-sm text-zinc-600">Response will appear here after you send a request.</p>
      </div>
    );
  }

  const statusTone =
    response.status >= 200 && response.status < 300
      ? "text-emerald-500"
      : response.status >= 400
        ? "text-red-400"
        : "text-amber-500";

  return (
    <section className="panel flex min-h-[280px] flex-col">
      <div className="panel-header flex-wrap gap-2">
        <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
          <span className={`font-semibold ${statusTone}`}>
            {response.status} {response.statusText}
          </span>
          <span className="text-zinc-500">{formatRelativeMs(response.latencyMs)}</span>
          <span className="text-zinc-600">{response.sizeBytes.toLocaleString()} B</span>
        </div>
        <div className="flex gap-2" role="tablist" aria-label="Response sections">
          {(["body", "headers", "tests"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              className={`tab capitalize ${tab === t ? "tab-active" : ""}`}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-auto p-3 font-mono text-xs leading-relaxed text-zinc-400">
        {tab === "body" && <pre className="whitespace-pre-wrap break-all">{formattedBody}</pre>}
        {tab === "headers" && <pre>{JSON.stringify(response.headers, null, 2)}</pre>}
        {tab === "tests" && (
          <div className="space-y-2 font-sans text-sm">
            {!tests && <p className="text-zinc-600">No test script configured.</p>}
            {tests && (
              <>
                <p className={tests.passed ? "text-emerald-500" : "text-red-400"}>
                  {tests.passed ? "All assertions passed" : "Assertion failure"}
                </p>
                {tests.error && <p className="text-red-400/90">{tests.error}</p>}
                <ul className="space-y-1 text-xs text-zinc-500">
                  {tests.logs.map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
