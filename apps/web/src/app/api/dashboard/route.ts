import { NextResponse } from "next/server";
import { prisma } from "@api-pulse/database";
import { computeUptime } from "@api-pulse/shared";
import { getSessionUserId } from "@/lib/session";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const monitors = await prisma.monitor.findMany({
    where: { userId },
    include: {
      checks: {
        where: { checkedAt: { gte: since } },
        orderBy: { checkedAt: "desc" },
        take: 200,
      },
    },
  });

  const summary = monitors.map((m) => {
    const latest = m.checks[0];
    return {
      id: m.id,
      name: m.name,
      url: m.url,
      enabled: m.enabled,
      lastStatus: latest?.status ?? null,
      lastLatencyMs: latest?.latencyMs ?? null,
      lastCheckedAt: latest?.checkedAt?.toISOString() ?? null,
      uptime24h: computeUptime(m.checks),
      checkCount24h: m.checks.length,
    };
  });

  const recentAlerts = await prisma.alertEvent.findMany({
    where: {
      alertRule: { monitor: { userId } },
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      alertRule: { include: { monitor: { select: { name: true } } } },
    },
  });

  const globalChecks = monitors.flatMap((m) => m.checks);
  const up = globalChecks.filter((c) => c.status === "UP").length;

  return NextResponse.json({
    totals: {
      monitors: monitors.length,
      enabled: monitors.filter((m) => m.enabled).length,
      checks24h: globalChecks.length,
      uptime24h: computeUptime(globalChecks),
      up,
      down: globalChecks.filter((c) => c.status === "DOWN").length,
    },
    monitors: summary,
    alerts: recentAlerts.map((a) => ({
      id: a.id,
      message: a.message,
      severity: a.severity,
      monitorName: a.alertRule.monitor.name,
      createdAt: a.createdAt.toISOString(),
    })),
  });
}
