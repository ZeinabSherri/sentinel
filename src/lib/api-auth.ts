import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiKeys, orgs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { hashApiKey } from "@/lib/utils";

export interface ApiAuthResult {
  orgId: string;
  orgName: string;
  keyId: string;
}

export async function authenticateApiKey(
  req: NextRequest
): Promise<ApiAuthResult | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const key = authHeader.slice(7);
  const keyHash = hashApiKey(key);

  const result = await db
    .select({
      keyId: apiKeys.id,
      orgId: apiKeys.orgId,
      orgName: orgs.name,
    })
    .from(apiKeys)
    .innerJoin(orgs, eq(apiKeys.orgId, orgs.id))
    .where(eq(apiKeys.keyHash, keyHash))
    .limit(1);

  if (!result[0]) return null;

  // Update last used
  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, result[0].keyId));

  return result[0];
}
