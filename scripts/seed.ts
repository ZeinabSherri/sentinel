import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../src/lib/db/schema";
import { eq } from "drizzle-orm";
import * as dotenv from "dotenv";
import { createHash, randomBytes } from "crypto";

dotenv.config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function weightedScore(): number {
  const r = Math.random();
  if (r < 0.80) return rand(0, 29);
  if (r < 0.95) return rand(30, 70);
  return rand(71, 100);
}

const AGENT_DATA = [
  {
    name: "Customer Support Bot",
    type: "support",
    samples: [
      "I understand your frustration with the delayed shipment. Your order #84729 is currently in transit and should arrive within 2-3 business days. I've applied a 10% discount to your next order as a courtesy.",
      "Thank you for contacting support. I've reviewed your account and can confirm the charge of $49.99 was processed on March 15th for your annual subscription renewal.",
      "I'm unable to locate an order with that email address. Could you please provide the order confirmation number or the email address used during checkout?",
      "Your refund request has been approved. The amount of $127.50 will be credited back to your original payment method within 5-7 business days.",
      "I've escalated your case to our technical team. They will contact you via email within 24 hours with a resolution.",
    ],
  },
  {
    name: "Contract Summarizer",
    type: "document",
    samples: [
      "This Software License Agreement grants a non-exclusive, non-transferable license to use the software. Key terms: 1-year term, $10,000 annual fee, automatic renewal clause, 30-day termination notice required.",
      "The Non-Disclosure Agreement establishes mutual confidentiality obligations for a period of 3 years. Both parties agree not to disclose proprietary information to third parties without written consent.",
      "Employment contract summary: Full-time position, $85,000 base salary, 15 days PTO, health benefits included, 6-month probation period, non-compete clause for 1 year post-employment.",
      "Vendor agreement: Net-30 payment terms, $50,000 credit limit, 2% discount for early payment within 10 days, arbitration clause for disputes, governed by California law.",
      "Service Level Agreement: 99.9% uptime guarantee, 4-hour response time for critical issues, monthly reporting, $500 credit per hour of downtime exceeding SLA.",
    ],
  },
  {
    name: "Sales Email Writer",
    type: "content",
    samples: [
      "Subject: Boost Your Team's Productivity by 40%\n\nHi Sarah,\n\nI noticed your company recently expanded to 3 new markets. Congratulations!\n\nOur platform has helped similar companies reduce their onboarding time by 40% while cutting costs. Would you be open to a 20-minute call next week?\n\nBest, Alex",
      "Subject: Following up on our conversation\n\nHi Marcus,\n\nThank you for taking the time to speak with me yesterday. As promised, I'm sharing our case study showing how TechCorp increased revenue by $2.3M using our solution.\n\nLet me know if you have any questions!",
      "Our competitor's product is much worse than ours. They have terrible customer service and their software crashes constantly. You'd be stupid not to switch to us immediately.",
      "Dear valued prospect,\n\nI hope this email finds you well. I wanted to personally reach out and introduce our enterprise solution that has been recognized by Gartner as a Leader in the 2024 Magic Quadrant.",
      "Hi Jennifer,\n\nQuick question — are you the right person to speak with about your company's data analytics needs? If so, I'd love to share how we've helped companies like yours save 15 hours per week on reporting.",
    ],
  },
  {
    name: "Code Reviewer",
    type: "technical",
    samples: [
      "Code Review Summary:\n- SQL injection vulnerability on line 47: user input is not sanitized before being passed to the database query\n- Missing error handling in the async function at line 112\n- The loop on line 89 has O(n²) complexity and could be optimized\n- Recommendation: add unit tests for the payment processing logic",
      "LGTM. The implementation correctly handles edge cases and follows our team's coding standards. Minor suggestions: rename 'temp' variable to something descriptive, add JSDoc comments for the public API methods.",
      "Critical issue found: the authentication token is being stored in localStorage which is vulnerable to XSS attacks. Recommend switching to httpOnly cookies. Also, the password hashing uses MD5 which is cryptographically broken — please use bcrypt.",
      "The PR looks good overall. I noticed the test coverage dropped from 87% to 82%. Please add tests for the new edge cases in the validation logic. The refactoring improves readability significantly.",
      "This implementation has a race condition in the concurrent request handler. When multiple requests arrive simultaneously, the shared state can be corrupted. Consider using a mutex or atomic operations.",
    ],
  },
  {
    name: "Data Analyst",
    type: "analytics",
    samples: [
      "Q3 Revenue Analysis: Total revenue reached $4.2M, a 23% increase YoY. Top-performing segment: Enterprise (62% of revenue). Customer acquisition cost decreased 12% to $847. Churn rate: 2.3%, within target range.",
      "The A/B test results show statistical significance (p<0.01). Variant B increased conversion rate from 3.2% to 4.7%, representing a 47% relative improvement. Recommended rollout: 100% of users.",
      "Data quality issues detected in the marketing dataset: 12% of email addresses are malformed, 847 duplicate records found, 3 columns have >50% null values. Recommend data cleansing before analysis.",
      "Customer segmentation complete: Segment A (High value, low churn): 1,247 customers, avg LTV $4,200. Segment B (Medium value, high growth): 3,891 customers, avg LTV $1,800. Segment C (At-risk): 892 customers requiring intervention.",
      "The correlation analysis reveals a strong positive relationship (r=0.87) between customer onboarding completion rate and 90-day retention. Customers who complete all 5 onboarding steps have 3.2x higher LTV.",
    ],
  },
];

const CONTEXTS = [
  "Documentation v2.3 - Shipping Policy: Standard delivery 5-7 business days. Express 2-3 business days. International: 10-14 business days.",
  "Financial records Q1-Q3 2024. Revenue streams: SaaS subscriptions (primary), professional services, training.",
  "Product database: Enterprise plan $299/mo, Pro plan $99/mo, Starter $29/mo. All plans include 14-day free trial.",
  "Technical specification: REST API v2, JSON responses, OAuth 2.0 authentication, rate limit 1000 req/hour.",
  "",
];

async function seed() {
  console.log("🌱 Starting seed...");

  // Create org
  const [org] = await db
    .insert(schema.orgs)
    .values({ name: "Acme Corp", plan: "pro" })
    .returning();

  console.log(`✓ Created org: ${org.name} (${org.id})`);

  // Create user
  const [user] = await db
    .insert(schema.users)
    .values({
      orgId: org.id,
      email: "admin@acme.com",
      name: "Admin User",
      role: "owner",
    })
    .returning();

  console.log(`✓ Created user: ${user.email}`);

  // Create API key
  const rawKey = `sk_live_${randomBytes(32).toString("hex")}`;
  await db.insert(schema.apiKeys).values({
    orgId: org.id,
    keyHash: hashKey(rawKey),
    name: "Default Key",
  });

  console.log(`✓ Created API key: ${rawKey}`);

  // Create agents
  const agentRecords = [];
  for (const agentData of AGENT_DATA) {
    const [agent] = await db
      .insert(schema.agents)
      .values({ orgId: org.id, name: agentData.name, type: agentData.type })
      .returning();
    agentRecords.push({ ...agent, samples: agentData.samples });
    console.log(`✓ Created agent: ${agent.name}`);
  }

  // Create policies
  const [policy1, policy2, policy3] = await db
    .insert(schema.policies)
    .values([
      {
        orgId: org.id,
        name: "GDPR PII Detection",
        description: "Detects personally identifiable information in outputs",
        ruleType: "llm",
        ruleConfig: { check: "Scan for PII: email addresses, phone numbers, SSN, credit cards" },
        severity: "high",
        enabled: true,
      },
      {
        orgId: org.id,
        name: "Profanity Filter",
        description: "Detects offensive or inappropriate language",
        ruleType: "regex",
        ruleConfig: { pattern: "\\b(fuck|shit|damn|bitch)\\b", flags: "i" },
        severity: "medium",
        enabled: true,
      },
      {
        orgId: org.id,
        name: "Competitor Mention Detector",
        description: "Flags mentions of competitor products or services",
        ruleType: "llm",
        ruleConfig: { check: "Detect mentions of competitor companies that should not appear in customer-facing content" },
        severity: "low",
        enabled: true,
      },
    ])
    .returning();

  console.log("✓ Created 3 policies");

  // Create 500 outputs over 14 days
  let outputCount = 0;
  const totalOutputs = 500;
  const daysRange = 14;

  for (let i = 0; i < totalOutputs; i++) {
    const agent = agentRecords[i % agentRecords.length];
    const dayOffset = rand(0, daysRange - 1);
    const hoursOffset = rand(0, 23);
    const minutesOffset = rand(0, 59);

    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - dayOffset);
    createdAt.setHours(hoursOffset, minutesOffset, 0, 0);

    const text = agent.samples[i % agent.samples.length];
    const context = CONTEXTS[i % CONTEXTS.length];

    const [output] = await db
      .insert(schema.outputs)
      .values({
        orgId: org.id,
        agentId: agent.id,
        text,
        context: context || null,
        metadata: { source: "seed", iteration: i },
        createdAt,
      })
      .returning();

    // Generate realistic scores
    const compositeScore = weightedScore();
    const hallucinationScore = rand(Math.max(0, 70 - compositeScore), 100);
    const policyScore = compositeScore > 60 ? rand(40, 90) : rand(0, 30);
    const qualityScore = rand(Math.max(0, 80 - compositeScore / 2), 100);

    const status =
      compositeScore < 30 ? "PASS" : compositeScore <= 70 ? "WARN" : "FAIL";

    const flaggedClaims =
      compositeScore > 60
        ? text.split(".").slice(0, 2).map((s) => s.trim()).filter(Boolean)
        : [];

    const issues: string[] =
      compositeScore > 50
        ? ["Output contains unverified claims", "Tone may be inappropriate"].slice(
            0,
            rand(0, 2)
          )
        : [];

    const [evaluation] = await db
      .insert(schema.evaluations)
      .values({
        outputId: output.id,
        hallucinationScore,
        policyScore,
        qualityScore,
        compositeScore,
        status: status as "PASS" | "WARN" | "FAIL",
        flaggedClaims,
        issues,
        reasoning: `Evaluated based on source context grounding and policy compliance.`,
        createdAt,
      })
      .returning();

    // Add some policy violations for FAIL outputs
    if (status === "FAIL" && Math.random() > 0.5) {
      await db.insert(schema.policyViolations).values({
        evaluationId: evaluation.id,
        policyId: [policy1, policy2, policy3][rand(0, 2)].id,
        severity: rand(0, 2) > 1 ? "high" : "medium",
        evidence: text.slice(0, 100),
      });
    }

    outputCount++;
    if (outputCount % 100 === 0) {
      console.log(`  ${outputCount}/${totalOutputs} outputs seeded…`);
    }
  }

  console.log(`✓ Created ${outputCount} outputs with evaluations`);
  console.log("\n🎉 Seed complete!");
  console.log(`\n  Login email: admin@acme.com`);
  console.log(`  API key:     ${rawKey}`);

  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
