import type { WorkspaceResponse } from "./workspace-types";
import { redactSecrets } from "./redact";

export type SecurityFinding = {
  severity: "low" | "medium" | "high";
  code: string;
  message: string;
  fact: boolean;
};

const RECOMMENDED_HEADERS = [
  "strict-transport-security",
  "x-content-type-options",
  "x-frame-options",
  "content-security-policy",
];

export function scanResponseSecurity(
  response: WorkspaceResponse,
  requestHeaders: Record<string, string>
): SecurityFinding[] {
  const findings: SecurityFinding[] = [];
  const h = Object.fromEntries(
    Object.entries(response.headers).map(([k, v]) => [k.toLowerCase(), v])
  );

  for (const name of RECOMMENDED_HEADERS) {
    if (!h[name]) {
      findings.push({
        severity: "low",
        code: "MISSING_SECURITY_HEADER",
        message: `Response is missing recommended header: ${name}`,
        fact: true,
      });
    }
  }

  if (h["server"] || h["x-powered-by"]) {
    findings.push({
      severity: "low",
      code: "SERVER_FINGERPRINT",
      message: "Response exposes server implementation details (Server / X-Powered-By).",
      fact: true,
    });
  }

  const bodyStr =
    typeof response.body === "string" ? response.body : JSON.stringify(response.bodyParsed);
  const redacted = redactSecrets(bodyStr);
  if (redacted !== bodyStr) {
    findings.push({
      severity: "high",
      code: "POSSIBLE_SECRET_IN_BODY",
      message: "Response body matches patterns for tokens or credentials (redacted in UI).",
      fact: true,
    });
  }

  const reqAuth = requestHeaders["authorization"] || requestHeaders["Authorization"];
  if (reqAuth && bodyStr.includes(reqAuth.slice(0, 12))) {
    findings.push({
      severity: "high",
      code: "AUTH_ECHO",
      message: "Response may echo authorization material from the request.",
      fact: true,
    });
  }

  if (response.status === 200 && /error|exception|stack trace/i.test(bodyStr)) {
    findings.push({
      severity: "medium",
      code: "ERROR_PAYLOAD_ON_200",
      message: "HTTP 200 with error-like payload — client may misinterpret success.",
      fact: true,
    });
  }

  return findings;
}
