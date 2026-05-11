import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { agents, outputs, evaluations, policies, policyViolations } from "@/lib/db/schema";
import { eq, and, gte, sql, desc, avg } from "drizzle-orm";
import { subDays } from "date-fns";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const agent = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, id), eq(agents.orgId, session.user.orgId)))
    .limit(1);

  if (!agent[0]) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const thirtyDaysAgo = subDays(new Date(), 30);

  // Daily score history
  const dailyScores = await db
    .select({
      day: sql<string>`date_trunc('day', ${outputs.createdAt})::text`.as("day"),
      avgHallucination: avg(evaluations.hallucinationScore),
      avgPolicy: avg(evaluations.policyScore),
      avgQuality: avg(evaluations.qualityScore),
      avgComposite: avg(evaluations.compositeScore),
      count: sql<number>`count(${outputs.id})`,
    })
    .from(outputs)
    .leftJoin(evaluations, eq(outputs.id, evaluations.outputId))
    .where(
      and(
        eq(outputs.agentId, id),
        eq(outputs.orgId, session.user.orgId),
        gte(outputs.createdAt, thirtyDaysAgo)
      )
    )
    .groupBy(sql`date_trunc('day', ${outputs.createdAt})`)
    .orderBy(sql`date_trunc('day', ${outputs.createdAt})`);

  // Top flagged outputs
  const flaggedOutputs = await db
    .select({
      id: outputs.id,
      text: outputs.text,
      compositeScore: evaluations.compositeScore,
      status: evaluations.status,
      createdAt: outputs.createdAt,
    })
    .from(outputs)
    .leftJoin(evaluations, eq(outputs.id, evaluations.outputId))
    .where(
      and(
        eq(outputs.agentId, id),
        eq(outputs.orgId, session.user.orgId)
      )
    )
    .orderBy(desc(evaluations.compositeScore))
    .limit(10);

  return NextResponse.json({
    agent: agent[0],
    dailyScores: dailyScores.map((d) => ({
      day: d.day,
      avgHallucination: d.avgHallucination ? Math.round(Number(d.avgHallucination)) : null,
      avgPolicy: d.avgPolicy ? Math.round(Number(d.avgPolicy)) : null,
      avgQuality: d.avgQuality ? Math.round(Number(d.avgQuality)) : null,
      avgComposite: d.avgComposite ? Math.round(Number(d.avgComposite)) : null,
      count: Number(d.count),
    })),
    flaggedOutputs,
  });
}
