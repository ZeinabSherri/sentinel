import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { hashApiKey } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const keys = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      lastUsedAt: apiKeys.lastUsedAt,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.orgId, session.user.orgId))
    .orderBy(apiKeys.createdAt);

  return NextResponse.json(keys);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, key } = await req.json();
  if (!name || !key) {
    return NextResponse.json({ error: "name and key required" }, { status: 422 });
  }

  const keyHash = hashApiKey(key);

  const [created] = await db
    .insert(apiKeys)
    .values({ orgId: session.user.orgId, name, keyHash })
    .returning({ id: apiKeys.id, name: apiKeys.name, createdAt: apiKeys.createdAt });

  return NextResponse.json(created, { status: 201 });
}
