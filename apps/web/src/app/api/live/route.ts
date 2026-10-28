import { getSessionUserId } from "@/lib/session";
import { getRedis, LIVE_CHANNEL } from "@/lib/redis";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const redis = getRedis();
  if (redis.status !== "ready") {
    await redis.connect();
  }

  const encoder = new TextEncoder();
  let sub: ReturnType<typeof redis.duplicate> | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      sub = redis.duplicate();
      await sub.connect();
      await sub.subscribe(LIVE_CHANNEL);

      const send = (data: string) => {
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      send(JSON.stringify({ type: "connected", at: new Date().toISOString() }));

      sub.on("message", (_channel, message) => {
        send(message);
      });

      const heartbeat = setInterval(() => {
        send(JSON.stringify({ type: "heartbeat", at: new Date().toISOString() }));
      }, 15000);

      const cleanup = () => {
        clearInterval(heartbeat);
        sub?.unsubscribe(LIVE_CHANNEL).catch(() => {});
        sub?.quit().catch(() => {});
      };

      (controller as unknown as { _cleanup?: () => void })._cleanup = cleanup;
    },
    cancel() {
      const c = this as unknown as { _cleanup?: () => void };
      c._cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
