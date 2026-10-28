import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@api-pulse/database";
import { getSessionUserId } from "@/lib/session";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const collections = await prisma.apiCollection.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      requests: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
    },
  });

  return NextResponse.json({ collections });
}

const createSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const collection = await prisma.apiCollection.create({
    data: { userId, ...parsed.data },
  });
  return NextResponse.json({ collection }, { status: 201 });
}
