export function interpolateEnv(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_, key: string) => {
    return vars[key] ?? "";
  });
}

export function interpolateKeyValues(
  rows: { key: string; value: string; enabled: boolean }[],
  vars: Record<string, string>
) {
  return rows
    .filter((r) => r.enabled && r.key.trim())
    .map((r) => ({
      key: interpolateEnv(r.key, vars),
      value: interpolateEnv(r.value, vars),
    }));
}
