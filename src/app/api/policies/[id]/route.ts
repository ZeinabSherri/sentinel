import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { policies } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const body = await req.json();

  const existing = await db
    .select({ id: policies.id })
    .from(policies)
    .where(and(eq(policies.id, id), eq(policies.orgId, session.user.orgId)))
    .limit(1);

  if (!existing[0]) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updates: Partial<typeof policies.$inferInsert> = {};
  if (typeof body.enabled === "boolean") updates.enabled = body.enabled;
  if (body.name) updates.name = body.name;
  if (body.description !== undefined) updates.description = body.description;
  if (body.severity) updates.severity = body.severity;

  const [updated] = await db
    .update(policies)
    .set(updates)
    .where(and(eq(policies.id, id), eq(policies.orgId, session.user.orgId)))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  await db
    .delete(policies)
    .where(and(eq(policies.id, id), eq(policies.orgId, session.user.orgId)));

  return NextResponse.json({ success: true });
}
