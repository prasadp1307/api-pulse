import { prisma } from "@api-pulse/database";

export async function logRequest(input: {
  source: string;
  method: string;
  path: string;
  statusCode: number;
  latencyMs: number;
  ip?: string | null;
  userAgent?: string | null;
}) {
  try {
    await prisma.requestLog.create({ data: input });
  } catch {
    /* non-blocking */
  }
}
