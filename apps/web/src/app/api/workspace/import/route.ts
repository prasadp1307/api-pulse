import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { HttpMethod, prisma, Prisma } from "@api-pulse/database";
import { getSessionUserId } from "@/lib/session";
import { openapiToRequests, parsePostmanCollection } from "@api-pulse/shared";

const bodySchema = z.object({
  format: z.enum(["postman", "openapi", "apipulse"]),
  collectionId: z.string().optional(),
  collectionName: z.string().optional(),
  payload: z.unknown(),
});

const METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"]);

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  let name: string;
  let requests: ReturnType<typeof parsePostmanCollection>["requests"];

  if (parsed.data.format === "postman") {
    const result = parsePostmanCollection(parsed.data.payload);
    name = parsed.data.collectionName ?? result.name;
    requests = result.requests;
  } else if (parsed.data.format === "openapi") {
    const spec = parsed.data.payload as object;
    await prisma.openApiDocument.create({
      data: {
        userId,
        name: (spec as { info?: { title?: string } }).info?.title ?? "OpenAPI",
        spec: spec as Prisma.InputJsonValue,
      },
    });
    const result = openapiToRequests(spec as Parameters<typeof openapiToRequests>[0]);
    name = parsed.data.collectionName ?? result.name;
    requests = result.requests;
  } else {
    const root = parsed.data.payload as {
      collection?: { name?: string; requests?: unknown[] };
    };
    name = parsed.data.collectionName ?? root.collection?.name ?? "Imported";
    requests = (root.collection?.requests ?? []) as typeof requests;
  }

  let collectionId = parsed.data.collectionId;
  if (!collectionId) {
    const col = await prisma.apiCollection.create({
      data: { userId, name, description: `Imported ${parsed.data.format}` },
    });
    collectionId = col.id;
  }

  for (let i = 0; i < requests.length; i++) {
    const r = requests[i];
    const method = METHODS.has(r.method) ? r.method : "GET";
    await prisma.savedApiRequest.create({
      data: {
        userId,
        collectionId,
        name: r.name,
        method: method as HttpMethod,
        url: r.url,
        headers: r.headers as Prisma.InputJsonValue,
        queryParams: r.queryParams as Prisma.InputJsonValue,
        body: r.body ?? null,
        sortOrder: i,
      },
    });
  }

  return NextResponse.json({ collectionId, imported: requests.length });
}
