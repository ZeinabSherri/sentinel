"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { truncate, formatRelativeTime } from "@/lib/utils";

interface FeedRow {
  id: string;
  agentName: string | null;
  text: string;
  compositeScore: number | null;
  status: string | null;
  createdAt: string;
}

interface LiveFeedProps {
  rows: FeedRow[];
}

function statusVariant(status: string | null): "pass" | "warn" | "fail" | "default" {
  if (status === "PASS") return "pass";
  if (status === "WARN") return "warn";
  if (status === "FAIL") return "fail";
  return "default";
}

export function LiveFeed({ rows }: LiveFeedProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800">
            <th className="text-left text-xs text-zinc-500 font-medium pb-2 pr-4 w-36">Agent</th>
            <th className="text-left text-xs text-zinc-500 font-medium pb-2 pr-4">Output</th>
            <th className="text-right text-xs text-zinc-500 font-medium pb-2 pr-4 w-20">Score</th>
            <th className="text-right text-xs text-zinc-500 font-medium pb-2 pr-4 w-20">Status</th>
            <th className="text-right text-xs text-zinc-500 font-medium pb-2 w-24">Time</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="text-center py-8 text-zinc-600 text-xs">
                No outputs yet
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr
                key={row.id}
                className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors animate-fade-in"
                style={{ animationDelay: `${i * 20}ms` }}
              >
                <td className="py-2.5 pr-4">
                  <span className="text-zinc-300 text-xs font-medium truncate block max-w-[8rem]">
                    {row.agentName ?? "Unknown"}
                  </span>
                </td>
                <td className="py-2.5 pr-4">
                  <Link
                    href={`/outputs/${row.id}`}
                    className="text-zinc-400 hover:text-zinc-200 transition-colors text-xs font-mono"
                  >
                    {truncate(row.text, 80)}
                  </Link>
                </td>
                <td className="py-2.5 pr-4 text-right">
                  <span className="font-mono text-xs text-zinc-300">
                    {row.compositeScore !== null ? row.compositeScore : "—"}
                  </span>
                </td>
                <td className="py-2.5 pr-4 text-right">
                  {row.status ? (
                    <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                  ) : (
                    <Badge variant="outline">pending</Badge>
                  )}
                </td>
                <td className="py-2.5 text-right">
                  <span className="text-zinc-600 text-xs">
                    {formatRelativeTime(row.createdAt)}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
