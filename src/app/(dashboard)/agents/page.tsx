"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkline } from "@/components/agents/sparkline";
import { scoreColor } from "@/lib/utils";
import { Bot } from "lucide-react";

interface AgentRow {
  id: string;
  name: string;
  type: string;
  createdAt: string;
  outputCount7d: number;
  avgScore7d: number | null;
  sparkline: { day: string; avgScore: number }[];
}

function statusVariant(score: number | null): "pass" | "warn" | "fail" | "default" {
  if (score === null) return "default";
  if (score < 30) return "pass";
  if (score <= 70) return "warn";
  return "fail";
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/agents")
      .then((r) => r.json())
      .then(setAgents)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-600 text-sm">
        Loading…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-zinc-100">Agents</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {agents.length === 0 ? (
          <div className="col-span-3 text-center py-12 text-zinc-600 text-sm">
            No agents found
          </div>
        ) : (
          agents.map((agent) => (
            <Link key={agent.id} href={`/agents/${agent.id}`}>
              <Card className="hover:border-zinc-700 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-md bg-zinc-800 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-amber-500" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-zinc-200">{agent.name}</div>
                        <div className="text-xs text-zinc-500">{agent.type}</div>
                      </div>
                    </div>
                    {agent.avgScore7d !== null && (
                      <Badge variant={statusVariant(agent.avgScore7d)}>
                        {agent.avgScore7d}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-xs text-zinc-500">
                        <span className="font-mono text-zinc-300">{agent.outputCount7d}</span>{" "}
                        outputs · 7d
                      </div>
                      {agent.avgScore7d !== null && (
                        <div className={`text-xs mt-0.5 ${scoreColor(agent.avgScore7d)}`}>
                          avg risk {agent.avgScore7d}
                        </div>
                      )}
                    </div>
                    <Sparkline data={agent.sparkline} />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
