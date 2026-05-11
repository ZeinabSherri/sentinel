import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  real,
  boolean,
  jsonb,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const planEnum = pgEnum("plan", ["free", "pro", "enterprise"]);
export const roleEnum = pgEnum("role", ["owner", "admin", "member", "viewer"]);
export const ruleTypeEnum = pgEnum("rule_type", ["regex", "semantic", "llm"]);
export const severityEnum = pgEnum("severity", ["low", "medium", "high", "critical"]);
export const statusEnum = pgEnum("status", ["PASS", "WARN", "FAIL"]);
export const actionEnum = pgEnum("action", ["reviewed", "escalated", "training_set", "dismissed"]);
export const alertChannelEnum = pgEnum("alert_channel", ["slack", "webhook", "email"]);

export const orgs = pgTable("orgs", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  plan: planEnum("plan").notNull().default("free"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => orgs.id, { onDelete: "cascade" }),
  email: text("email").notNull().unique(),
  name: text("name"),
  role: roleEnum("role").notNull().default("member"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  orgIdx: index("users_org_idx").on(t.orgId),
}));

export const apiKeys = pgTable("api_keys", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => orgs.id, { onDelete: "cascade" }),
  keyHash: text("key_hash").notNull().unique(),
  name: text("name").notNull(),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  orgIdx: index("api_keys_org_idx").on(t.orgId),
}));

export const agents = pgTable("agents", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => orgs.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull().default("generic"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  orgIdx: index("agents_org_idx").on(t.orgId),
}));

export const outputs = pgTable("outputs", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => orgs.id, { onDelete: "cascade" }),
  agentId: uuid("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  context: text("context"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  orgIdx: index("outputs_org_idx").on(t.orgId),
  agentIdx: index("outputs_agent_idx").on(t.agentId),
  createdIdx: index("outputs_created_idx").on(t.createdAt),
}));

export const evaluations = pgTable("evaluations", {
  id: uuid("id").defaultRandom().primaryKey(),
  outputId: uuid("output_id").notNull().references(() => outputs.id, { onDelete: "cascade" }).unique(),
  hallucinationScore: integer("hallucination_score"),
  policyScore: integer("policy_score"),
  qualityScore: integer("quality_score"),
  compositeScore: integer("composite_score"),
  status: statusEnum("status"),
  flaggedClaims: jsonb("flagged_claims").$type<string[]>(),
  issues: jsonb("issues").$type<string[]>(),
  reasoning: text("reasoning"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  outputIdx: index("evaluations_output_idx").on(t.outputId),
  statusIdx: index("evaluations_status_idx").on(t.status),
}));

export const policies = pgTable("policies", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => orgs.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  ruleType: ruleTypeEnum("rule_type").notNull(),
  ruleConfig: jsonb("rule_config").notNull(),
  severity: severityEnum("severity").notNull().default("medium"),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  orgIdx: index("policies_org_idx").on(t.orgId),
}));

export const policyViolations = pgTable("policy_violations", {
  id: uuid("id").defaultRandom().primaryKey(),
  evaluationId: uuid("evaluation_id").notNull().references(() => evaluations.id, { onDelete: "cascade" }),
  policyId: uuid("policy_id").notNull().references(() => policies.id, { onDelete: "cascade" }),
  severity: severityEnum("severity").notNull(),
  evidence: text("evidence"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  evalIdx: index("violations_eval_idx").on(t.evaluationId),
  policyIdx: index("violations_policy_idx").on(t.policyId),
}));

export const reviews = pgTable("reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  outputId: uuid("output_id").notNull().references(() => outputs.id, { onDelete: "cascade" }),
  reviewerId: uuid("reviewer_id").notNull().references(() => users.id),
  action: actionEnum("action").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  outputIdx: index("reviews_output_idx").on(t.outputId),
}));

export const alerts = pgTable("alerts", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => orgs.id, { onDelete: "cascade" }),
  outputId: uuid("output_id").notNull().references(() => outputs.id, { onDelete: "cascade" }),
  channel: alertChannelEnum("channel").notNull(),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
  payload: jsonb("payload"),
}, (t) => ({
  orgIdx: index("alerts_org_idx").on(t.orgId),
}));

// Relations
export const orgsRelations = relations(orgs, ({ many }) => ({
  users: many(users),
  agents: many(agents),
  outputs: many(outputs),
  policies: many(policies),
  apiKeys: many(apiKeys),
  alerts: many(alerts),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  org: one(orgs, { fields: [users.orgId], references: [orgs.id] }),
  reviews: many(reviews),
}));

export const agentsRelations = relations(agents, ({ one, many }) => ({
  org: one(orgs, { fields: [agents.orgId], references: [orgs.id] }),
  outputs: many(outputs),
}));

export const outputsRelations = relations(outputs, ({ one, many }) => ({
  org: one(orgs, { fields: [outputs.orgId], references: [orgs.id] }),
  agent: one(agents, { fields: [outputs.agentId], references: [agents.id] }),
  evaluation: one(evaluations, { fields: [outputs.id], references: [evaluations.outputId] }),
  reviews: many(reviews),
  alerts: many(alerts),
}));

export const evaluationsRelations = relations(evaluations, ({ one, many }) => ({
  output: one(outputs, { fields: [evaluations.outputId], references: [outputs.id] }),
  violations: many(policyViolations),
}));

export const policiesRelations = relations(policies, ({ one, many }) => ({
  org: one(orgs, { fields: [policies.orgId], references: [orgs.id] }),
  violations: many(policyViolations),
}));

export const policyViolationsRelations = relations(policyViolations, ({ one }) => ({
  evaluation: one(evaluations, { fields: [policyViolations.evaluationId], references: [evaluations.id] }),
  policy: one(policies, { fields: [policyViolations.policyId], references: [policies.id] }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  output: one(outputs, { fields: [reviews.outputId], references: [outputs.id] }),
  reviewer: one(users, { fields: [reviews.reviewerId], references: [users.id] }),
}));
