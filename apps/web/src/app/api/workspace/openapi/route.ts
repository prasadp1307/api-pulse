import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma, Prisma } from "@api-pulse/database";
import { getSessionUserId } from "@/lib/session";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const documents = await prisma.openApiDocument.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, createdAt: true, updatedAt: true },
  });
  return NextResponse.json({ documents });
}

const uploadSchema = z.object({
  name: z.string().min(1).max(160),
  spec: z.record(z.unknown()),
});

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contentType = req.headers.get("content-type") ?? "";
  let name: string;
  let spec: Record<string, unknown>;

  if (contentType.includes("application/json")) {
    const body = await req.json();
    const parsed = uploadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    name = parsed.data.name;
    spec = parsed.data.spec;
  } else {
    const text = await req.text();
    try {
      spec = JSON.parse(text) as Record<string, unknown>;
      name = (spec.info as { title?: string })?.title ?? "OpenAPI document";
    } catch {
      return NextResponse.json({ error: "Invalid JSON spec" }, { status: 400 });
    }
  }

  const doc = await prisma.openApiDocument.create({
    data: {
      userId,
      name,
      spec: spec as Prisma.InputJsonValue,
    },
  });
  return NextResponse.json({ document: doc }, { status: 201 });
}
