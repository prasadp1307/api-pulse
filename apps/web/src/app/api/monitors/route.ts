import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma, HttpMethod } from "@api-pulse/database";
import { getSessionUserId } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { logRequest } from "@/lib/request-log";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  url: z.string().url(),
  method: z.nativeEnum(HttpMethod).default("GET"),
  intervalSec: z.number().int().min(15).max(86400).default(60),
  timeoutMs: z.number().int().min(1000).max(120000).default(30000),
  expectedStatus: z.number().int().min(100).max(599).default(200),
  headers: z.record(z.string()).optional(),
  body: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const start = Date.now();
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const rl = await rateLimit(`api:${ip}`);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const userId = await getSessionUserId();
  if (!userId) {
    await logRequest({
      source: "api",
      method: "GET",
      path: "/api/monitors",
      statusCode: 401,
      latencyMs: Date.now() - start,
      ip,
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const monitors = await prisma.monitor.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      checks: { orderBy: { checkedAt: "desc" }, take: 1 },
      _count: { select: { checks: true } },
    },
  });

  await logRequest({
    source: "api",
    method: "GET",
    path: "/api/monitors",
    statusCode: 200,
    latencyMs: Date.now() - start,
    ip,
  });

  return NextResponse.json({ monitors });
}

export async function POST(req: NextRequest) {
  const start = Date.now();
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const rl = await rateLimit(`api:${ip}`);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const monitor = await prisma.monitor.create({
    data: {
      userId,
      name: data.name,
      url: data.url,
      method: data.method,
      intervalSec: data.intervalSec,
      timeoutMs: data.timeoutMs,
      expectedStatus: data.expectedStatus,
      headers: data.headers ?? {},
      body: data.body,
      alertRules: {
        create: {
          name: "Default down alert",
          consecutiveDown: 2,
        },
      },
    },
  });

  await logRequest({
    source: "api",
    method: "POST",
    path: "/api/monitors",
    statusCode: 201,
    latencyMs: Date.now() - start,
    ip,
  });

  return NextResponse.json({ monitor }, { status: 201 });
}
