import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@api-pulse/database";
import { getSessionUserId } from "@/lib/session";

async function owned(id: string, userId: string) {
  return prisma.apiCollection.findFirst({ where: { id, userId } });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!(await owned(id, userId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.apiCollection.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

const importSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  requests: z.array(z.record(z.unknown())),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!(await owned(id, userId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  if (body.import) {
    const parsed = importSchema.safeParse(body.import);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    await prisma.savedApiRequest.deleteMany({ where: { collectionId: id } });
    for (let i = 0; i < parsed.data.requests.length; i++) {
      const r = parsed.data.requests[i];
      await prisma.savedApiRequest.create({
        data: {
          userId,
          collectionId: id,
          name: String(r.name ?? `Request ${i + 1}`),
          method: (String(r.method ?? "GET").toUpperCase() as "GET"),
          url: String(r.url ?? ""),
          headers: (r.headers as object) ?? [],
          queryParams: (r.queryParams as object) ?? [],
          body: r.body ? String(r.body) : null,
          bodyType: String(r.bodyType ?? "json"),
          authType: String(r.authType ?? "none"),
          authConfig: (r.authConfig as object) ?? {},
          sortOrder: i,
        },
      });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unsupported operation" }, { status: 400 });
}
