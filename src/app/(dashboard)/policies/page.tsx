"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

interface Policy {
  id: string;
  name: string;
  description: string | null;
  ruleType: string;
  severity: string;
  enabled: boolean;
  createdAt: string;
}

const TEMPLATES = [
  {
    name: "GDPR PII Detection",
    description: "Detects personally identifiable information (PII) such as emails, phone numbers, and SSNs",
    rule_type: "llm",
    rule_config: { check: "Scan for PII: email addresses, phone numbers, SSN, credit cards, full names with addresses" },
    severity: "high",
  },
  {
    name: "Hallucination Threshold",
    description: "Flags outputs where the hallucination risk score exceeds the acceptable threshold",
    rule_type: "llm",
    rule_config: { check: "Identify factual claims that are not grounded in the source context or are demonstrably false" },
    severity: "medium",
  },
  {
    name: "Profanity Filter",
    description: "Detects profane or offensive language in AI outputs",
    rule_type: "regex",
    rule_config: { pattern: "\\b(fuck|shit|damn|bitch|asshole|bastard)\\b", flags: "i" },
    severity: "low",
  },
  {
    name: "Competitor Mention Detector",
    description: "Flags outputs that mention competitor products or services",
    rule_type: "llm",
    rule_config: { check: "Identify any mentions of competitor companies, products, or services that should not appear in customer-facing content" },
    severity: "medium",
  },
];

function severityVariant(s: string): "pass" | "warn" | "fail" | "default" {
  if (s === "low") return "pass";
  if (s === "medium") return "warn";
  if (s === "high" || s === "critical") return "fail";
  return "default";
}

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    rule_type: "llm",
    rule_config_raw: "{}",
    severity: "medium",
    enabled: true,
  });

  useEffect(() => {
    loadPolicies();
  }, []);

  async function loadPolicies() {
    const res = await fetch("/api/policies");
    if (res.ok) setPolicies(await res.json());
    setLoading(false);
  }

  async function togglePolicy(id: string, enabled: boolean) {
    await fetch(`/api/policies/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    setPolicies((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled } : p))
    );
  }

  async function deletePolicy(id: string) {
    if (!confirm("Delete this policy?")) return;
    await fetch(`/api/policies/${id}`, { method: "DELETE" });
    setPolicies((prev) => prev.filter((p) => p.id !== id));
  }

  async function savePolicy() {
    setSaving(true);
    let rule_config: Record<string, unknown>;
    try {
      rule_config = JSON.parse(form.rule_config_raw);
    } catch {
      rule_config = { raw: form.rule_config_raw };
    }

    const res = await fetch("/api/policies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        description: form.description,
        rule_type: form.rule_type,
        rule_config,
        severity: form.severity,
        enabled: form.enabled,
      }),
    });

    if (res.ok) {
      const policy = await res.json();
      setPolicies((prev) => [...prev, policy]);
      setOpen(false);
      setForm({ name: "", description: "", rule_type: "llm", rule_config_raw: "{}", severity: "medium", enabled: true });
    }
    setSaving(false);
  }

  function applyTemplate(tpl: typeof TEMPLATES[0]) {
    setForm({
      name: tpl.name,
      description: tpl.description,
      rule_type: tpl.rule_type,
      rule_config_raw: JSON.stringify(tpl.rule_config, null, 2),
      severity: tpl.severity,
      enabled: true,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-100">Policies</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1.5" />
              Add Policy
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>New Policy</DialogTitle>
            </DialogHeader>

            {/* Templates */}
            <div className="mb-4">
              <Label className="mb-2 block">Start from template</Label>
              <div className="grid grid-cols-2 gap-2">
                {TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.name}
                    onClick={() => applyTemplate(tpl)}
                    className="text-left p-2 rounded-md border border-zinc-700 hover:border-amber-500/50 hover:bg-zinc-800 transition-colors text-xs text-zinc-400"
                  >
                    {tpl.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="My policy"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="What does this policy check?"
                  className="h-16"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Rule Type</Label>
                  <Select
                    value={form.rule_type}
                    onValueChange={(v) => setForm((f) => ({ ...f, rule_type: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="llm">LLM-judged</SelectItem>
                      <SelectItem value="regex">Regex</SelectItem>
                      <SelectItem value="semantic">Semantic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Severity</Label>
                  <Select
                    value={form.severity}
                    onValueChange={(v) => setForm((f) => ({ ...f, severity: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Rule Config (JSON)</Label>
                <Textarea
                  value={form.rule_config_raw}
                  onChange={(e) => setForm((f) => ({ ...f, rule_config_raw: e.target.value }))}
                  className="font-mono text-xs h-24"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} size="sm">
                Cancel
              </Button>
              <Button onClick={savePolicy} disabled={saving || !form.name} size="sm">
                {saving ? "Saving…" : "Create Policy"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-zinc-600 text-sm">Loading…</div>
          ) : policies.length === 0 ? (
            <div className="py-12 text-center text-zinc-600 text-sm">
              No policies yet. Add your first policy above.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">Name</th>
                  <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3 w-24">Type</th>
                  <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3 w-20">Severity</th>
                  <th className="text-center text-xs text-zinc-500 font-medium px-4 py-3 w-20">Enabled</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {policies.map((policy) => (
                  <tr key={policy.id} className="border-b border-zinc-800/50">
                    <td className="px-4 py-3">
                      <div className="text-sm text-zinc-200">{policy.name}</div>
                      {policy.description && (
                        <div className="text-xs text-zinc-500 mt-0.5">{policy.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-zinc-400">{policy.ruleType}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={severityVariant(policy.severity)}>{policy.severity}</Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Switch
                        checked={policy.enabled}
                        onCheckedChange={(checked) => togglePolicy(policy.id, checked)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => deletePolicy(policy.id)}
                        className="text-zinc-600 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
