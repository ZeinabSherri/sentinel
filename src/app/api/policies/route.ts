import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { policies } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const createPolicySchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  rule_type: z.enum(["regex", "semantic", "llm"]),
  rule_config: z.record(z.unknown()),
  severity: z.enum(["low", "medium", "high", "critical"]).optional().default("medium"),
  enabled: z.boolean().optional().default(true),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(policies)
    .where(eq(policies.orgId, session.user.orgId))
    .orderBy(policies.createdAt);

  return NextResponse.json(rows);
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

  const parsed = createPolicySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const [policy] = await db
    .insert(policies)
    .values({
      orgId: session.user.orgId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      ruleType: parsed.data.rule_type,
      ruleConfig: parsed.data.rule_config,
      severity: parsed.data.severity,
      enabled: parsed.data.enabled,
    })
    .returning();

  return NextResponse.json(policy, { status: 201 });
}
