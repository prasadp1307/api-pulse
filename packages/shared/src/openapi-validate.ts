import Ajv, { type ErrorObject } from "ajv";
import addFormats from "ajv-formats";

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

type OpenApiSpec = {
  openapi?: string;
  swagger?: string;
  paths?: Record<
    string,
    Record<string, { responses?: Record<string, { content?: Record<string, { schema?: object }> }> }>
  >;
};

function statusKey(status: number): string[] {
  const keys = [String(status), `${Math.floor(status / 100)}XX`];
  if (status >= 200 && status < 300) keys.push("2XX", "default");
  return keys;
}

export function findResponseSchema(
  spec: OpenApiSpec,
  method: string,
  url: string,
  status: number
): object | null {
  if (!spec.paths) return null;
  let pathname: string;
  try {
    pathname = new URL(url).pathname;
  } catch {
    return null;
  }

  const m = method.toLowerCase();
  let pathItem = spec.paths[pathname];
  if (!pathItem) {
    const match = Object.keys(spec.paths).find((p) => {
      const re = new RegExp(
        "^" + p.replace(/\{[^}]+\}/g, "[^/]+").replace(/\//g, "\\/") + "$"
      );
      return re.test(pathname);
    });
    if (match) pathItem = spec.paths[match];
  }
  if (!pathItem?.[m]?.responses) return null;

  const responses = pathItem[m].responses!;
  for (const key of statusKey(status)) {
    const res = responses[key];
    const jsonSchema =
      res?.content?.["application/json"]?.schema ??
      res?.content?.["*/*"]?.schema;
    if (jsonSchema) return jsonSchema;
  }
  return null;
}

export function validateAgainstSchema(
  schema: object,
  data: unknown
): { valid: boolean; errors: string[] } {
  const validate = ajv.compile(schema);
  const valid = validate(data);
  if (valid) return { valid: true, errors: [] };
  const errors = (validate.errors ?? []).map(formatAjvError);
  return { valid: false, errors };
}

function formatAjvError(e: ErrorObject): string {
  return `${e.instancePath || "/"} ${e.message ?? "invalid"}`.trim();
}
