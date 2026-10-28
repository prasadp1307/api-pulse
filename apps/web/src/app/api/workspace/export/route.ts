import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@api-pulse/database";
import { getSessionUserId } from "@/lib/session";

export async function GET(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const collectionId = req.nextUrl.searchParams.get("collectionId");
  if (!collectionId) {
    return NextResponse.json({ error: "collectionId required" }, { status: 400 });
  }

  const collection = await prisma.apiCollection.findFirst({
    where: { id: collectionId, userId },
    include: { requests: true },
  });
  if (!collection) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    collection: {
      name: collection.name,
      description: collection.description,
      requests: collection.requests.map((r) => ({
        name: r.name,
        method: r.method,
        url: r.url,
        headers: r.headers,
        queryParams: r.queryParams,
        body: r.body,
        bodyType: r.bodyType,
        authType: r.authType,
        authConfig: r.authConfig,
        preRequestScript: r.preRequestScript,
        testScript: r.testScript,
        chainExtract: r.chainExtract,
      })),
    },
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${collection.name.replace(/\s+/g, "-")}.apipulse.json"`,
    },
  });
}
