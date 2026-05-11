import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { outputs, reviews, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const reviewSchema = z.object({
  action: z.enum(["reviewed", "escalated", "training_set", "dismissed"]),
  notes: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify output belongs to org
  const output = await db
    .select({ id: outputs.id })
    .from(outputs)
    .where(and(eq(outputs.id, id), eq(outputs.orgId, session.user.orgId)))
    .limit(1);

  if (!output[0]) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  // Get user id from email
  const userRows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, session.user.email))
    .limit(1);

  if (!userRows[0]) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const [review] = await db
    .insert(reviews)
    .values({
      outputId: id,
      reviewerId: userRows[0].id,
      action: parsed.data.action,
      notes: parsed.data.notes ?? null,
    })
    .returning();

  return NextResponse.json(review, { status: 201 });
}
