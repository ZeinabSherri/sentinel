"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { RiskHeatmap } from "@/components/dashboard/risk-heatmap";
import { LiveFeed } from "@/components/dashboard/live-feed";
import { AlertStrip } from "@/components/dashboard/alert-strip";
import { scoreColor } from "@/lib/utils";
import { RefreshCw } from "lucide-react";

interface DashboardData {
  stats: {
    activeAgents: number;
    outputsToday: number;
    avgRiskScore: number | null;
    failCountLastHour: number;
  };
  heatmap: {
    agentId: string;
    agentName: string | null;
    day: string;
    avgScore: number | null;
  }[];
  liveFeed: {
    id: string;
    agentName: string | null;
    text: string;
    compositeScore: number | null;
    status: string | null;
    createdAt: string;
  }[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard");
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setLastRefresh(new Date());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const avgScore = data?.stats.avgRiskScore;
  const avgScoreClass = avgScore !== null && avgScore !== undefined
    ? scoreColor(avgScore)
    : "text-zinc-500";

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-zinc-100">Dashboard</h1>
          <div className="flex items-center gap-2 text-xs text-zinc-600">
            <RefreshCw className="h-3 w-3" />
            Auto-refreshes every 10s · Last: {lastRefresh.toLocaleTimeString()}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard
            title="Active Agents"
            value={loading ? "—" : (data?.stats.activeAgents ?? 0)}
            sub="last 7 days"
          />
          <StatCard
            title="Outputs Today"
            value={loading ? "—" : (data?.stats.outputsToday ?? 0)}
            sub="since midnight UTC"
          />
          <StatCard
            title="Avg Risk Score"
            value={
              loading
                ? "—"
                : avgScore !== null && avgScore !== undefined
                ? avgScore
                : "—"
            }
            sub="last 24 hours"
            valueClass={avgScoreClass}
          />
          <StatCard
            title="FAIL Alerts"
            value={loading ? "—" : (data?.stats.failCountLastHour ?? 0)}
            sub="last hour"
            valueClass={
              (data?.stats.failCountLastHour ?? 0) > 0
                ? "text-red-400"
                : "text-zinc-100"
            }
          />
        </div>

        {/* Heatmap */}
        <Card>
          <CardHeader>
            <CardTitle>Risk Heatmap — 7 Day View</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-32 flex items-center justify-center text-zinc-600 text-sm">
                Loading…
              </div>
            ) : (
              <RiskHeatmap data={data?.heatmap ?? []} />
            )}
          </CardContent>
        </Card>

        {/* Live feed */}
        <Card>
          <CardHeader>
            <CardTitle>Live Output Feed</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-32 flex items-center justify-center text-zinc-600 text-sm">
                Loading…
              </div>
            ) : (
              <LiveFeed rows={data?.liveFeed ?? []} />
            )}
          </CardContent>
        </Card>
      </div>

      <AlertStrip failCount={data?.stats.failCountLastHour ?? 0} />
    </>
  );
}
