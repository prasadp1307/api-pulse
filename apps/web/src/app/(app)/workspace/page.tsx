"use client";

import useSWR from "swr";
import { useCallback, useMemo, useState } from "react";
import { KeyValueEditor } from "@/components/workspace/key-value-editor";
import { ResponseViewer } from "@/components/workspace/response-viewer";
import { IntelligencePanel } from "@/components/workspace/intelligence-panel";
import { WorkspaceSidebar } from "@/components/workspace/workspace-sidebar";
import {
  emptyRequest,
  type ApiResponseView,
  type DraftRequest,
} from "@/components/workspace/types";
import { PageHeader } from "@/components/ui/page-header";
import { Send, Save, GitCompare, Upload } from "lucide-react";
import type { DiffEntry, GeneratedTest } from "@api-pulse/shared";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
type Tab = "params" | "headers" | "body" | "auth" | "scripts" | "workflow" | "code";

type IntelState = {
  intelligence: {
    summary: string;
    facts: { kind: string; category: string; message: string; action?: string }[];
    hypotheses: { kind: string; category: string; message: string; action?: string }[];
    suggestedFixes: string[];
    followUpTests: string[];
  };
  diff: DiffEntry[] | null;
  security: { severity: string; message: string }[] | null;
  performance: {
    latencyMs: number;
    rating: string;
    baselineMs: number | null;
    p50: number | null;
    p95: number | null;
    sampleCount: number;
  } | null;
  contractValidation: { valid: boolean; errors: string[] } | null;
  generatedTests: GeneratedTest[] | null;
};

export default function WorkspacePage() {
  const { data: colData, mutate: mutateCols } = useSWR("/api/workspace/collections", fetcher);
  const { data: envData, mutate: mutateEnvs } = useSWR("/api/workspace/environments", fetcher);
  const { data: histData, mutate: mutateHist } = useSWR("/api/workspace/history?limit=30", fetcher);
  const { data: oasData, mutate: mutateOas } = useSWR("/api/workspace/openapi", fetcher);

  const [draft, setDraft] = useState<DraftRequest>(emptyRequest);
  const [tab, setTab] = useState<Tab>("params");
  const [collectionSearch, setCollectionSearch] = useState("");
  const [response, setResponse] = useState<ApiResponseView | null>(null);
  const [tests, setTests] = useState<{ passed: boolean; logs: string[]; error?: string } | null>(null);
  const [intel, setIntel] = useState<IntelState | null>(null);
  const [baselineBody, setBaselineBody] = useState<string | null>(null);
  const [openApiDocumentId, setOpenApiDocumentId] = useState("");
  const [sending, setSending] = useState(false);
  const [workflowEnabled, setWorkflowEnabled] = useState(false);
  const [workflowStep, setWorkflowStep] = useState<DraftRequest>(() => ({
    ...emptyRequest(),
    name: "Step 2",
    url: "https://httpbin.org/headers",
    method: "GET",
  }));

  const activeEnv = useMemo(() => {
    const envs = envData?.environments ?? [];
    return envs.find((e: { isActive: boolean }) => e.isActive) ?? envs[0];
  }, [envData]);

  const environmentVars: Record<string, string> = useMemo(
    () => (activeEnv?.variables as Record<string, string>) ?? {},
    [activeEnv]
  );

  const patch = useCallback((p: Partial<DraftRequest>) => {
    setDraft((d) => ({ ...d, ...p }));
  }, []);

  function authPayload(d: DraftRequest) {
    if (d.authType === "bearer") return { type: "bearer", token: d.authConfig.token ?? "" };
    if (d.authType === "apiKey")
      return {
        type: "apiKey",
        key: d.authConfig.key ?? "",
        value: d.authConfig.value ?? "",
        addTo: d.authConfig.addTo ?? "header",
      };
    return { type: "none" };
  }

  async function sendRequest() {
    setSending(true);
    setResponse(null);
    setTests(null);
    setIntel(null);
    try {
      const res = await fetch("/api/workspace/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request: { ...draft, authConfig: authPayload(draft) },
          environment: environmentVars,
          baselineResponseBody: baselineBody,
          openApiDocumentId: openApiDocumentId || undefined,
          workflowSteps: workflowEnabled
            ? [{ ...workflowStep, authConfig: authPayload(workflowStep) }]
            : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setResponse({
          status: 0,
          statusText: "Error",
          latencyMs: 0,
          headers: {},
          body: json.error ?? "Request failed",
          bodyParsed: json,
          sizeBytes: 0,
        });
        return;
      }
      setResponse(json.response);
      setTests(json.tests);
      setIntel({
        intelligence: json.intelligence,
        diff: json.diff,
        security: json.security,
        performance: json.performance,
        contractValidation: json.contractValidation,
        generatedTests: json.generatedTests,
      });
      mutateHist();
    } finally {
      setSending(false);
    }
  }

  async function saveRequest() {
    const res = await fetch("/api/workspace/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...draft, collectionId: draft.collectionId ?? null }),
    });
    if (res.ok) {
      const { request } = await res.json();
      patch({ id: request.id, collectionId: request.collectionId });
      mutateCols();
    }
  }

  async function addCollection() {
    const name = prompt("Collection name");
    if (!name) return;
    await fetch("/api/workspace/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    mutateCols();
  }

  async function addApiFlow(collectionId?: string) {
    let cid = collectionId;
    if (!cid) {
      const cols = colData?.collections ?? [];
      if (cols.length === 0) {
        const name = prompt("Collection name for new API");
        if (!name) return;
        const res = await fetch("/api/workspace/collections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        const { collection } = await res.json();
        cid = collection.id;
      } else {
        cid = cols[0].id;
      }
    }
    const next = { ...emptyRequest(), name: "Untitled request", collectionId: cid };
    setDraft(next);
    const res = await fetch("/api/workspace/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...next, method: next.method }),
    });
    if (res.ok) {
      const { request } = await res.json();
      setDraft((d) => ({ ...d, id: request.id }));
    }
    mutateCols();
  }

  function loadSaved(req: Record<string, unknown>) {
    patch({
      id: req.id as string,
      collectionId: req.collectionId as string | null,
      name: req.name as string,
      method: req.method as string,
      url: req.url as string,
      headers: (req.headers as DraftRequest["headers"]) ?? [],
      queryParams: (req.queryParams as DraftRequest["queryParams"]) ?? [],
      body: (req.body as string) ?? "",
      bodyType: (req.bodyType as string) ?? "json",
      authType: (req.authType as DraftRequest["authType"]) ?? "none",
      authConfig: (req.authConfig as DraftRequest["authConfig"]) ?? {},
      preRequestScript: (req.preRequestScript as string) ?? "",
      testScript: (req.testScript as string) ?? "",
      chainExtract: (req.chainExtract as DraftRequest["chainExtract"]) ?? null,
    });
    setResponse(null);
    setIntel(null);
  }

  async function createEnvironment() {
    const name = prompt("Environment name (e.g. staging)");
    if (!name) return;
    await fetch("/api/workspace/environments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        variables: { baseUrl: "https://httpbin.org" },
        isActive: true,
      }),
    });
    mutateEnvs();
  }

  async function selectEnv(id: string) {
    const env = (envData?.environments ?? []).find((x: { id: string }) => x.id === id);
    if (!env) return;
    await fetch("/api/workspace/environments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: env.id,
        name: env.name,
        variables: env.variables,
        isActive: true,
      }),
    });
    mutateEnvs();
  }

  function importFile(collectionId: string) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return;
      const text = await f.text();
      const payload = JSON.parse(text);
      const format =
        payload.info?.schema?.includes("postman") || payload.info?._postman_id
          ? "postman"
          : payload.openapi || payload.swagger
            ? "openapi"
            : "apipulse";
      await fetch("/api/workspace/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, collectionId, payload }),
      });
      if (format === "openapi") mutateOas();
      mutateCols();
    };
    input.click();
  }

  async function uploadOpenApiFile() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return;
      const text = await f.text();
      await fetch("/api/workspace/openapi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: text,
      });
      mutateOas();
    };
    input.click();
  }

  const codeSnippet = useMemo(() => {
    const lines = [
      `curl -X ${draft.method} '${draft.url}' \\`,
      ...draft.headers
        .filter((h) => h.enabled && h.key)
        .map((h) => `  -H '${h.key}: ${h.value}' \\`),
    ];
    if (draft.body && draft.method !== "GET") {
      lines.push(`  -d '${draft.body.replace(/'/g, "'\\''")}'`);
    }
    return lines.join("\n");
  }, [draft]);

  const collections = colData?.collections ?? [];
  const history = histData?.history ?? [];
  const openApiDocs = oasData?.documents ?? [];

  return (
    <div>
      <PageHeader
        title="API Pulse Intelligence"
        description="Debug, compare, validate, and chain requests with rule-based analysis (facts vs hypotheses)."
        actions={
          <button type="button" className="btn-secondary text-xs" onClick={uploadOpenApiFile}>
            <Upload className="h-3.5 w-3.5" aria-hidden />
            Import OpenAPI
          </button>
        }
      />

      <div className="flex flex-col gap-4 xl:flex-row">
        <WorkspaceSidebar
          collections={collections}
          collectionSearch={collectionSearch}
          onSearchChange={setCollectionSearch}
          onAddCollection={addCollection}
          onAddApi={addApiFlow}
          onSelectRequest={loadSaved}
          onExport={(id) => window.open(`/api/workspace/export?collectionId=${id}`, "_blank")}
          onImport={importFile}
          environments={envData?.environments ?? []}
          activeEnvId={activeEnv?.id}
          onSelectEnv={selectEnv}
          onCreateEnv={createEnvironment}
          history={history}
        />

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="panel space-y-3 p-3 sm:p-4">
            <input
              className="input text-sm font-medium"
              value={draft.name}
              onChange={(e) => patch({ name: e.target.value })}
              aria-label="Request name"
            />
            <div className="flex flex-col gap-2 lg:flex-row">
              <select
                className="select w-full font-mono text-sm lg:w-28"
                value={draft.method}
                onChange={(e) => patch({ method: e.target.value })}
                aria-label="HTTP method"
              >
                {METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <input
                className="input flex-1 font-mono text-xs sm:text-sm"
                value={draft.url}
                onChange={(e) => patch({ url: e.target.value })}
                placeholder="https://api.example.com/v1/resource"
                aria-label="Request URL"
              />
              <div className="flex gap-2">
                <button type="button" className="btn-primary flex-1 lg:flex-none" disabled={sending} onClick={sendRequest}>
                  <Send className="h-3.5 w-3.5" aria-hidden />
                  {sending ? "Sending…" : "Send"}
                </button>
                <button type="button" className="btn-secondary" onClick={() => saveRequest()}>
                  <Save className="h-3.5 w-3.5" aria-hidden />
                  Save
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border-subtle)] pt-2">
              <label className="text-xs text-zinc-500">OpenAPI validation</label>
              <select
                className="select max-w-xs text-xs"
                value={openApiDocumentId}
                onChange={(e) => setOpenApiDocumentId(e.target.value)}
              >
                <option value="">None</option>
                {openApiDocs.map((d: { id: string; name: string }) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn-ghost text-xs"
                disabled={!response?.body}
                onClick={() => setBaselineBody(response?.body ?? null)}
              >
                <GitCompare className="h-3.5 w-3.5" aria-hidden />
                Set diff baseline
              </button>
              {baselineBody && (
                <button type="button" className="btn-ghost text-xs" onClick={() => setBaselineBody(null)}>
                  Clear baseline
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-x-1 border-b border-[var(--border-subtle)]">
              {(
                [
                  ["params", "Query"],
                  ["headers", "Headers"],
                  ["body", "Body"],
                  ["auth", "Auth"],
                  ["scripts", "Scripts"],
                  ["workflow", "Workflow"],
                  ["code", "cURL"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={`tab ${tab === id ? "tab-active" : ""}`}
                  onClick={() => setTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === "params" && (
              <KeyValueEditor rows={draft.queryParams} onChange={(queryParams) => patch({ queryParams })} />
            )}
            {tab === "headers" && (
              <KeyValueEditor rows={draft.headers} onChange={(headers) => patch({ headers })} />
            )}
            {tab === "body" && (
              <div className="space-y-2">
                <select className="select w-40 text-xs" value={draft.bodyType} onChange={(e) => patch({ bodyType: e.target.value })}>
                  <option value="json">JSON</option>
                  <option value="raw">Raw</option>
                </select>
                <textarea
                  className="input min-h-[160px] font-mono text-xs"
                  value={draft.body}
                  onChange={(e) => patch({ body: e.target.value })}
                />
              </div>
            )}
            {tab === "auth" && (
              <div className="max-w-md space-y-3">
                <select
                  className="select text-sm"
                  value={draft.authType}
                  onChange={(e) => patch({ authType: e.target.value as DraftRequest["authType"] })}
                >
                  <option value="none">No auth</option>
                  <option value="bearer">Bearer token</option>
                  <option value="apiKey">API key</option>
                </select>
                {draft.authType === "bearer" && (
                  <input
                    className="input font-mono text-xs"
                    placeholder="Token (stored server-side in saved request only)"
                    value={draft.authConfig.token ?? ""}
                    onChange={(e) => patch({ authConfig: { ...draft.authConfig, token: e.target.value } })}
                  />
                )}
                {draft.authType === "apiKey" && (
                  <>
                    <input
                      className="input text-xs"
                      placeholder="Header/query name"
                      value={draft.authConfig.key ?? ""}
                      onChange={(e) => patch({ authConfig: { ...draft.authConfig, key: e.target.value } })}
                    />
                    <input
                      className="input font-mono text-xs"
                      placeholder="Value"
                      value={draft.authConfig.value ?? ""}
                      onChange={(e) => patch({ authConfig: { ...draft.authConfig, value: e.target.value } })}
                    />
                  </>
                )}
              </div>
            )}
            {tab === "scripts" && (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="label">Pre-request</p>
                  <textarea
                    className="input min-h-[120px] font-mono text-xs"
                    value={draft.preRequestScript}
                    onChange={(e) => patch({ preRequestScript: e.target.value })}
                  />
                </div>
                <div>
                  <p className="label">Tests</p>
                  <textarea
                    className="input min-h-[120px] font-mono text-xs"
                    value={draft.testScript}
                    onChange={(e) => patch({ testScript: e.target.value })}
                  />
                </div>
              </div>
            )}
            {tab === "workflow" && (
              <div className="space-y-3 text-sm">
                <p className="text-zinc-500">
                  Chain requests: extract JSON values into environment variables for the next step.
                </p>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={workflowEnabled} onChange={(e) => setWorkflowEnabled(e.target.checked)} />
                  Enable step 2 after primary request
                </label>
                <div className="flex gap-2">
                  <input
                    className="input text-xs"
                    placeholder="Variable name"
                    value={draft.chainExtract?.variable ?? ""}
                    onChange={(e) =>
                      patch({
                        chainExtract: {
                          variable: e.target.value,
                          jsonPath: draft.chainExtract?.jsonPath ?? "",
                        },
                      })
                    }
                  />
                  <input
                    className="input flex-1 font-mono text-xs"
                    placeholder="JSON path (e.g. access_token)"
                    value={draft.chainExtract?.jsonPath ?? ""}
                    onChange={(e) =>
                      patch({
                        chainExtract: {
                          variable: draft.chainExtract?.variable ?? "",
                          jsonPath: e.target.value,
                        },
                      })
                    }
                  />
                </div>
                {workflowEnabled && (
                  <input
                    className="input font-mono text-xs"
                    value={workflowStep.url}
                    onChange={(e) => setWorkflowStep({ ...workflowStep, url: e.target.value })}
                    placeholder="Step 2 URL (may use {{var}})"
                  />
                )}
              </div>
            )}
            {tab === "code" && (
              <pre className="overflow-x-auto rounded border border-[var(--border-subtle)] bg-[var(--surface-0)] p-3 font-mono text-xs text-zinc-400">
                {codeSnippet}
              </pre>
            )}
          </div>

          <ResponseViewer response={response} tests={tests} />
        </div>

        <IntelligencePanel
          intelligence={intel?.intelligence ?? null}
          diff={intel?.diff ?? null}
          security={intel?.security ?? null}
          performance={intel?.performance ?? null}
          contractValidation={intel?.contractValidation ?? null}
          generatedTests={intel?.generatedTests ?? null}
          onApplyTest={(t) => {
            const p = t.patch;
            patch({
              name: t.name,
              ...(p.method ? { method: p.method } : {}),
              ...(p.url ? { url: p.url } : {}),
              ...(p.body !== undefined ? { body: p.body ?? "" } : {}),
              ...(p.testScript ? { testScript: p.testScript } : {}),
              ...(p.authType ? { authType: p.authType as DraftRequest["authType"] } : {}),
            });
          }}
        />
      </div>
    </div>
  );
}
