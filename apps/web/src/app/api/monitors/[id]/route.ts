import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma, HttpMethod } from "@api-pulse/database";
import { getSessionUserId } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  url: z.string().url().optional(),
  method: z.nativeEnum(HttpMethod).optional(),
  intervalSec: z.number().int().min(15).max(86400).optional(),
  timeoutMs: z.number().int().min(1000).max(120000).optional(),
  expectedStatus: z.number().int().min(100).max(599).optional(),
  headers: z.record(z.string()).optional(),
  body: z.string().nullable().optional(),
  enabled: z.boolean().optional(),
});

async function ownedMonitor(id: string, userId: string) {
  return prisma.monitor.findFirst({ where: { id, userId } });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const monitor = await prisma.monitor.findFirst({
    where: { id, userId },
    include: {
      checks: { orderBy: { checkedAt: "desc" }, take: 100 },
      alertRules: { include: { events: { orderBy: { createdAt: "desc" }, take: 5 } } },
    },
  });
  if (!monitor) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ monitor });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const rl = await rateLimit(`api:${ip}`);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await ownedMonitor(id, userId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const monitor = await prisma.monitor.update({
    where: { id },
    data: parsed.data,
  });
  return NextResponse.json({ monitor });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await ownedMonitor(id, userId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.monitor.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
