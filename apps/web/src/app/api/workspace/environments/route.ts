import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@api-pulse/database";
import { getSessionUserId } from "@/lib/session";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const environments = await prisma.apiEnvironment.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ environments });
}

const envSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(80),
  variables: z.record(z.string()).default({}),
  isActive: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = envSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { id, isActive, ...rest } = parsed.data;

  if (isActive) {
    await prisma.apiEnvironment.updateMany({
      where: { userId },
      data: { isActive: false },
    });
  }

  const env = id
    ? await prisma.apiEnvironment.update({
        where: { id },
        data: { ...rest, isActive: isActive ?? undefined },
      })
    : await prisma.apiEnvironment.create({
        data: { userId, ...rest, isActive: isActive ?? false },
      });

  return NextResponse.json({ environment: env }, { status: id ? 200 : 201 });
}
