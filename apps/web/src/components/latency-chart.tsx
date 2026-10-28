"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Point = { t: string; latencyMs: number; status: string };

export function LatencyChart({ data }: { data: Point[] }) {
  const chartData = data.map((d) => ({
    time: new Date(d.t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    latencyMs: d.latencyMs,
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex h-52 items-center justify-center text-sm text-zinc-600">
        No samples in the selected window.
      </div>
    );
  }

  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#27272a" strokeDasharray="4 4" vertical={false} />
          <XAxis dataKey="time" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis
            stroke="#52525b"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={40}
            unit="ms"
          />
          <Tooltip
            contentStyle={{
              background: "#18181b",
              border: "1px solid #27272a",
              borderRadius: 4,
              fontSize: 12,
            }}
            labelStyle={{ color: "#a1a1aa" }}
          />
          <Line
            type="monotone"
            dataKey="latencyMs"
            stroke="#3b82f6"
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
