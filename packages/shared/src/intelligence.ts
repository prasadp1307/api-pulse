import type { WorkspaceRequest, WorkspaceResponse } from "./workspace-types";
import type { DiffEntry } from "./response-diff";
import type { SecurityFinding } from "./security-scan";
import { explainStatus } from "./http-status";

export type IntelligenceInsight = {
  kind: "fact" | "hypothesis";
  category: string;
  message: string;
  action?: string;
};

export type IntelligenceReport = {
  summary: string;
  facts: IntelligenceInsight[];
  hypotheses: IntelligenceInsight[];
  suggestedFixes: string[];
  followUpTests: string[];
};

export function buildIntelligenceReport(input: {
  request: WorkspaceRequest;
  response: WorkspaceResponse;
  diff?: DiffEntry[];
  security?: SecurityFinding[];
  contractErrors?: string[];
  latencyBaselineMs?: number | null;
  testsPassed?: boolean;
}): IntelligenceReport {
  const { request, response } = input;
  const facts: IntelligenceInsight[] = [];
  const hypotheses: IntelligenceInsight[] = [];
  const suggestedFixes: string[] = [];
  const followUpTests: string[] = [];

  facts.push({
    kind: "fact",
    category: "transport",
    message: `Received HTTP ${response.status} ${response.statusText} in ${response.latencyMs} ms (${response.sizeBytes} bytes).`,
  });

  const statusInfo = explainStatus(response.status);
  facts.push({
    kind: "fact",
    category: "status",
    message: `${statusInfo.title}: ${statusInfo.meaning}`,
  });

  if (input.testsPassed === false) {
    facts.push({
      kind: "fact",
      category: "tests",
      message: "Configured test script reported failures.",
      action: "Review the Tests tab output and adjust assertions.",
    });
  }

  if (input.contractErrors?.length) {
    for (const err of input.contractErrors.slice(0, 5)) {
      facts.push({ kind: "fact", category: "contract", message: err });
    }
    suggestedFixes.push("Align response shape with the imported OpenAPI schema for this operation.");
  }

  for (const f of input.security ?? []) {
    facts.push({
      kind: "fact",
      category: "security",
      message: `[${f.severity}] ${f.message}`,
    });
  }

  if (input.diff?.length) {
    const breaking = input.diff.filter((d) => d.type !== "added").length;
    facts.push({
      kind: "fact",
      category: "diff",
      message: `${input.diff.length} field difference(s) vs baseline (${breaking} changed/removed/type mismatch).`,
    });
  }

  if (response.status === 0) {
    hypotheses.push({
      kind: "hypothesis",
      category: "network",
      message: "Connection failed or was blocked before an HTTP response was received.",
      action: "Verify URL, DNS, TLS, SSRF policy, and upstream availability.",
    });
    followUpTests.push("Repeat with curl from the same network");
  }

  if (response.status === 401) {
    hypotheses.push({
      kind: "hypothesis",
      category: "auth",
      message: "Bearer/API key may be missing, expired, or sent in the wrong header.",
    });
    suggestedFixes.push("Confirm Authorization header and environment variables.");
    followUpTests.push("Send request with known-valid token from staging vault");
  }

  if (response.status === 403) {
    hypotheses.push({
      kind: "hypothesis",
      category: "authz",
      message: "Identity is recognized but lacks scope/role for this operation.",
    });
  }

  if (response.status === 404) {
    hypotheses.push({
      kind: "hypothesis",
      category: "routing",
      message: "Path or API version prefix may be incorrect for this environment.",
    });
    suggestedFixes.push(`Double-check base URL and path: ${request.url}`);
  }

  if (response.status === 422 || response.status === 400) {
    hypotheses.push({
      kind: "hypothesis",
      category: "payload",
      message: "Request body or query parameters may violate API validation rules.",
    });
    followUpTests.push("Compare payload against OpenAPI request schema");
  }

  if (response.status >= 500) {
    hypotheses.push({
      kind: "hypothesis",
      category: "server",
      message: "Upstream service error — may be transient or caused by invalid dependency input.",
    });
    followUpTests.push("Retry with Idempotency-Key; check service health dashboard");
  }

  if (input.latencyBaselineMs != null && response.latencyMs > input.latencyBaselineMs * 1.5) {
    facts.push({
      kind: "fact",
      category: "performance",
      message: `Latency ${response.latencyMs} ms exceeds recent baseline ~${Math.round(input.latencyBaselineMs)} ms.`,
    });
    hypotheses.push({
      kind: "hypothesis",
      category: "performance",
      message: "Regression may be due to cold start, DB load, or network path change.",
    });
  }

  const failed = response.status >= 400 || response.status === 0;
  const summary = failed
    ? `Request did not succeed (${response.status || "network error"}). Review facts first, then hypotheses.`
    : `Request succeeded. ${input.diff?.length ? "Response differs from baseline." : "No baseline diff."}`;

  if (response.status >= 200 && response.status < 300) {
    followUpTests.push("Negative test: omit required field and expect 4xx");
    followUpTests.push("Boundary test: max-length string fields");
  }

  return {
    summary,
    facts,
    hypotheses,
    suggestedFixes,
    followUpTests,
  };
}
