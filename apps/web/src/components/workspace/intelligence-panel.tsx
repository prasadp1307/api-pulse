"use client";

import type { DiffEntry } from "@api-pulse/shared";
import type { GeneratedTest } from "@api-pulse/shared";

type Intelligence = {
  summary: string;
  facts: { kind: string; category: string; message: string; action?: string }[];
  hypotheses: { kind: string; category: string; message: string; action?: string }[];
  suggestedFixes: string[];
  followUpTests: string[];
};

type Performance = {
  latencyMs: number;
  rating: string;
  baselineMs: number | null;
  p50: number | null;
  p95: number | null;
  sampleCount: number;
};

export function IntelligencePanel({
  intelligence,
  diff,
  security,
  performance,
  contractValidation,
  generatedTests,
  onApplyTest,
}: {
  intelligence: Intelligence | null;
  diff: DiffEntry[] | null;
  security: { severity: string; message: string }[] | null;
  performance: Performance | null;
  contractValidation: { valid: boolean; errors: string[] } | null;
  generatedTests: GeneratedTest[] | null;
  onApplyTest?: (test: GeneratedTest) => void;
}) {
  if (!intelligence) {
    return (
      <aside className="panel flex h-full min-h-[320px] flex-col lg:min-w-[300px] lg:max-w-[360px]">
        <div className="panel-header">
          <h2 className="panel-title">Pulse Intelligence</h2>
        </div>
        <p className="p-4 text-sm text-zinc-600">
          Send a request to see verified facts, hypotheses, diffs, and recommended follow-ups.
        </p>
      </aside>
    );
  }

  return (
    <aside className="panel flex max-h-[calc(100vh-8rem)] flex-col overflow-hidden lg:min-w-[300px] lg:max-w-[360px]">
      <div className="panel-header">
        <h2 className="panel-title">Pulse Intelligence</h2>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-3 text-sm">
        <p className="leading-relaxed text-zinc-400">{intelligence.summary}</p>

        {performance && (
          <section>
            <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">Performance</h3>
            <ul className="mt-1 space-y-1 font-mono text-xs text-zinc-400">
              <li>
                {performance.latencyMs} ms · {performance.rating}
              </li>
              {performance.sampleCount > 0 && (
                <li>
                  History p50 {performance.p50 ?? "—"} ms · p95 {performance.p95 ?? "—"} ms (
                  {performance.sampleCount} samples)
                </li>
              )}
            </ul>
          </section>
        )}

        <section>
          <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">Confirmed facts</h3>
          <ul className="mt-1 space-y-1.5">
            {intelligence.facts.map((f, i) => (
              <li key={i} className="rounded border border-zinc-800/80 bg-zinc-950/50 px-2 py-1.5 text-zinc-400">
                <span className="font-mono text-2xs text-zinc-600">{f.category}</span>
                <p className="mt-0.5">{f.message}</p>
              </li>
            ))}
          </ul>
        </section>

        {intelligence.hypotheses.length > 0 && (
          <section>
            <h3 className="text-xs font-medium uppercase tracking-wide text-amber-600/80">
              Hypotheses (not verified)
            </h3>
            <ul className="mt-1 space-y-1.5">
              {intelligence.hypotheses.map((h, i) => (
                <li
                  key={i}
                  className="rounded border border-amber-950/50 bg-amber-950/10 px-2 py-1.5 text-zinc-400"
                >
                  <span className="font-mono text-2xs text-amber-700/80">{h.category}</span>
                  <p className="mt-0.5">{h.message}</p>
                  {h.action && <p className="mt-1 text-xs text-zinc-500">{h.action}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {contractValidation && (
          <section>
            <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">OpenAPI contract</h3>
            <p className={contractValidation.valid ? "text-emerald-500" : "text-red-400"}>
              {contractValidation.valid ? "Response matches schema." : "Schema validation failed."}
            </p>
            {!contractValidation.valid && (
              <ul className="mt-1 list-inside list-disc text-xs text-zinc-500">
                {contractValidation.errors.slice(0, 6).map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            )}
          </section>
        )}

        {diff && diff.length > 0 && (
          <section>
            <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">Response diff</h3>
            <ul className="mt-1 max-h-40 space-y-1 overflow-y-auto font-mono text-2xs text-zinc-500">
              {diff.slice(0, 40).map((d, i) => (
                <li key={i}>
                  <span className="text-zinc-400">{d.type}</span> {d.path}
                  {d.detail ? ` (${d.detail})` : ""}
                </li>
              ))}
            </ul>
          </section>
        )}

        {intelligence.suggestedFixes.length > 0 && (
          <section>
            <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">Suggested fixes</h3>
            <ul className="mt-1 list-inside list-disc text-zinc-500">
              {intelligence.suggestedFixes.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </section>
        )}

        {generatedTests && generatedTests.length > 0 && (
          <section>
            <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">Generated tests</h3>
            <ul className="mt-1 space-y-2">
              {generatedTests.map((t) => (
                <li key={t.name} className="rounded border border-zinc-800 px-2 py-1.5">
                  <p className="font-medium text-zinc-300">{t.name}</p>
                  <p className="text-xs text-zinc-600">{t.description}</p>
                  {onApplyTest && (
                    <button type="button" className="btn-ghost mt-1 px-0 text-xs" onClick={() => onApplyTest(t)}>
                      Apply to builder
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </aside>
  );
}
