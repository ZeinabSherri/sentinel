import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const MODEL = "claude-sonnet-4-20250514";

export interface HallucinationResult {
  score: number;
  flagged_claims: string[];
  reasoning: string;
}

export interface PolicyCheckResult {
  violated: boolean;
  severity: "low" | "medium" | "high";
  evidence: string;
  reasoning: string;
}

export interface QualityResult {
  coherence: number;
  task_fitness: number;
  tone: number;
  overall: number;
  issues: string[];
}

export async function scoreHallucination(
  outputText: string,
  context: string
): Promise<HallucinationResult> {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system:
      "You are a factual accuracy evaluator. Given an AI-generated output and the source context the agent had access to, score how much of the output is grounded in the provided sources. Return ONLY JSON: { score: 0-100, flagged_claims: string[], reasoning: string }. 100 = fully grounded, 0 = entirely ungrounded.",
    messages: [
      {
        role: "user",
        content: `SOURCE CONTEXT:\n${context || "(no context provided)"}\n\nAI OUTPUT:\n${outputText}`,
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "{}";
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch?.[0] || "{}") as HallucinationResult;
  } catch {
    return { score: 50, flagged_claims: [], reasoning: "Parse error" };
  }
}

export async function checkPolicy(
  outputText: string,
  policyName: string,
  policyDescription: string,
  ruleConfig: Record<string, unknown>
): Promise<PolicyCheckResult> {
  const policyRule = JSON.stringify({ name: policyName, description: policyDescription, config: ruleConfig });

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system:
      "You are a compliance policy evaluator. Given an AI output and a policy rule, determine if the output violates the policy. Return ONLY JSON: { violated: boolean, severity: 'low'|'medium'|'high', evidence: string, reasoning: string }.",
    messages: [
      {
        role: "user",
        content: `POLICY RULE:\n${policyRule}\n\nAI OUTPUT:\n${outputText}`,
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "{}";
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch?.[0] || "{}") as PolicyCheckResult;
  } catch {
    return { violated: false, severity: "low", evidence: "", reasoning: "Parse error" };
  }
}

export async function rateQuality(outputText: string): Promise<QualityResult> {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system:
      "You are a quality evaluator for AI-generated text. Score the output on: coherence (does it make logical sense), task-fitness (does it address what was likely asked), and tone (is it appropriate and professional). Return ONLY JSON: { coherence: 0-100, task_fitness: 0-100, tone: 0-100, overall: 0-100, issues: string[] }.",
    messages: [
      {
        role: "user",
        content: `AI OUTPUT:\n${outputText}`,
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "{}";
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch?.[0] || "{}") as QualityResult;
  } catch {
    return { coherence: 50, task_fitness: 50, tone: 50, overall: 50, issues: [] };
  }
}

export function computeCompositeScore(
  hallucinationScore: number,
  policyScore: number,
  qualityScore: number
): number {
  // Higher scores = worse for hallucination (inverted: 100 grounded = 0 risk)
  const hallucinationRisk = 100 - hallucinationScore;
  const policyRisk = policyScore;
  const qualityRisk = 100 - qualityScore;

  return Math.round(hallucinationRisk * 0.4 + policyRisk * 0.4 + qualityRisk * 0.2);
}

export function scoreToStatus(score: number): "PASS" | "WARN" | "FAIL" {
  if (score < 30) return "PASS";
  if (score <= 70) return "WARN";
  return "FAIL";
}
