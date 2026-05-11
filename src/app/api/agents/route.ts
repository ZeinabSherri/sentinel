import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { agents, outputs, evaluations } from "@/lib/db/schema";
import { eq, and, gte, sql, desc, avg } from "drizzle-orm";
import { subDays } from "date-fns";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sevenDaysAgo = subDays(new Date(), 7);

  const agentRows = await db
    .select({
      id: agents.id,
      name: agents.name,
      type: agents.type,
      createdAt: agents.createdAt,
    })
    .from(agents)
    .where(eq(agents.orgId, session.user.orgId))
    .orderBy(desc(agents.createdAt));

  // Get stats per agent
  const statsRows = await db
    .select({
      agentId: outputs.agentId,
      outputCount: sql<number>`count(${outputs.id})`.as("output_count"),
      avgScore: avg(evaluations.compositeScore).as("avg_score"),
    })
    .from(outputs)
    .leftJoin(evaluations, eq(outputs.id, evaluations.outputId))
    .where(
      and(
        eq(outputs.orgId, session.user.orgId),
        gte(outputs.createdAt, sevenDaysAgo)
      )
    )
    .groupBy(outputs.agentId);

  const statsMap = new Map(statsRows.map((r) => [r.agentId, r]));

  // Get daily scores per agent for sparklines (last 7 days)
  const dailyRows = await db
    .select({
      agentId: outputs.agentId,
      day: sql<string>`date_trunc('day', ${outputs.createdAt})::text`.as("day"),
      avgScore: avg(evaluations.compositeScore).as("avg_score"),
    })
    .from(outputs)
    .leftJoin(evaluations, eq(outputs.id, evaluations.outputId))
    .where(
      and(
        eq(outputs.orgId, session.user.orgId),
        gte(outputs.createdAt, sevenDaysAgo)
      )
    )
    .groupBy(outputs.agentId, sql`date_trunc('day', ${outputs.createdAt})`);

  const sparkMap = new Map<string, { day: string; avgScore: number }[]>();
  for (const row of dailyRows) {
    if (!sparkMap.has(row.agentId)) sparkMap.set(row.agentId, []);
    sparkMap.get(row.agentId)!.push({
      day: row.day,
      avgScore: Number(row.avgScore ?? 0),
    });
  }

  const result = agentRows.map((agent) => {
    const stats = statsMap.get(agent.id);
    return {
      ...agent,
      outputCount7d: Number(stats?.outputCount ?? 0),
      avgScore7d: stats?.avgScore ? Math.round(Number(stats.avgScore)) : null,
      sparkline: (sparkMap.get(agent.id) ?? []).sort((a, b) =>
        a.day.localeCompare(b.day)
      ),
    };
  });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, type } = body as { name: string; type?: string };
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 422 });
  }

  const [agent] = await db
    .insert(agents)
    .values({ orgId: session.user.orgId, name, type: type ?? "generic" })
    .returning();

  return NextResponse.json(agent, { status: 201 });
}
