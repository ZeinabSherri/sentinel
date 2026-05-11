import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { outputs, evaluations, agents } from "@/lib/db/schema";
import { eq, and, gte, lt, sql, avg, count } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const dateFrom = searchParams.get("date_from");
  const dateTo = searchParams.get("date_to");

  if (!dateFrom || !dateTo) {
    return NextResponse.json(
      { error: "date_from and date_to are required" },
      { status: 422 }
    );
  }

  const from = new Date(dateFrom);
  const to = new Date(dateTo);
  const orgId = session.user.orgId;

  const conditions = [
    eq(outputs.orgId, orgId),
    gte(outputs.createdAt, from),
    lt(outputs.createdAt, to),
  ];

  const [totalsResult, statusBreakdown, agentBreakdown, topFlagged] =
    await Promise.all([
      // Totals
      db
        .select({
          total: sql<number>`count(*)`,
          avgScore: avg(evaluations.compositeScore),
          passCount: sql<number>`count(*) filter (where ${evaluations.status} = 'PASS')`,
          warnCount: sql<number>`count(*) filter (where ${evaluations.status} = 'WARN')`,
          failCount: sql<number>`count(*) filter (where ${evaluations.status} = 'FAIL')`,
        })
        .from(outputs)
        .leftJoin(evaluations, eq(outputs.id, evaluations.outputId))
        .where(and(...conditions)),

      // Status breakdown by day
      db
        .select({
          day: sql<string>`date_trunc('day', ${outputs.createdAt})::text`,
          passCount: sql<number>`count(*) filter (where ${evaluations.status} = 'PASS')`,
          warnCount: sql<number>`count(*) filter (where ${evaluations.status} = 'WARN')`,
          failCount: sql<number>`count(*) filter (where ${evaluations.status} = 'FAIL')`,
        })
        .from(outputs)
        .leftJoin(evaluations, eq(outputs.id, evaluations.outputId))
        .where(and(...conditions))
        .groupBy(sql`date_trunc('day', ${outputs.createdAt})`)
        .orderBy(sql`date_trunc('day', ${outputs.createdAt})`),

      // Per-agent breakdown
      db
        .select({
          agentId: outputs.agentId,
          agentName: agents.name,
          total: sql<number>`count(*)`,
          avgScore: avg(evaluations.compositeScore),
          failCount: sql<number>`count(*) filter (where ${evaluations.status} = 'FAIL')`,
        })
        .from(outputs)
        .leftJoin(evaluations, eq(outputs.id, evaluations.outputId))
        .leftJoin(agents, eq(outputs.agentId, agents.id))
        .where(and(...conditions))
        .groupBy(outputs.agentId, agents.name),

      // Top flagged outputs
      db
        .select({
          id: outputs.id,
          agentName: agents.name,
          text: outputs.text,
          compositeScore: evaluations.compositeScore,
          status: evaluations.status,
          createdAt: outputs.createdAt,
        })
        .from(outputs)
        .leftJoin(evaluations, eq(outputs.id, evaluations.outputId))
        .leftJoin(agents, eq(outputs.agentId, agents.id))
        .where(and(...conditions, eq(evaluations.status, "FAIL")))
        .orderBy(evaluations.compositeScore)
        .limit(20),
    ]);

  const totals = totalsResult[0];

  return NextResponse.json({
    meta: {
      orgName: session.user.orgName,
      dateFrom,
      dateTo,
      generatedAt: new Date().toISOString(),
    },
    summary: {
      total: Number(totals?.total ?? 0),
      avgScore: totals?.avgScore ? Math.round(Number(totals.avgScore)) : null,
      passCount: Number(totals?.passCount ?? 0),
      warnCount: Number(totals?.warnCount ?? 0),
      failCount: Number(totals?.failCount ?? 0),
      passRate: totals?.total
        ? Math.round((Number(totals.passCount) / Number(totals.total)) * 100)
        : 0,
    },
    timeline: statusBreakdown,
    agents: agentBreakdown.map((a) => ({
      ...a,
      total: Number(a.total),
      avgScore: a.avgScore ? Math.round(Number(a.avgScore)) : null,
      failCount: Number(a.failCount),
    })),
    topFlagged,
  });
}
