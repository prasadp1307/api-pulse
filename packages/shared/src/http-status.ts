export function explainStatus(status: number): { title: string; meaning: string } {
  const map: Record<number, { title: string; meaning: string }> = {
    400: {
      title: "Bad Request",
      meaning: "The server rejected the request syntax or semantic validation failed.",
    },
    401: {
      title: "Unauthorized",
      meaning: "Authentication is missing or invalid.",
    },
    403: {
      title: "Forbidden",
      meaning: "Authenticated but not permitted for this resource.",
    },
    404: {
      title: "Not Found",
      meaning: "No resource matches the URL path (or routing hides existence).",
    },
    405: {
      title: "Method Not Allowed",
      meaning: "HTTP method is not supported for this endpoint.",
    },
    408: {
      title: "Request Timeout",
      meaning: "Server timed out waiting for the client or upstream.",
    },
    422: {
      title: "Unprocessable Entity",
      meaning: "JSON/schema/business validation failed.",
    },
    429: {
      title: "Too Many Requests",
      meaning: "Rate limit exceeded.",
    },
    500: {
      title: "Internal Server Error",
      meaning: "Unhandled failure on the server.",
    },
    502: {
      title: "Bad Gateway",
      meaning: "Upstream proxy received an invalid response.",
    },
    503: {
      title: "Service Unavailable",
      meaning: "Temporary overload or maintenance.",
    },
    504: {
      title: "Gateway Timeout",
      meaning: "Upstream did not respond in time.",
    },
  };
  if (map[status]) return map[status];
  if (status >= 200 && status < 300) {
    return { title: "Success", meaning: "Request completed successfully." };
  }
  if (status >= 300 && status < 400) {
    return { title: "Redirection", meaning: "Further action needed to complete the request." };
  }
  if (status >= 400 && status < 500) {
    return { title: "Client Error", meaning: "Request or client configuration issue." };
  }
  if (status >= 500) {
    return { title: "Server Error", meaning: "Server or upstream failure." };
  }
  return { title: "Unknown", meaning: "Non-standard or network-level status." };
}
