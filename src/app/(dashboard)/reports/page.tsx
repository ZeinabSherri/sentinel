"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { scoreColor } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Download, FileText } from "lucide-react";
import { format, subDays } from "date-fns";

interface ReportData {
  meta: { orgName: string; dateFrom: string; dateTo: string; generatedAt: string };
  summary: {
    total: number;
    avgScore: number | null;
    passCount: number;
    warnCount: number;
    failCount: number;
    passRate: number;
  };
  timeline: { day: string; passCount: number; warnCount: number; failCount: number }[];
  agents: { agentName: string | null; total: number; avgScore: number | null; failCount: number }[];
  topFlagged: { id: string; agentName: string | null; text: string; compositeScore: number | null; status: string | null }[];
}

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState(
    format(subDays(new Date(), 30), "yyyy-MM-dd")
  );
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ReportData | null>(null);

  async function generate() {
    setLoading(true);
    const res = await fetch(
      `/api/reports/generate?date_from=${dateFrom}&date_to=${dateTo}`
    );
    if (res.ok) {
      setData(await res.json());
    }
    setLoading(false);
  }

  async function downloadPdf() {
    if (!data) return;

    const { jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text("Sentinel Compliance Report", 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Organization: ${data.meta.orgName}`, 14, 32);
    doc.text(`Period: ${data.meta.dateFrom} → ${data.meta.dateTo}`, 14, 38);
    doc.text(`Generated: ${new Date(data.meta.generatedAt).toLocaleString()}`, 14, 44);

    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text("Summary", 14, 56);

    autoTable(doc, {
      startY: 62,
      head: [["Metric", "Value"]],
      body: [
        ["Total Outputs", String(data.summary.total)],
        ["Average Risk Score", data.summary.avgScore !== null ? String(data.summary.avgScore) : "N/A"],
        ["Pass", `${data.summary.passCount} (${data.summary.passRate}%)`],
        ["Warn", String(data.summary.warnCount)],
        ["Fail", String(data.summary.failCount)],
      ],
      theme: "striped",
      headStyles: { fillColor: [39, 39, 42] },
    });

    const afterSummary = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(14);
    doc.text("Per-Agent Breakdown", 14, afterSummary);

    autoTable(doc, {
      startY: afterSummary + 6,
      head: [["Agent", "Outputs", "Avg Score", "Failures"]],
      body: data.agents.map((a) => [
        a.agentName ?? "Unknown",
        String(a.total),
        a.avgScore !== null ? String(a.avgScore) : "N/A",
        String(a.failCount),
      ]),
      theme: "striped",
      headStyles: { fillColor: [39, 39, 42] },
    });

    doc.save(`sentinel-report-${dateFrom}-${dateTo}.pdf`);
  }

  const chartData = (data?.timeline ?? []).map((d) => ({
    date: format(new Date(d.day + "Z"), "MMM d"),
    Pass: d.passCount,
    Warn: d.warnCount,
    Fail: d.failCount,
  }));

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-100">Reports</h1>
        {data && (
          <Button size="sm" onClick={downloadPdf}>
            <Download className="h-4 w-4 mr-1.5" />
            Download PDF
          </Button>
        )}
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-end gap-4">
            <div className="space-y-1.5">
              <Label>From</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1.5">
              <Label>To</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-40"
              />
            </div>
            <Button onClick={generate} disabled={loading}>
              {loading ? "Generating…" : "Generate Report"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {data && (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-5 gap-4">
            {[
              { label: "Total", value: data.summary.total },
              { label: "Pass Rate", value: `${data.summary.passRate}%` },
              { label: "PASS", value: data.summary.passCount },
              { label: "WARN", value: data.summary.warnCount },
              { label: "FAIL", value: data.summary.failCount },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="p-4">
                  <div className="text-xs text-zinc-500 uppercase tracking-wide mb-1">{s.label}</div>
                  <div className="font-mono text-2xl font-bold text-zinc-100">{s.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Timeline chart */}
          <Card>
            <CardHeader>
              <CardTitle>Output Status Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} barSize={12}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#71717a", fontSize: 11 }}
                    axisLine={{ stroke: "#3f3f46" }}
                    tickLine={false}
                  />
                  <YAxis
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
                  <Bar dataKey="Pass" fill="#166534" stackId="a" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Warn" fill="#78350f" stackId="a" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Fail" fill="#7f1d1d" stackId="a" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Per-agent table */}
          <Card>
            <CardHeader>
              <CardTitle>Per-Agent Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">Agent</th>
                    <th className="text-right text-xs text-zinc-500 font-medium px-4 py-3 w-24">Outputs</th>
                    <th className="text-right text-xs text-zinc-500 font-medium px-4 py-3 w-24">Avg Score</th>
                    <th className="text-right text-xs text-zinc-500 font-medium px-4 py-3 w-20">Failures</th>
                  </tr>
                </thead>
                <tbody>
                  {data.agents.map((a, i) => (
                    <tr key={i} className="border-b border-zinc-800/50">
                      <td className="px-4 py-3 text-zinc-200 text-sm">{a.agentName ?? "Unknown"}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-zinc-300">{a.total}</td>
                      <td className="px-4 py-3 text-right">
                        {a.avgScore !== null ? (
                          <span className={`font-mono text-xs ${scoreColor(a.avgScore)}`}>
                            {a.avgScore}
                          </span>
                        ) : (
                          <span className="text-zinc-600 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-mono text-xs ${a.failCount > 0 ? "text-red-400" : "text-zinc-500"}`}>
                          {a.failCount}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Top flagged outputs */}
          {data.topFlagged.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top Flagged Outputs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.topFlagged.map((out) => (
                  <div
                    key={out.id}
                    className="flex items-start gap-3 p-3 bg-red-900/10 border border-red-900/20 rounded-md"
                  >
                    <FileText className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-zinc-400">{out.agentName}</span>
                        {out.status && (
                          <Badge
                            variant={
                              out.status === "FAIL" ? "fail" : out.status === "WARN" ? "warn" : "pass"
                            }
                          >
                            {out.status}
                          </Badge>
                        )}
                        {out.compositeScore !== null && (
                          <span className={`font-mono text-xs ${scoreColor(out.compositeScore)}`}>
                            {out.compositeScore}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 font-mono leading-relaxed">
                        {out.text.slice(0, 200)}…
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
