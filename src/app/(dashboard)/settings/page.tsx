"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { generateApiKey } from "@/lib/utils";
import { Copy, Plus, Key } from "lucide-react";

export default function SettingsPage() {
  const [apiKeys, setApiKeys] = useState<{ id: string; name: string; lastUsedAt: string | null; createdAt: string }[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function createKey() {
    if (!newKeyName.trim()) return;
    setCreating(true);
    const key = generateApiKey();

    const res = await fetch("/api/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newKeyName, key }),
    });

    if (res.ok) {
      setGeneratedKey(key);
      setNewKeyName("");
      loadKeys();
    }
    setCreating(false);
  }

  async function loadKeys() {
    const res = await fetch("/api/api-keys");
    if (res.ok) setApiKeys(await res.json());
  }

  useEffect(() => { loadKeys(); }, []);

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-lg font-semibold text-zinc-100">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {generatedKey && (
            <div className="p-3 bg-amber-900/20 border border-amber-700/30 rounded-md">
              <div className="text-xs text-amber-400 font-medium mb-2">
                New API key — copy it now, it won't be shown again
              </div>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono text-amber-300 flex-1 truncate">
                  {generatedKey}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigator.clipboard.writeText(generatedKey)}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}

          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-1.5">
              <Label>Key name</Label>
              <Input
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Production, Staging, etc."
              />
            </div>
            <Button size="sm" onClick={createKey} disabled={creating || !newKeyName.trim()}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Create Key
            </Button>
          </div>

          <div className="space-y-2">
            {apiKeys.length === 0 ? (
              <div className="text-xs text-zinc-600 py-4 text-center">No API keys yet</div>
            ) : (
              apiKeys.map((k) => (
                <div key={k.id} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-md border border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Key className="h-3.5 w-3.5 text-zinc-500" />
                    <span className="text-sm text-zinc-300">{k.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-600">
                    {k.lastUsedAt ? `Used ${new Date(k.lastUsedAt).toLocaleDateString()}` : "Never used"}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Integrating with your agents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="text-xs text-zinc-400 leading-relaxed">
              Send outputs from your AI agents to Sentinel using the ingest API:
            </div>
            <pre className="bg-zinc-950 border border-zinc-800 rounded-md p-4 text-xs font-mono text-zinc-300 overflow-x-auto">
{`curl -X POST https://your-sentinel.vercel.app/api/ingest \\
  -H "Authorization: Bearer sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "agent_id": "<your-agent-uuid>",
    "output_text": "The AI response to evaluate",
    "context": "Source documents the agent used",
    "metadata": {"session": "abc123"}
  }'`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
