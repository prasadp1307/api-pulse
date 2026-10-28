import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@api-pulse/database";
import { getSessionUserId } from "@/lib/session";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.savedApiRequest.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.savedApiRequest.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
