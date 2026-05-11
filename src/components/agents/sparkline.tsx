"use client";

import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";

interface SparklineProps {
  data: { day: string; avgScore: number }[];
}

export function Sparkline({ data }: SparklineProps) {
  if (data.length === 0) {
    return <div className="h-10 w-24 bg-zinc-800/40 rounded" />;
  }

  return (
    <ResponsiveContainer width={96} height={40}>
      <LineChart data={data}>
        <Line
          type="monotone"
          dataKey="avgScore"
          stroke="#f59e0b"
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
        <Tooltip
          contentStyle={{
            background: "#18181b",
            border: "1px solid #3f3f46",
            borderRadius: "4px",
            fontSize: "11px",
            color: "#e4e4e7",
          }}
          labelFormatter={() => ""}
          formatter={(val: number) => [Math.round(val), "Risk"]}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
