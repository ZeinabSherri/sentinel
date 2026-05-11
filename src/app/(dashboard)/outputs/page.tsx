"use client";

import { Suspense } from "react";
import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { truncate, formatRelativeTime } from "@/lib/utils";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";

interface OutputRow {
  id: string;
  agentId: string;
  agentName: string | null;
  text: string;
  createdAt: string;
  compositeScore: number | null;
  status: string | null;
}

interface Agent {
  id: string;
  name: string;
}

function statusVariant(s: string | null): "pass" | "warn" | "fail" | "default" {
  if (s === "PASS") return "pass";
  if (s === "WARN") return "warn";
  if (s === "FAIL") return "fail";
  return "default";
}

function OutputsInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [outputs, setOutputs] = useState<OutputRow[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const page = parseInt(searchParams.get("page") || "1");
  const statusFilter = searchParams.get("status") || "";
  const agentFilter = searchParams.get("agent_id") || "";
  const limit = 50;

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    if (statusFilter) params.set("status", statusFilter);
    if (agentFilter) params.set("agent_id", agentFilter);

    const [outRes, agentRes] = await Promise.all([
      fetch(`/api/outputs?${params}`),
      fetch("/api/agents"),
    ]);

    if (outRes.ok) {
      const json = await outRes.json();
      setOutputs(json.data);
      setTotal(json.pagination.total);
    }
    if (agentRes.ok) {
      setAgents(await agentRes.json());
    }
    setLoading(false);
  }, [page, statusFilter, agentFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function updateFilter(key: string, value: string) {
    const p = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      p.set(key, value);
    } else {
      p.delete(key);
    }
    p.set("page", "1");
    router.push(`/outputs?${p.toString()}`);
  }

  const pages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-100">Outputs</h1>
        <span className="text-xs text-zinc-500 font-mono">{total} total</span>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter || "all"} onValueChange={(v) => updateFilter("status", v)}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="PASS">PASS</SelectItem>
            <SelectItem value="WARN">WARN</SelectItem>
            <SelectItem value="FAIL">FAIL</SelectItem>
          </SelectContent>
        </Select>

        <Select value={agentFilter || "all"} onValueChange={(v) => updateFilter("agent_id", v)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All agents" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All agents</SelectItem>
            {agents.map((a) => (
              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3 w-36">Agent</th>
                <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">Output</th>
                <th className="text-right text-xs text-zinc-500 font-medium px-4 py-3 w-20">Score</th>
                <th className="text-right text-xs text-zinc-500 font-medium px-4 py-3 w-20">Status</th>
                <th className="text-right text-xs text-zinc-500 font-medium px-4 py-3 w-28">Time</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-zinc-600 text-xs">Loading…</td>
                </tr>
              ) : outputs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-zinc-600 text-xs">No outputs found</td>
                </tr>
              ) : (
                outputs.map((row) => (
                  <tr key={row.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-zinc-300 text-xs">{row.agentName ?? "Unknown"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/outputs/${row.id}`} className="text-zinc-400 hover:text-zinc-200 font-mono text-xs">
                        {truncate(row.text, 90)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-mono text-xs text-zinc-300">{row.compositeScore ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {row.status ? (
                        <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                      ) : (
                        <Badge variant="outline">pending</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-600 text-xs">
                      {formatRelativeTime(row.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/outputs/${row.id}`}>
                        <ExternalLink className="h-3.5 w-3.5 text-zinc-600 hover:text-zinc-400" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {pages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">Page {page} of {pages}</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline" size="sm"
              disabled={page <= 1}
              onClick={() => { const p = new URLSearchParams(searchParams.toString()); p.set("page", String(page - 1)); router.push(`/outputs?${p}`); }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline" size="sm"
              disabled={page >= pages}
              onClick={() => { const p = new URLSearchParams(searchParams.toString()); p.set("page", String(page + 1)); router.push(`/outputs?${p}`); }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OutputsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64 text-zinc-600 text-sm">Loading…</div>
    }>
      <OutputsInner />
    </Suspense>
  );
}
