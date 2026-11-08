"use client";

import { useState } from "react";
import { KeyRound, Plus, Copy, Trash2, Eye, EyeOff, RefreshCw, CheckCircle2, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  createdAt: string;
  lastUsed: string | null;
  active: boolean;
}

const INIT_KEYS: ApiKey[] = [
  { id: "k1", name: "ERP Integration",   prefix: "ghk_live_a1b2",  scopes: ["read:oee","read:production","write:confirmations"], createdAt: "2026-10-01", lastUsed: "2026-11-07", active: true  },
  { id: "k2", name: "Dashboard Embed",   prefix: "ghk_live_c3d4",  scopes: ["read:oee","read:downtime"],                         createdAt: "2026-10-15", lastUsed: "2026-11-05", active: true  },
  { id: "k3", name: "CI/CD Automation",  prefix: "ghk_live_e5f6",  scopes: ["read:*"],                                            createdAt: "2026-09-20", lastUsed: null,         active: false },
];

const ALL_SCOPES = [
  "read:oee", "read:production", "read:downtime", "read:quality",
  "write:confirmations", "write:goodsmovement", "write:bom",
  "read:*", "write:*",
];

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>(INIT_KEYS);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newScopes, setNewScopes] = useState<string[]>(["read:oee"]);
  const [creating, setCreating] = useState(false);
  const [justCreated, setJustCreated] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!newName) return;
    setCreating(true);
    await new Promise((r) => setTimeout(r, 700));
    const fakeKey = `ghk_live_${Math.random().toString(36).slice(2, 10)}`;
    const newKey: ApiKey = {
      id: `k${Date.now()}`,
      name: newName,
      prefix: fakeKey.slice(0, 16),
      scopes: newScopes,
      createdAt: new Date().toISOString().slice(0, 10),
      lastUsed: null,
      active: true,
    };
    setKeys((k) => [newKey, ...k]);
    setJustCreated(`${fakeKey}${"x".repeat(32)}`);
    setCreating(false);
    setShowNew(false);
    setNewName("");
    setNewScopes(["read:oee"]);
  };

  const handleRevoke = (id: string) => {
    if (!confirm("Revoke this key? Apps using it will stop working immediately.")) return;
    setKeys((k) => k.map((key) => key.id === id ? { ...key, active: false } : key));
  };

  const copy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const toggleScope = (s: string) =>
    setNewScopes((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-[#001C2E] font-mono tracking-tight flex items-center gap-2">
            <KeyRound size={20} className="text-[#F05230]" />
            API Keys
          </h1>
          <p className="text-sm text-[#6A8A9A] mt-1">Generate scoped API keys for external system integrations.</p>
        </div>
        <button
          onClick={() => setShowNew(!showNew)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#F05230] text-white text-xs font-semibold hover:bg-[#d94720]"
        >
          <Plus size={13} /> New API Key
        </button>
      </div>

      {/* New key form */}
      {showNew && (
        <div className="p-5 rounded-xl border border-[#F05230]/30 bg-[#FEF0EB]/20 space-y-4">
          <h2 className="text-sm font-semibold text-[#001C2E]">Create New API Key</h2>
          <div>
            <label className="block text-xs font-medium text-[#001C2E] mb-1.5">Key Name</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. ERP Integration"
              className="w-full max-w-sm px-3 py-2 rounded-lg border border-[#E8E4DF] text-sm text-[#001C2E] bg-white focus:outline-none focus:ring-2 focus:ring-[#F05230]/20 focus:border-[#F05230]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#001C2E] mb-2">Scopes</label>
            <div className="flex flex-wrap gap-2">
              {ALL_SCOPES.map((s) => (
                <button
                  key={s}
                  onClick={() => toggleScope(s)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg border text-xs font-mono transition-all",
                    newScopes.includes(s)
                      ? "border-[#F05230] bg-[#FEF0EB]/40 text-[#F05230]"
                      : "border-[#E8E4DF] text-[#6A8A9A] hover:border-[#F05230]/40"
                  )}
                >{s}</button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowNew(false)} className="px-3 py-1.5 rounded-lg border border-[#E8E4DF] text-xs text-[#6A8A9A]">Cancel</button>
            <button
              onClick={handleCreate}
              disabled={!newName || creating || newScopes.length === 0}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-[#F05230] text-white text-xs font-semibold disabled:opacity-50"
            >
              {creating ? <RefreshCw size={12} className="animate-spin" /> : <KeyRound size={12} />}
              Generate Key
            </button>
          </div>
        </div>
      )}

      {/* Just created banner */}
      {justCreated && (
        <div className="p-4 rounded-xl border border-[#1A7A40]/30 bg-[#E8F5EC]">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={16} className="text-[#1A7A40] shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#1A7A40] mb-1">API key generated — copy it now, it won't be shown again.</p>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono bg-white px-3 py-1.5 rounded-lg border border-[#1A7A40]/20 text-[#001C2E] flex-1 truncate">
                  {revealed === "new" ? justCreated : `${justCreated.slice(0, 20)}${"•".repeat(28)}`}
                </code>
                <button onClick={() => setRevealed(revealed === "new" ? null : "new")} className="p-1.5 rounded text-[#6A8A9A] hover:text-[#001C2E]">
                  {revealed === "new" ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button onClick={() => copy(justCreated, "new")} className="p-1.5 rounded text-[#6A8A9A] hover:text-[#001C2E]">
                  {copied === "new" ? <CheckCircle2 size={14} className="text-[#1A7A40]" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
            <button onClick={() => setJustCreated(null)} className="text-xs text-[#1A7A40] hover:underline shrink-0">Dismiss</button>
          </div>
        </div>
      )}

      {/* Keys table */}
      <div className="rounded-xl border border-[#E8E4DF] bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#FAFAF8] border-b border-[#E8E4DF]">
            <tr>
              {["Name", "Prefix", "Scopes", "Created", "Last Used", "Status", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#6A8A9A] font-mono uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E8E4DF]">
            {keys.map((k) => (
              <tr key={k.id} className={cn("hover:bg-[#FAFAF8] transition-colors", !k.active && "opacity-50")}>
                <td className="px-4 py-3 font-medium text-[#001C2E]">{k.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-[#6A8A9A]">{k.prefix}…</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {k.scopes.map((s) => (
                      <span key={s} className="px-1.5 py-0.5 rounded bg-[#E8E4DF] text-2xs font-mono text-[#6A8A9A]">{s}</span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-[#6A8A9A]">{k.createdAt}</td>
                <td className="px-4 py-3 text-xs text-[#6A8A9A]">{k.lastUsed ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium",
                    k.active ? "bg-[#E8F5EC] text-[#1A7A40]" : "bg-[#E8E4DF] text-[#6A8A9A]"
                  )}>
                    {k.active ? "Active" : "Revoked"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {k.active && (
                    <button onClick={() => handleRevoke(k.id)} className="p-1.5 rounded text-[#6A8A9A] hover:text-red-500 hover:bg-red-50">
                      <Trash2 size={13} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-start gap-3 p-4 rounded-xl border border-[#E8E4DF] bg-[#FAFAF8]">
        <Shield size={15} className="text-[#6A8A9A] shrink-0 mt-0.5" />
        <p className="text-xs text-[#6A8A9A] leading-relaxed">
          API keys are single-tenant and scoped to your organisation. Never share them in client-side code or commit them to version control. Rotate keys every 90 days. Each key can be revoked instantly from this page.
        </p>
      </div>
    </div>
  );
}
