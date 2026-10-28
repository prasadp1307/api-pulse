import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@api-pulse/database";
import { getSessionUserId } from "@/lib/session";

export async function GET(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 50), 200);

  const logs = await prisma.requestLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const checkLogs = await prisma.healthCheck.findMany({
    where: { monitor: { userId } },
    orderBy: { checkedAt: "desc" },
    take: limit,
    include: { monitor: { select: { name: true, url: true } } },
  });

  return NextResponse.json({ apiLogs: logs, healthCheckLogs: checkLogs });
}
