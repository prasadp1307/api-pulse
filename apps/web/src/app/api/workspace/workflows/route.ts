import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma, Prisma } from "@api-pulse/database";
import { getSessionUserId } from "@/lib/session";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workflows = await prisma.apiWorkflow.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ workflows });
}

const saveSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  steps: z.array(z.record(z.unknown())),
});

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = saveSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = {
    name: parsed.data.name,
    description: parsed.data.description,
    steps: parsed.data.steps as Prisma.InputJsonValue,
  };

  const workflow = parsed.data.id
    ? await prisma.apiWorkflow.update({ where: { id: parsed.data.id }, data })
    : await prisma.apiWorkflow.create({ data: { userId, ...data } });

  return NextResponse.json({ workflow }, { status: parsed.data.id ? 200 : 201 });
}
