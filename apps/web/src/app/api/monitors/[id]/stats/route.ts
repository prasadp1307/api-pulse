import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@api-pulse/database";
import { computeLatencyStats, computeUptime } from "@api-pulse/shared";
import { getSessionUserId } from "@/lib/session";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const hours = Number(req.nextUrl.searchParams.get("hours") ?? 24);
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const monitor = await prisma.monitor.findFirst({ where: { id, userId } });
  if (!monitor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const checks = await prisma.healthCheck.findMany({
    where: { monitorId: id, checkedAt: { gte: since } },
    orderBy: { checkedAt: "asc" },
    select: { status: true, latencyMs: true, checkedAt: true, httpStatus: true },
  });

  const latencies = checks.map((c) => c.latencyMs);
  const latency = computeLatencyStats(latencies);
  const uptime = computeUptime(checks);

  const timeline = checks.map((c) => ({
    t: c.checkedAt.toISOString(),
    latencyMs: c.latencyMs,
    status: c.status,
  }));

  return NextResponse.json({
    hours,
    uptimePercent: uptime,
    latency,
    totalChecks: checks.length,
    failures: checks.filter((c) => c.status === "DOWN").length,
    timeline,
  });
}
