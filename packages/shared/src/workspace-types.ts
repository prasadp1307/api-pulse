export type KeyValueRow = { key: string; value: string; enabled: boolean };

export type AuthType = "none" | "bearer" | "apiKey";

export type AuthConfig =
  | { type: "none" }
  | { type: "bearer"; token: string }
  | { type: "apiKey"; key: string; value: string; addTo: "header" | "query" };

export type WorkspaceRequest = {
  name?: string;
  method: string;
  url: string;
  headers: KeyValueRow[];
  queryParams: KeyValueRow[];
  body?: string | null;
  bodyType?: string;
  authType?: AuthType;
  authConfig?: AuthConfig | Record<string, unknown>;
  preRequestScript?: string | null;
  testScript?: string | null;
  chainExtract?: { variable: string; jsonPath: string } | null;
  environment?: Record<string, string>;
};

export type WorkspaceResponse = {
  status: number;
  statusText: string;
  latencyMs: number;
  headers: Record<string, string>;
  body: string;
  bodyParsed: unknown;
  sizeBytes: number;
};

export type TestScriptResult = {
  passed: boolean;
  logs: string[];
  error?: string;
};
