import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { HttpMethod, prisma, Prisma } from "@api-pulse/database";
import { getSessionUserId } from "@/lib/session";

const kvRow = z.object({
  key: z.string(),
  value: z.string(),
  enabled: z.boolean().default(true),
});

const saveSchema = z.object({
  id: z.string().optional(),
  collectionId: z.string().nullable().optional(),
  name: z.string().min(1).max(160),
  method: z.nativeEnum(HttpMethod),
  url: z.string().min(1),
  headers: z.array(kvRow).default([]),
  queryParams: z.array(kvRow).default([]),
  body: z.string().nullable().optional(),
  bodyType: z.string().default("json"),
  authType: z.string().default("none"),
  authConfig: z.record(z.unknown()).default({}),
  preRequestScript: z.string().nullable().optional(),
  testScript: z.string().nullable().optional(),
  chainExtract: z
    .object({ variable: z.string(), jsonPath: z.string() })
    .nullable()
    .optional(),
});

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const requests = await prisma.savedApiRequest.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: { collection: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ requests });
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = saveSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  if (data.collectionId) {
    const col = await prisma.apiCollection.findFirst({
      where: { id: data.collectionId, userId },
    });
    if (!col) return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  }

  const payload = {
    userId,
    collectionId: data.collectionId ?? null,
    name: data.name,
    method: data.method,
    url: data.url,
    headers: data.headers as Prisma.InputJsonValue,
    queryParams: data.queryParams as Prisma.InputJsonValue,
    body: data.body,
    bodyType: data.bodyType,
    authType: data.authType,
    authConfig: data.authConfig as Prisma.InputJsonValue,
    preRequestScript: data.preRequestScript,
    testScript: data.testScript,
    chainExtract: (data.chainExtract ?? undefined) as Prisma.InputJsonValue | undefined,
  };

  let saved;
  if (data.id) {
    const existing = await prisma.savedApiRequest.findFirst({
      where: { id: data.id, userId },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    saved = await prisma.savedApiRequest.update({ where: { id: data.id }, data: payload });
  } else {
    saved = await prisma.savedApiRequest.create({ data: payload });
  }

  return NextResponse.json({ request: saved }, { status: data.id ? 200 : 201 });
}
