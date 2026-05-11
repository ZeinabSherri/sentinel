import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { agents, outputs } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { authenticateApiKey } from "@/lib/api-auth";
import { enqueue } from "@/lib/redis";
import { nanoid } from "nanoid";

const ingestSchema = z.object({
  agent_id: z.string().uuid(),
  output_text: z.string().min(1).max(100000),
  context: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  const auth = await authenticateApiKey(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ingestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { agent_id, output_text, context, metadata } = parsed.data;

  // Verify agent belongs to org
  const agent = await db
    .select({ id: agents.id })
    .from(agents)
    .where(and(eq(agents.id, agent_id), eq(agents.orgId, auth.orgId)))
    .limit(1);

  if (!agent[0]) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  // Create output record
  const [output] = await db
    .insert(outputs)
    .values({
      orgId: auth.orgId,
      agentId: agent_id,
      text: output_text,
      context: context ?? null,
      metadata: metadata ?? null,
    })
    .returning({ id: outputs.id });

  const eventId = nanoid();

  // Enqueue for background evaluation
  await enqueue(eventId, {
    outputId: output.id,
    orgId: auth.orgId,
    outputText: output_text,
    context: context ?? "",
  });

  return NextResponse.json(
    { event_id: eventId, output_id: output.id, status: "queued" },
    { status: 202 }
  );
}
