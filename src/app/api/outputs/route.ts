import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { outputs, evaluations, agents } from "@/lib/db/schema";
import { eq, and, desc, lt, gte, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const agentId = searchParams.get("agent_id");
  const status = searchParams.get("status");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
  const offset = (page - 1) * limit;
  const dateFrom = searchParams.get("date_from");
  const dateTo = searchParams.get("date_to");

  const conditions = [eq(outputs.orgId, session.user.orgId)];
  if (agentId) conditions.push(eq(outputs.agentId, agentId));
  if (dateFrom) conditions.push(gte(outputs.createdAt, new Date(dateFrom)));
  if (dateTo) conditions.push(lt(outputs.createdAt, new Date(dateTo)));

  const baseQuery = db
    .select({
      id: outputs.id,
      agentId: outputs.agentId,
      agentName: agents.name,
      text: outputs.text,
      createdAt: outputs.createdAt,
      compositeScore: evaluations.compositeScore,
      status: evaluations.status,
    })
    .from(outputs)
    .leftJoin(evaluations, eq(outputs.id, evaluations.outputId))
    .leftJoin(agents, eq(outputs.agentId, agents.id))
    .where(and(...conditions))
    .orderBy(desc(outputs.createdAt))
    .limit(limit)
    .offset(offset);

  const rows = await baseQuery;

  // Filter by status after join if needed
  const filtered = status
    ? rows.filter((r) => r.status === status)
    : rows;

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(outputs)
    .where(and(...conditions));

  return NextResponse.json({
    data: filtered,
    pagination: {
      page,
      limit,
      total: Number(countResult[0]?.count ?? 0),
      pages: Math.ceil(Number(countResult[0]?.count ?? 0) / limit),
    },
  });
}
