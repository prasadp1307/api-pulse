export type KeyValueRow = { key: string; value: string; enabled: boolean };

export type AuthType = "none" | "bearer" | "apiKey";

export type DraftRequest = {
  id?: string;
  collectionId?: string | null;
  name: string;
  method: string;
  url: string;
  headers: KeyValueRow[];
  queryParams: KeyValueRow[];
  body: string;
  bodyType: string;
  authType: AuthType;
  authConfig: {
    token?: string;
    key?: string;
    value?: string;
    addTo?: "header" | "query";
  };
  preRequestScript: string;
  testScript: string;
  chainExtract: { variable: string; jsonPath: string } | null;
};

export const emptyRequest = (): DraftRequest => ({
  name: "Untitled request",
  method: "GET",
  url: "https://httpbin.org/get",
  headers: [{ key: "Accept", value: "application/json", enabled: true }],
  queryParams: [],
  body: "",
  bodyType: "json",
  authType: "none",
  authConfig: {},
  preRequestScript: "",
  testScript: "assert(response.status === 200, 'status is 200');",
  chainExtract: null,
});

export type ApiResponseView = {
  status: number;
  statusText: string;
  latencyMs: number;
  headers: Record<string, string>;
  body: string;
  bodyParsed: unknown;
  sizeBytes: number;
};
