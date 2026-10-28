import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma, Prisma } from "@api-pulse/database";
import {
  analyzePerformance,
  buildIntelligenceReport,
  diffJson,
  executeWorkspaceRequest,
  extractJsonPath,
  findResponseSchema,
  generateTests,
  interpolateEnv,
  redactSecrets,
  runTestScript as runTests,
  scanResponseSecurity,
  validateAgainstSchema,
  type WorkspaceRequest,
} from "@api-pulse/shared";
import { getSessionUserId } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { assertUrlAllowed } from "@/lib/workspace/ssrf";

const kvRow = z.object({
  key: z.string(),
  value: z.string(),
  enabled: z.boolean().default(true),
});

const bodySchema = z.object({
  request: z.object({
    name: z.string().optional(),
    method: z.string(),
    url: z.string().min(1),
    headers: z.array(kvRow).default([]),
    queryParams: z.array(kvRow).default([]),
    body: z.string().nullable().optional(),
    bodyType: z.string().optional(),
    authType: z.string().optional(),
    authConfig: z.record(z.unknown()).optional(),
    preRequestScript: z.string().nullable().optional(),
    testScript: z.string().nullable().optional(),
    chainExtract: z
      .object({ variable: z.string(), jsonPath: z.string() })
      .nullable()
      .optional(),
  }),
  environment: z.record(z.string()).optional(),
  saveHistory: z.boolean().default(true),
  baselineResponseBody: z.string().nullable().optional(),
  openApiDocumentId: z.string().optional(),
  workflowSteps: z
    .array(
      z.object({
        method: z.string(),
        url: z.string(),
        headers: z.array(kvRow).default([]),
        queryParams: z.array(kvRow).default([]),
        body: z.string().nullable().optional(),
        bodyType: z.string().optional(),
        authType: z.string().optional(),
        authConfig: z.record(z.unknown()).optional(),
        name: z.string().optional(),
        testScript: z.string().nullable().optional(),
        chainExtract: z
          .object({ variable: z.string(), jsonPath: z.string() })
          .nullable()
          .optional(),
      })
    )
    .optional(),
});

function headerMap(rows: { key: string; value: string; enabled: boolean }[]) {
  const out: Record<string, string> = {};
  for (const r of rows) {
    if (r.enabled && r.key) out[r.key] = r.value;
  }
  return out;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const rl = await rateLimit(`workspace:${ip}`);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const env: Record<string, string> = { ...(parsed.data.environment ?? {}) };
  const chainResults: object[] = [];
  const queue: WorkspaceRequest[] = [parsed.data.request as WorkspaceRequest];
  if (parsed.data.workflowSteps?.length) {
    queue.push(...(parsed.data.workflowSteps as WorkspaceRequest[]));
  }

  let lastResponse = null;
  let lastTests = null;
  const primaryRequest = parsed.data.request;

  for (const item of queue) {
    const url = interpolateEnv(item.url, env);
    try {
      assertUrlAllowed(url);
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "URL not allowed" },
        { status: 400 }
      );
    }

    if (item.preRequestScript?.trim()) {
      try {
        // eslint-disable-next-line no-new-func
        const fn = new Function("env", item.preRequestScript);
        fn(env);
      } catch (err) {
        return NextResponse.json(
          {
            error: `Pre-request script failed: ${err instanceof Error ? err.message : "unknown"}`,
          },
          { status: 400 }
        );
      }
    }

    const response = await executeWorkspaceRequest({ ...item, url, environment: env });
    lastResponse = response;
    lastTests = runTests(item.testScript, response, env);

    if (item.chainExtract?.variable && item.chainExtract.jsonPath) {
      const extracted = extractJsonPath(response.bodyParsed, item.chainExtract.jsonPath);
      if (extracted != null) {
        env[item.chainExtract.variable] = String(extracted);
      }
    }

    chainResults.push({
      name: item.name,
      url,
      status: response.status,
      latencyMs: response.latencyMs,
      extracted: item.chainExtract?.variable ? env[item.chainExtract.variable] : undefined,
    });
  }

  if (!lastResponse) {
    return NextResponse.json({ error: "No request executed" }, { status: 400 });
  }

  const recent = await prisma.apiTestHistory.findMany({
    where: { userId, url: primaryRequest.url, method: primaryRequest.method },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { latencyMs: true },
  });
  const performance = analyzePerformance(
    lastResponse.latencyMs,
    recent.map((r) => r.latencyMs)
  );

  let diff = null as ReturnType<typeof diffJson> | null;
  if (parsed.data.baselineResponseBody) {
    try {
      const before = JSON.parse(parsed.data.baselineResponseBody);
      diff = diffJson(before, lastResponse.bodyParsed);
    } catch {
      diff = diffJson(parsed.data.baselineResponseBody, lastResponse.body);
    }
  }

  let contractValidation: { valid: boolean; errors: string[] } | null = null;
  if (parsed.data.openApiDocumentId) {
    const doc = await prisma.openApiDocument.findFirst({
      where: { id: parsed.data.openApiDocumentId, userId },
    });
    if (doc) {
      const schema = findResponseSchema(
        doc.spec as object,
        primaryRequest.method,
        interpolateEnv(primaryRequest.url, env),
        lastResponse.status
      );
      if (schema) {
        contractValidation = validateAgainstSchema(schema, lastResponse.bodyParsed);
      } else {
        contractValidation = {
          valid: false,
          errors: ["No response schema found in OpenAPI for this operation/status."],
        };
      }
    }
  }

  const reqHeaders = headerMap(primaryRequest.headers ?? []);
  const security = scanResponseSecurity(lastResponse, reqHeaders);

  const intelligence = buildIntelligenceReport({
    request: primaryRequest as WorkspaceRequest,
    response: lastResponse,
    diff: diff ?? undefined,
    security,
    contractErrors: contractValidation?.valid === false ? contractValidation.errors : undefined,
    latencyBaselineMs: performance.baselineMs,
    testsPassed: lastTests?.passed,
  });

  const generatedTests = generateTests(primaryRequest as WorkspaceRequest);

  const safeResponse = {
    ...lastResponse,
    body: redactSecrets(lastResponse.body),
  };

  if (parsed.data.saveHistory) {
    await prisma.apiTestHistory.create({
      data: {
        userId,
        requestName: primaryRequest.name,
        method: primaryRequest.method,
        url: primaryRequest.url,
        statusCode: lastResponse.status || null,
        latencyMs: lastResponse.latencyMs,
        requestSnapshot: parsed.data.request as Prisma.InputJsonValue,
        responseHeaders: lastResponse.headers as Prisma.InputJsonValue,
        responseBody: redactSecrets(lastResponse.body).slice(0, 100_000),
        testResults: {
          ...(lastTests as object),
          intelligenceSummary: intelligence.summary,
        } as Prisma.InputJsonValue,
      },
    });
  }

  return NextResponse.json({
    response: safeResponse,
    tests: lastTests,
    chainResults,
    environment: env,
    diff,
    security,
    contractValidation,
    performance,
    intelligence,
    generatedTests,
  });
}
