import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@api-pulse/database";
import { runHealthCheck } from "@api-pulse/shared";
import { getSessionUserId } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { getRedis, LIVE_CHANNEL } from "@/lib/redis";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const rl = await rateLimit(`check-now:${ip}`);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const monitor = await prisma.monitor.findFirst({ where: { id, userId } });
  if (!monitor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const headers =
    typeof monitor.headers === "object" && monitor.headers !== null
      ? (monitor.headers as Record<string, string>)
      : {};

  const result = await runHealthCheck({
    url: monitor.url,
    method: monitor.method,
    timeoutMs: monitor.timeoutMs,
    expectedStatus: monitor.expectedStatus,
    headers,
    body: monitor.body,
  });

  const check = await prisma.healthCheck.create({
    data: {
      monitorId: monitor.id,
      status: result.status,
      httpStatus: result.httpStatus,
      latencyMs: result.latencyMs,
      errorMessage: result.errorMessage,
      responseBody: result.responseBody,
    },
  });

  await prisma.monitor.update({
    where: { id: monitor.id },
    data: { lastCheckedAt: check.checkedAt, nextCheckAt: new Date(Date.now() + monitor.intervalSec * 1000) },
  });

  try {
    const redis = getRedis();
    if (redis.status !== "ready") await redis.connect();
    await redis.publish(
      LIVE_CHANNEL,
      JSON.stringify({
        type: "health_check",
        monitorId: monitor.id,
        monitorName: monitor.name,
        status: result.status,
        latencyMs: result.latencyMs,
        checkedAt: check.checkedAt.toISOString(),
      })
    );
  } catch {
    /* optional live feed */
  }

  return NextResponse.json({ check, result });
}
