"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScoreCircle } from "@/components/outputs/score-circle";
import { scoreColor, formatRelativeTime } from "@/lib/utils";
import {
  CheckCircle,
  AlertTriangle,
  BookOpen,
  XCircle,
  ArrowLeft,
  ChevronDown,
} from "lucide-react";

interface OutputDetail {
  id: string;
  agentName: string | null;
  agentType: string | null;
  text: string;
  context: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  hallucinationScore: number | null;
  policyScore: number | null;
  qualityScore: number | null;
  compositeScore: number | null;
  status: string | null;
  flaggedClaims: string[] | null;
  issues: string[] | null;
  reasoning: string | null;
  violations: {
    id: string;
    policyName: string;
    severity: string;
    evidence: string | null;
  }[];
  auditTrail: {
    id: string;
    action: string;
    notes: string | null;
    createdAt: string;
    reviewerName: string | null;
    reviewerEmail: string | null;
  }[];
}

function highlightText(text: string, flaggedClaims: string[]): React.ReactNode {
  if (!flaggedClaims.length) return text;
  let result = text;
  const parts: { text: string; flagged: boolean }[] = [];
  let remaining = text;

  for (const claim of flaggedClaims) {
    const idx = remaining.toLowerCase().indexOf(claim.toLowerCase());
    if (idx === -1) continue;
    if (idx > 0) parts.push({ text: remaining.slice(0, idx), flagged: false });
    parts.push({ text: remaining.slice(idx, idx + claim.length), flagged: true });
    remaining = remaining.slice(idx + claim.length);
  }
  if (remaining) parts.push({ text: remaining, flagged: false });

  if (parts.length === 0) return text;

  return (
    <>
      {parts.map((p, i) =>
        p.flagged ? (
          <span
            key={i}
            className="underline decoration-red-500 decoration-wavy text-red-300"
            title="Flagged claim"
          >
            {p.text}
          </span>
        ) : (
          <span key={i}>{p.text}</span>
        )
      )}
    </>
  );
}

function statusVariant(s: string | null): "pass" | "warn" | "fail" | "default" {
  if (s === "PASS") return "pass";
  if (s === "WARN") return "warn";
  if (s === "FAIL") return "fail";
  return "default";
}

export default function OutputDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [output, setOutput] = useState<OutputDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [reviewed, setReviewed] = useState(false);

  useEffect(() => {
    fetch(`/api/outputs/${id}`)
      .then((r) => r.json())
      .then((d) => setOutput(d))
      .finally(() => setLoading(false));
  }, [id]);

  async function submitReview(action: string) {
    setReviewing(true);
    const res = await fetch(`/api/outputs/${id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, notes: reviewNotes }),
    });
    if (res.ok) {
      setReviewed(true);
      const data = await fetch(`/api/outputs/${id}`).then((r) => r.json());
      setOutput(data);
    }
    setReviewing(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-600 text-sm">
        Loading…
      </div>
    );
  }

  if (!output) {
    return (
      <div className="text-center py-12 text-zinc-500 text-sm">Output not found</div>
    );
  }

  const scoreClass = scoreColor(output.compositeScore ?? 0);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="mb-3 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-base font-semibold text-zinc-100">
              {output.agentName ?? "Unknown Agent"}
            </h1>
            {output.status && (
              <Badge variant={statusVariant(output.status)}>{output.status}</Badge>
            )}
            <span className="text-xs text-zinc-600 font-mono">
              {formatRelativeTime(output.createdAt)}
            </span>
          </div>
          <p className="text-xs text-zinc-600 font-mono mt-1">{output.id}</p>
        </div>

        {/* Composite score */}
        {output.compositeScore !== null && (
          <div className="text-right">
            <div className={`font-mono text-5xl font-bold ${scoreClass}`}>
              {output.compositeScore}
            </div>
            <div className="text-xs text-zinc-500 mt-1">composite risk</div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: output text + context */}
        <div className="col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Output Text</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-mono text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                {highlightText(output.text, output.flaggedClaims ?? [])}
              </div>
            </CardContent>
          </Card>

          {output.context && (
            <Card>
              <CardHeader>
                <CardTitle>Source Context</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-zinc-500 font-mono whitespace-pre-wrap leading-relaxed">
                  {output.context}
                </div>
              </CardContent>
            </Card>
          )}

          {output.violations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Policy Violations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {output.violations.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-start gap-3 p-3 bg-red-900/10 border border-red-900/30 rounded-md"
                  >
                    <XCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-zinc-200">{v.policyName}</div>
                      {v.evidence && (
                        <div className="text-xs text-zinc-500 mt-1 font-mono">{v.evidence}</div>
                      )}
                      <Badge
                        variant={
                          v.severity === "high" || v.severity === "critical" ? "fail" : "warn"
                        }
                        className="mt-1.5"
                      >
                        {v.severity}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Action bar */}
          <Card>
            <CardHeader>
              <CardTitle>Review Action</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {reviewed && (
                <div className="flex items-center gap-2 text-sm text-green-400">
                  <CheckCircle className="h-4 w-4" />
                  Review submitted
                </div>
              )}
              <Textarea
                placeholder="Optional notes…"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                className="text-xs h-20"
              />
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => submitReview("reviewed")}
                  disabled={reviewing}
                >
                  <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                  Mark Reviewed
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => submitReview("escalated")}
                  disabled={reviewing}
                >
                  <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
                  Escalate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => submitReview("training_set")}
                  disabled={reviewing}
                >
                  <BookOpen className="h-3.5 w-3.5 mr-1.5" />
                  Add to Training Set
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: scores + audit trail */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Score Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-6">
                <ScoreCircle
                  label="Hallucination"
                  score={output.hallucinationScore}
                  description="Groundedness in sources"
                />
                <ScoreCircle
                  label="Policy"
                  score={
                    output.policyScore !== null
                      ? 100 - output.policyScore
                      : null
                  }
                  description="Policy compliance"
                />
                <ScoreCircle
                  label="Quality"
                  score={output.qualityScore}
                  description="Coherence & tone"
                />
              </div>

              {output.issues && output.issues.length > 0 && (
                <div className="mt-4 space-y-1.5">
                  <div className="text-xs text-zinc-500 font-medium">Issues</div>
                  {output.issues.map((issue, i) => (
                    <div key={i} className="text-xs text-zinc-400 flex items-start gap-1.5">
                      <span className="text-amber-500 mt-0.5">·</span>
                      {issue}
                    </div>
                  ))}
                </div>
              )}

              {output.flaggedClaims && output.flaggedClaims.length > 0 && (
                <div className="mt-4 space-y-1.5">
                  <div className="text-xs text-zinc-500 font-medium">Flagged Claims</div>
                  {output.flaggedClaims.map((claim, i) => (
                    <div key={i} className="text-xs text-red-400 font-mono leading-relaxed">
                      "{claim}"
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Audit trail */}
          <Card>
            <CardHeader>
              <CardTitle>Audit Trail</CardTitle>
            </CardHeader>
            <CardContent>
              {output.auditTrail.length === 0 ? (
                <div className="text-xs text-zinc-600">No actions yet</div>
              ) : (
                <div className="space-y-3">
                  {output.auditTrail.map((entry) => (
                    <div key={entry.id} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                      <div>
                        <div className="text-xs text-zinc-300 capitalize">{entry.action.replace("_", " ")}</div>
                        {entry.notes && (
                          <div className="text-xs text-zinc-600 mt-0.5">{entry.notes}</div>
                        )}
                        <div className="text-xs text-zinc-600 mt-0.5">
                          {entry.reviewerName ?? entry.reviewerEmail} ·{" "}
                          {formatRelativeTime(entry.createdAt)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
