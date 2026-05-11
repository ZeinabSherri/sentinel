import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { outputs, evaluations, agents } from "@/lib/db/schema";
import { eq, and, gte, sql, avg, desc } from "drizzle-orm";
import { subDays, subHours } from "date-fns";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = session.user.orgId;
  const oneDayAgo = subDays(new Date(), 1);
  const oneHourAgo = subHours(new Date(), 1);
  const sevenDaysAgo = subDays(new Date(), 7);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    activeAgentsResult,
    outputsTodayResult,
    avgRiskResult,
    failCountResult,
    heatmapRows,
    liveFeedRows,
  ] = await Promise.all([
    // Active agents (had outputs in last 7 days)
    db
      .select({ count: sql<number>`count(distinct ${outputs.agentId})` })
      .from(outputs)
      .where(and(eq(outputs.orgId, orgId), gte(outputs.createdAt, sevenDaysAgo))),

    // Outputs today
    db
      .select({ count: sql<number>`count(*)` })
      .from(outputs)
      .where(and(eq(outputs.orgId, orgId), gte(outputs.createdAt, today))),

    // Avg risk score last 24h
    db
      .select({ avg: avg(evaluations.compositeScore) })
      .from(outputs)
      .leftJoin(evaluations, eq(outputs.id, evaluations.outputId))
      .where(and(eq(outputs.orgId, orgId), gte(outputs.createdAt, oneDayAgo))),

    // FAIL count last hour
    db
      .select({ count: sql<number>`count(*)` })
      .from(outputs)
      .leftJoin(evaluations, eq(outputs.id, evaluations.outputId))
      .where(
        and(
          eq(outputs.orgId, orgId),
          gte(outputs.createdAt, oneHourAgo),
          eq(evaluations.status, "FAIL")
        )
      ),

    // Heatmap: avg score per agent per day (last 7 days)
    db
      .select({
        agentId: outputs.agentId,
        agentName: agents.name,
        day: sql<string>`date_trunc('day', ${outputs.createdAt})::text`.as("day"),
        avgScore: avg(evaluations.compositeScore),
      })
      .from(outputs)
      .leftJoin(evaluations, eq(outputs.id, evaluations.outputId))
      .leftJoin(agents, eq(outputs.agentId, agents.id))
      .where(and(eq(outputs.orgId, orgId), gte(outputs.createdAt, sevenDaysAgo)))
      .groupBy(outputs.agentId, agents.name, sql`date_trunc('day', ${outputs.createdAt})`),

    // Live feed: last 50 outputs
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
      .where(eq(outputs.orgId, orgId))
      .orderBy(desc(outputs.createdAt))
      .limit(50),
  ]);

  return NextResponse.json({
    stats: {
      activeAgents: Number(activeAgentsResult[0]?.count ?? 0),
      outputsToday: Number(outputsTodayResult[0]?.count ?? 0),
      avgRiskScore: avgRiskResult[0]?.avg
        ? Math.round(Number(avgRiskResult[0].avg))
        : null,
      failCountLastHour: Number(failCountResult[0]?.count ?? 0),
    },
    heatmap: heatmapRows.map((r) => ({
      agentId: r.agentId,
      agentName: r.agentName,
      day: r.day,
      avgScore: r.avgScore ? Math.round(Number(r.avgScore)) : null,
    })),
    liveFeed: liveFeedRows,
  });
}
