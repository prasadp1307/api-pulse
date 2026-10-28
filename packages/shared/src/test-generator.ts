import type { WorkspaceRequest } from "./workspace-types";

export type GeneratedTest = {
  name: string;
  type: "positive" | "negative" | "boundary" | "schema";
  description: string;
  patch: Partial<WorkspaceRequest>;
  expectStatus?: number;
};

export function generateTests(base: WorkspaceRequest): GeneratedTest[] {
  const tests: GeneratedTest[] = [
    {
      name: "Positive — repeat baseline",
      type: "positive",
      description: "Re-send the configured request and expect the same success class.",
      patch: {},
      expectStatus: 200,
    },
    {
      name: "Negative — invalid method probe",
      type: "negative",
      description: "Uses HEAD against the same URL to detect method support (expect 405 or 200).",
      patch: { method: "HEAD" },
    },
    {
      name: "Negative — malformed JSON body",
      type: "negative",
      description: " Sends invalid JSON when body is present.",
      patch: { body: "{not-json", bodyType: "json" },
      expectStatus: 400,
    },
    {
      name: "Boundary — empty Authorization",
      type: "boundary",
      description: "Clears bearer token to verify 401 handling.",
      patch: { authType: "bearer", authConfig: { type: "bearer", token: "" } as never },
      expectStatus: 401,
    },
  ];

  if (base.url.includes("?")) {
    tests.push({
      name: "Negative — strip query string",
      type: "negative",
      description: "Calls path without query parameters.",
      patch: { url: base.url.split("?")[0], queryParams: [] },
    });
  }

  tests.push({
    name: "Schema — assert JSON object root",
    type: "schema",
    description: "Test script expects JSON object response.",
    patch: {
      testScript:
        "assert(typeof response.json === 'object' && response.json !== null, 'JSON object');",
    },
  });

  return tests;
}
