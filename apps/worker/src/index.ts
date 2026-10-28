import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config();
import { prisma } from "@api-pulse/database";
import { runHealthCheck } from "@api-pulse/shared";
import { evaluateAlerts } from "./alerts";
import { getRedis, publishCheckEvent } from "./redis";

const POLL_MS = Number(process.env.WORKER_POLL_INTERVAL_MS ?? 5000);
const BATCH = 20;

async function processDueMonitors() {
  const now = new Date();
  const due = await prisma.monitor.findMany({
    where: { enabled: true, nextCheckAt: { lte: now } },
    orderBy: { nextCheckAt: "asc" },
    take: BATCH,
  });

  for (const monitor of due) {
    const headers =
      typeof monitor.headers === "object" && monitor.headers !== null
        ? (monitor.headers as Record<string, string>)
        : {};

    const result = await runHealthCheck({
      url: monitor.url,
      method: monitor.method,
      timeoutMs: monitor.timeoutMs,
      expectedStatus: monitor.expectedStatus,
      headers,
      body: monitor.body,
    });

    const check = await prisma.healthCheck.create({
      data: {
        monitorId: monitor.id,
        status: result.status,
        httpStatus: result.httpStatus,
        latencyMs: result.latencyMs,
        errorMessage: result.errorMessage,
        responseBody: result.responseBody,
      },
    });

    const nextCheckAt = new Date(Date.now() + monitor.intervalSec * 1000);
    await prisma.monitor.update({
      where: { id: monitor.id },
      data: { lastCheckedAt: check.checkedAt, nextCheckAt },
    });

    await evaluateAlerts(monitor.id, check.id);

    await publishCheckEvent({
      type: "health_check",
      monitorId: monitor.id,
      monitorName: monitor.name,
      status: result.status,
      latencyMs: result.latencyMs,
      checkedAt: check.checkedAt.toISOString(),
    });

    console.log(
      `[check] ${monitor.name} → ${result.status} (${result.latencyMs}ms)`
    );
  }
}

async function main() {
  await getRedis().connect();
  console.log(`API Pulse worker started (poll every ${POLL_MS}ms)`);

  const tick = async () => {
    try {
      await processDueMonitors();
    } catch (err) {
      console.error("[worker] tick error", err);
    }
  };

  await tick();
  setInterval(tick, POLL_MS);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
