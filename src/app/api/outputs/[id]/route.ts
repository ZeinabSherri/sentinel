import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { outputs, evaluations, agents, reviews, users, policyViolations, policies } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const outputRows = await db
    .select({
      id: outputs.id,
      orgId: outputs.orgId,
      agentId: outputs.agentId,
      agentName: agents.name,
      agentType: agents.type,
      text: outputs.text,
      context: outputs.context,
      metadata: outputs.metadata,
      createdAt: outputs.createdAt,
      hallucinationScore: evaluations.hallucinationScore,
      policyScore: evaluations.policyScore,
      qualityScore: evaluations.qualityScore,
      compositeScore: evaluations.compositeScore,
      status: evaluations.status,
      flaggedClaims: evaluations.flaggedClaims,
      issues: evaluations.issues,
      reasoning: evaluations.reasoning,
      evaluationId: evaluations.id,
    })
    .from(outputs)
    .leftJoin(evaluations, eq(outputs.id, evaluations.outputId))
    .leftJoin(agents, eq(outputs.agentId, agents.id))
    .where(and(eq(outputs.id, id), eq(outputs.orgId, session.user.orgId)))
    .limit(1);

  if (!outputRows[0]) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const output = outputRows[0];

  // Fetch policy violations
  let violations: Array<{
    id: string;
    policyId: string;
    policyName: string;
    severity: string;
    evidence: string | null;
  }> = [];

  if (output.evaluationId) {
    violations = await db
      .select({
        id: policyViolations.id,
        policyId: policyViolations.policyId,
        policyName: policies.name,
        severity: policyViolations.severity,
        evidence: policyViolations.evidence,
      })
      .from(policyViolations)
      .innerJoin(policies, eq(policyViolations.policyId, policies.id))
      .where(eq(policyViolations.evaluationId, output.evaluationId));
  }

  // Fetch audit trail (reviews)
  const reviewRows = await db
    .select({
      id: reviews.id,
      action: reviews.action,
      notes: reviews.notes,
      createdAt: reviews.createdAt,
      reviewerName: users.name,
      reviewerEmail: users.email,
    })
    .from(reviews)
    .leftJoin(users, eq(reviews.reviewerId, users.id))
    .where(eq(reviews.outputId, id))
    .orderBy(desc(reviews.createdAt));

  return NextResponse.json({
    ...output,
    violations,
    auditTrail: reviewRows,
  });
}
