"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { truncate, formatRelativeTime, scoreColor } from "@/lib/utils";
import { ArrowLeft, Bot } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { format } from "date-fns";

interface AgentDetail {
  agent: { id: string; name: string; type: string; createdAt: string };
  dailyScores: {
    day: string;
    avgHallucination: number | null;
    avgPolicy: number | null;
    avgQuality: number | null;
    avgComposite: number | null;
    count: number;
  }[];
  flaggedOutputs: {
    id: string;
    text: string;
    compositeScore: number | null;
    status: string | null;
    createdAt: string;
  }[];
}

function statusVariant(s: string | null): "pass" | "warn" | "fail" | "default" {
  if (s === "PASS") return "pass";
  if (s === "WARN") return "warn";
  if (s === "FAIL") return "fail";
  return "default";
}

export default function AgentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<AgentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/agents/${id}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-600 text-sm">
        Loading…
      </div>
    );
  }

  if (!data) {
    return <div className="text-center py-12 text-zinc-500 text-sm">Agent not found</div>;
  }

  const chartData = data.dailyScores.map((d) => ({
    date: format(new Date(d.day + "Z"), "MMM d"),
    Composite: d.avgComposite,
    Hallucination: d.avgHallucination,
    Quality: d.avgQuality,
    Count: d.count,
  }));

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <Link href="/agents">
          <Button variant="ghost" size="sm" className="mb-3 -ml-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Agents
          </Button>
        </Link>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-zinc-800 flex items-center justify-center">
            <Bot className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-zinc-100">{data.agent.name}</h1>
            <p className="text-xs text-zinc-500">{data.agent.type}</p>
          </div>
        </div>
      </div>

      {/* Score history chart */}
      <Card>
        <CardHeader>
          <CardTitle>Score History — Last 30 Days</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-zinc-600 text-sm">
              No data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#71717a", fontSize: 11 }}
                  axisLine={{ stroke: "#3f3f46" }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: "#71717a", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#18181b",
                    border: "1px solid #3f3f46",
                    borderRadius: "4px",
                    fontSize: "11px",
                    color: "#e4e4e7",
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: "11px", color: "#71717a", paddingTop: "12px" }}
                />
                <Line
                  type="monotone"
                  dataKey="Composite"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="Hallucination"
                  stroke="#4ade80"
                  strokeWidth={1.5}
                  dot={false}
                  strokeDasharray="4 2"
                />
                <Line
                  type="monotone"
                  dataKey="Quality"
                  stroke="#60a5fa"
                  strokeWidth={1.5}
                  dot={false}
                  strokeDasharray="4 2"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Top flagged outputs */}
      <Card>
        <CardHeader>
          <CardTitle>Top Flagged Outputs</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.flaggedOutputs.length === 0 ? (
            <div className="px-4 py-8 text-center text-zinc-600 text-sm">
              No flagged outputs
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">Output</th>
                  <th className="text-right text-xs text-zinc-500 font-medium px-4 py-3 w-20">Score</th>
                  <th className="text-right text-xs text-zinc-500 font-medium px-4 py-3 w-20">Status</th>
                  <th className="text-right text-xs text-zinc-500 font-medium px-4 py-3 w-24">Time</th>
                </tr>
              </thead>
              <tbody>
                {data.flaggedOutputs.map((out) => (
                  <tr key={out.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20">
                    <td className="px-4 py-3">
                      <Link
                        href={`/outputs/${out.id}`}
                        className="text-zinc-400 hover:text-zinc-200 font-mono text-xs"
                      >
                        {truncate(out.text, 80)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`font-mono text-xs ${scoreColor(out.compositeScore ?? 0)}`}
                      >
                        {out.compositeScore ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {out.status ? (
                        <Badge variant={statusVariant(out.status)}>{out.status}</Badge>
                      ) : (
                        <Badge variant="outline">pending</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-600 text-xs">
                      {formatRelativeTime(out.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
