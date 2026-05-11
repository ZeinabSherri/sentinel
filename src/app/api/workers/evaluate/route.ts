import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { evaluations, outputs, policies, policyViolations, alerts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { dequeue, queueLength } from "@/lib/redis";
import {
  scoreHallucination,
  checkPolicy,
  rateQuality,
  computeCompositeScore,
  scoreToStatus,
} from "@/lib/claude";

const WORKER_SECRET = process.env.WORKER_SECRET || "worker-secret-change-me";

async function processOne(item: {
  eventId: string;
  payload: {
    outputId: string;
    orgId: string;
    outputText: string;
    context: string;
  };
}) {
  const { outputId, orgId, outputText, context } = item.payload;

  // Fetch active policies for this org
  const orgPolicies = await db
    .select()
    .from(policies)
    .where(and(eq(policies.orgId, orgId), eq(policies.enabled, true)));

  // Run three evaluations in parallel
  const [hallucinationResult, qualityResult, ...policyResults] = await Promise.all([
    scoreHallucination(outputText, context),
    rateQuality(outputText),
    ...orgPolicies.map((policy) =>
      checkPolicy(
        outputText,
        policy.name,
        policy.description ?? "",
        policy.ruleConfig as Record<string, unknown>
      ).then((result) => ({ policy, result }))
    ),
  ]);

  // Compute policy score: 100 if no violations, decrease by severity
  let policyRiskScore = 0;
  const violations = (policyResults as Array<{ policy: typeof orgPolicies[0]; result: Awaited<ReturnType<typeof checkPolicy>> }>)
    .filter((r) => r.result.violated);

  if (violations.length > 0) {
    const severityWeights: Record<string, number> = { low: 20, medium: 50, high: 80 };
    policyRiskScore = Math.min(
      100,
      violations.reduce((acc, v) => acc + (severityWeights[v.result.severity] || 0), 0) / violations.length
    );
  }

  const hallucinationScore = hallucinationResult.score ?? 50;
  const qualityScore = qualityResult.overall ?? 50;
  const compositeScore = computeCompositeScore(hallucinationScore, policyRiskScore, qualityScore);
  const status = scoreToStatus(compositeScore);

  // Insert evaluation
  const [evaluation] = await db
    .insert(evaluations)
    .values({
      outputId,
      hallucinationScore,
      policyScore: Math.round(policyRiskScore),
      qualityScore,
      compositeScore,
      status,
      flaggedClaims: hallucinationResult.flagged_claims ?? [],
      issues: qualityResult.issues ?? [],
      reasoning: hallucinationResult.reasoning,
    })
    .returning({ id: evaluations.id });

  // Insert policy violations
  if (violations.length > 0) {
    await db.insert(policyViolations).values(
      violations.map((v) => ({
        evaluationId: evaluation.id,
        policyId: v.policy.id,
        severity: v.result.severity as "low" | "medium" | "high" | "critical",
        evidence: v.result.evidence,
      }))
    );
  }

  // Fire alert if composite score > 70
  if (compositeScore > 70) {
    const slackWebhook = process.env.SLACK_WEBHOOK_URL;
    if (slackWebhook) {
      try {
        const outputRecord = await db
          .select({ id: outputs.id, agentId: outputs.agentId })
          .from(outputs)
          .where(eq(outputs.id, outputId))
          .limit(1);

        const payload = {
          text: `🚨 *Sentinel Alert*: High-risk output detected (score: ${compositeScore}/100)\nOutput ID: ${outputId}\nStatus: ${status}`,
        };

        await fetch(slackWebhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        await db.insert(alerts).values({
          orgId,
          outputId,
          channel: "slack",
          payload,
        });
      } catch (err) {
        console.error("[Worker] Slack alert failed:", err);
      }
    }
  }

  return { outputId, compositeScore, status };
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-worker-secret");
  if (secret !== WORKER_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const batchSize = parseInt(req.nextUrl.searchParams.get("batch") || "5");
  const results = [];

  for (let i = 0; i < batchSize; i++) {
    const item = await dequeue();
    if (!item) break;

    try {
      const result = await processOne(item as Parameters<typeof processOne>[0]);
      results.push({ success: true, ...result });
    } catch (err) {
      console.error("[Worker] Evaluation failed:", err);
      results.push({ success: false, error: String(err) });
    }
  }

  const remaining = await queueLength();

  return NextResponse.json({
    processed: results.length,
    results,
    remaining,
  });
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-worker-secret");
  if (secret !== WORKER_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const remaining = await queueLength();
  return NextResponse.json({ queue_length: remaining });
}
