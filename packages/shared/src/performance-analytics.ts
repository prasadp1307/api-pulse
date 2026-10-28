import { computeLatencyStats } from "./percentiles";

export type PerformanceSnapshot = {
  latencyMs: number;
  rating: "fast" | "normal" | "slow" | "critical";
  baselineMs: number | null;
  p50: number | null;
  p95: number | null;
  sampleCount: number;
};

export function analyzePerformance(
  latencyMs: number,
  recentLatencies: number[]
): PerformanceSnapshot {
  const stats = computeLatencyStats(recentLatencies);
  const baselineMs = stats.p50 ?? (recentLatencies.length ? stats.avg : null);

  let rating: PerformanceSnapshot["rating"] = "normal";
  if (latencyMs < 200) rating = "fast";
  else if (baselineMs != null && latencyMs > baselineMs * 2) rating = "critical";
  else if (latencyMs > 1000 || (baselineMs != null && latencyMs > baselineMs * 1.5)) {
    rating = "slow";
  }

  return {
    latencyMs,
    rating,
    baselineMs,
    p50: stats.p50,
    p95: stats.p95,
    sampleCount: recentLatencies.length,
  };
}
