import type { KeyValueRow } from "./workspace-types";

export type ImportedRequest = {
  name: string;
  method: string;
  url: string;
  headers: KeyValueRow[];
  queryParams: KeyValueRow[];
  body?: string | null;
};

/** Postman Collection v2.1 (subset) */
export function parsePostmanCollection(raw: unknown): { name: string; requests: ImportedRequest[] } {
  const root = raw as {
    info?: { name?: string };
    item?: PostmanItem[];
  };
  const requests: ImportedRequest[] = [];

  function walk(items: PostmanItem[] | undefined, prefix: string) {
    for (const item of items ?? []) {
      if (item.request) {
        const r = item.request;
        const url =
          typeof r.url === "string"
            ? r.url
            : r.url?.raw ?? r.url?.host?.join(".") ?? "";
        const headers: KeyValueRow[] = (r.header ?? []).map((h) => ({
          key: h.key,
          value: h.value ?? "",
          enabled: !h.disabled,
        }));
        requests.push({
          name: prefix ? `${prefix} / ${item.name}` : item.name,
          method: (r.method ?? "GET").toUpperCase(),
          url,
          headers,
          queryParams: [],
          body: typeof r.body === "string" ? r.body : r.body?.raw,
        });
      }
      if (item.item) walk(item.item, item.name);
    }
  }

  walk(root.item, "");
  return { name: root.info?.name ?? "Imported Postman", requests };
}

type PostmanItem = {
  name: string;
  item?: PostmanItem[];
  request?: {
    method?: string;
    header?: { key: string; value?: string; disabled?: boolean }[];
    url?: string | { raw?: string; host?: string[] };
    body?: string | { raw?: string };
  };
};

export function openapiToRequests(spec: {
  info?: { title?: string };
  paths?: Record<string, Record<string, { summary?: string }>>;
  servers?: { url: string }[];
}): { name: string; requests: ImportedRequest[] } {
  const base = spec.servers?.[0]?.url?.replace(/\/$/, "") ?? "";
  const requests: ImportedRequest[] = [];
  for (const [path, methods] of Object.entries(spec.paths ?? {})) {
    for (const [method, op] of Object.entries(methods)) {
      if (["parameters", "summary", "description"].includes(method)) continue;
      requests.push({
        name: op.summary ?? `${method.toUpperCase()} ${path}`,
        method: method.toUpperCase(),
        url: `${base}${path}`,
        headers: [{ key: "Accept", value: "application/json", enabled: true }],
        queryParams: [],
      });
    }
  }
  return { name: spec.info?.title ?? "OpenAPI", requests };
}
