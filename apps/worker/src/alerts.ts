import { prisma } from "@api-pulse/database";

export async function evaluateAlerts(monitorId: string, checkId: string) {
  const rules = await prisma.alertRule.findMany({
    where: { monitorId, enabled: true },
  });
  if (rules.length === 0) return;

  const recent = await prisma.healthCheck.findMany({
    where: { monitorId },
    orderBy: { checkedAt: "desc" },
    take: 10,
  });

  const latest = recent[0];
  if (!latest) return;

  for (const rule of rules) {
    const consecutiveDown = recent
      .slice(0, rule.consecutiveDown)
      .every((c: { status: string }) => c.status === "DOWN");
    const latencyBreached =
      rule.latencyThresholdMs != null &&
      latest.latencyMs > rule.latencyThresholdMs &&
      latest.status !== "DOWN";

    if (consecutiveDown && recent.length >= rule.consecutiveDown) {
      const message = `Monitor is DOWN (${rule.consecutiveDown} consecutive failures). Latest: ${latest.errorMessage ?? "unknown"}`;
      await createAlert(rule.id, message, "CRITICAL");
      await sendWebhook(message, monitorId, checkId);
    } else if (latencyBreached) {
      const message = `High latency: ${latest.latencyMs}ms (threshold ${rule.latencyThresholdMs}ms)`;
      await createAlert(rule.id, message, "WARNING");
      await sendWebhook(message, monitorId, checkId);
    }
  }
}

async function createAlert(
  alertRuleId: string,
  message: string,
  severity: "INFO" | "WARNING" | "CRITICAL"
) {
  const recentDuplicate = await prisma.alertEvent.findFirst({
    where: {
      alertRuleId,
      message,
      createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
    },
  });
  if (recentDuplicate) return;

  await prisma.alertEvent.create({
    data: { alertRuleId, message, severity },
  });
}

async function sendWebhook(message: string, monitorId: string, checkId: string) {
  const url = process.env.ALERT_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: message,
        monitorId,
        checkId,
        source: "api-pulse",
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (err) {
    console.error("[alerts] webhook failed", err);
  }
}
