"use client";

import { heatmapColor } from "@/lib/utils";
import { format, subDays, startOfDay } from "date-fns";

interface HeatmapEntry {
  agentId: string;
  agentName: string | null;
  day: string;
  avgScore: number | null;
}

interface RiskHeatmapProps {
  data: HeatmapEntry[];
}

export function RiskHeatmap({ data }: RiskHeatmapProps) {
  const days = Array.from({ length: 7 }, (_, i) =>
    format(subDays(new Date(), 6 - i), "yyyy-MM-dd")
  );

  const agentNames = Array.from(
    new Map(data.map((d) => [d.agentId, d.agentName ?? d.agentId])).entries()
  );

  const scoreMap = new Map(
    data.map((d) => [`${d.agentId}:${d.day.slice(0, 10)}`, d.avgScore])
  );

  if (agentNames.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-zinc-600 text-sm">
        No data yet
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr>
            <th className="text-left text-zinc-500 font-medium pb-2 pr-4 w-40">Agent</th>
            {days.map((day) => (
              <th
                key={day}
                className="text-center text-zinc-600 font-normal pb-2 w-12"
              >
                {format(new Date(day + "T12:00:00"), "MMM d")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="space-y-1">
          {agentNames.map(([agentId, agentName]) => (
            <tr key={agentId}>
              <td className="text-zinc-400 pr-4 py-1 truncate max-w-[10rem]" title={agentName}>
                {agentName}
              </td>
              {days.map((day) => {
                const score = scoreMap.get(`${agentId}:${day}`) ?? null;
                return (
                  <td key={day} className="p-1">
                    <div
                      className={`w-8 h-8 rounded-sm mx-auto ${heatmapColor(score)} cursor-default transition-opacity hover:opacity-80`}
                      title={score !== null ? `Score: ${score}` : "No data"}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex items-center gap-4 mt-4 text-xs text-zinc-500">
        <span>Risk level:</span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-green-700 inline-block" />
          Low (&lt;30)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-amber-600 inline-block" />
          Medium (30–70)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-red-700 inline-block" />
          High (&gt;70)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-zinc-800 inline-block" />
          No data
        </span>
      </div>
    </div>
  );
}
