const SECRET_PATTERNS = [
  /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
  /(?:api[_-]?key|token|secret|password|authorization)["']?\s*[:=]\s*["']?[^"'\s,}]+/gi,
  /sk_live_[A-Za-z0-9]+/g,
  /AKIA[0-9A-Z]{16}/g,
];

export function redactSecrets(text: string): string {
  let out = text;
  for (const re of SECRET_PATTERNS) {
    out = out.replace(re, (m) => {
      const prefix = m.slice(0, Math.min(8, m.length));
      return `${prefix}<REDACTED>`;
    });
  }
  return out;
}
