"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Eye, EyeOff, Save, RefreshCw, CheckCircle2, ExternalLink,
} from "lucide-react";
import { InsightBanner } from "@/components/admin/InsightBanner";
import { useAuthStore } from "@/store/auth";

const PROVIDERS = [
  { id: "anthropic", name: "Anthropic", shortName: "ANT", bg: "#F05230", models: ["claude-sonnet-4-6", "claude-opus-4-5", "claude-haiku-4-5"], defaultModel: "claude-sonnet-4-6", keyPrefix: "sk-ant-…", docs: "https://console.anthropic.com", desc: "Claude — nuanced reasoning, best for factory analysis" },
  { id: "openai", name: "OpenAI", shortName: "OAI", bg: "#10a37f", models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "o1-preview"], defaultModel: "gpt-4o", keyPrefix: "sk-…", docs: "https://platform.openai.com", desc: "GPT-4o — versatile, fast, broad reasoning" },
  { id: "gemini", name: "Gemini", shortName: "GEM", bg: "#4285f4", models: ["gemini-2.0-flash-exp", "gemini-1.5-pro", "gemini-1.5-flash"], defaultModel: "gemini-1.5-pro", keyPrefix: "AIza…", docs: "https://aistudio.google.com", desc: "Gemini — multimodal, strong on structured data" },
  { id: "xai", name: "xAI Grok", shortName: "GRK", bg: "#000000", models: ["grok-2", "grok-2-mini", "grok-beta"], defaultModel: "grok-2", keyPrefix: "xai-…", docs: "https://console.x.ai", desc: "Grok — real-time reasoning, wide world knowledge" },
] as const;

type ProviderId = typeof PROVIDERS[number]["id"];
type SaveStatus = "idle" | "saving" | "saved" | "error";

interface ProviderState {
  apiKey: string;
  model: string;
  showKey: boolean;
  status: SaveStatus;
  hasKey: boolean;
  isActive: boolean;
}

function buildDefault(defaultModel: string): ProviderState {
  return { apiKey: "", model: defaultModel, showKey: false, status: "idle", hasKey: false, isActive: false };
}

function ProviderCard({
  provider,
  state,
  onUpdate,
  onSave,
  onActivate,
}: {
  provider: typeof PROVIDERS[number];
  state: ProviderState;
  onUpdate: (patch: Partial<ProviderState>) => void;
  onSave: () => void;
  onActivate: () => void;
}) {
  const SaveIcon = state.status === "saving" ? RefreshCw : state.status === "saved" ? CheckCircle2 : Save;

  return (
    <div className="rounded-xl border border-[#E8E4DF] bg-white overflow-hidden flex flex-col">
      <div className="flex items-start gap-3 px-5 py-4 border-b border-[#E8E4DF]">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: provider.bg }}
        >
          <span className="font-mono text-xs font-black text-white">{provider.shortName}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-sans font-semibold text-sm text-[#001C2E]">{provider.name}</span>
            {state.isActive && (
              <span className="font-mono text-[10px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                ACTIVE
              </span>
            )}
          </div>
          <p className="text-xs text-[#6A8A9A] mt-0.5">{provider.desc}</p>
        </div>
      </div>

      <div className="p-5 space-y-4 flex-1">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="font-mono text-xs font-semibold text-[#001C2E]">API Key</label>
            <span className="font-mono text-[10px] text-[#6A8A9A]">{provider.keyPrefix}</span>
          </div>
          <div className="relative">
            <input
              type={state.showKey ? "text" : "password"}
              value={state.apiKey}
              onChange={(e) => onUpdate({ apiKey: e.target.value })}
              placeholder={state.hasKey ? "••••••••••••••• (stored)" : "Enter API key"}
              className="w-full pr-9 pl-3 py-2 rounded-lg border border-[#E8E4DF] bg-[#FAFAF8] font-mono text-xs text-[#001C2E] placeholder:text-[#6A8A9A] focus:outline-none focus:ring-2 focus:ring-[#F05230]/30 focus:border-[#F05230]"
            />
            <button
              type="button"
              onClick={() => onUpdate({ showKey: !state.showKey })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6A8A9A] hover:text-[#001C2E] transition-colors"
            >
              {state.showKey ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          </div>
          {state.hasKey && !state.apiKey && (
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-mono">
              <CheckCircle2 size={11} />
              <span>Key stored — leave blank to keep it</span>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="font-mono text-xs font-semibold text-[#001C2E]">Model</label>
          <select
            value={state.model}
            onChange={(e) => onUpdate({ model: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-[#E8E4DF] bg-[#FAFAF8] font-mono text-xs text-[#001C2E] focus:outline-none focus:ring-2 focus:ring-[#F05230]/30 focus:border-[#F05230]"
          >
            {provider.models.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between px-5 py-3 bg-[#F5F4F1] border-t border-[#E8E4DF]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onActivate}
            disabled={state.isActive}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E8E4DF] font-mono text-[10px] font-semibold text-[#001C2E] bg-white hover:bg-[#F5F4F1] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {state.isActive ? "Active" : "Set as Active"}
          </button>
          <a
            href={provider.docs}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[10px] font-mono text-[#6A8A9A] hover:text-[#F05230] transition-colors"
          >
            Docs <ExternalLink size={10} />
          </a>
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={state.status === "saving"}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F05230] text-white font-mono text-[10px] font-semibold hover:bg-[#d94420] disabled:opacity-60 transition-colors"
        >
          <SaveIcon
            size={12}
            className={state.status === "saving" ? "animate-spin" : ""}
          />
          {state.status === "saving" ? "Saving…" : state.status === "saved" ? "Saved" : "Save"}
        </button>
      </div>
    </div>
  );
}

export default function AISettingsPage() {
  const token = useAuthStore((s) => s.token);

  const [providerStates, setProviderStates] = useState<Record<ProviderId, ProviderState>>(
    () => Object.fromEntries(PROVIDERS.map((p) => [p.id, buildDefault(p.defaultModel)])) as Record<ProviderId, ProviderState>
  );

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/v1/settings/llm-providers", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) return;
        const data = await res.json() as {
          providers: Record<string, { has_key: boolean; model: string; is_active: boolean }>;
        };
        setProviderStates((prev) => {
          const next = { ...prev };
          for (const p of PROVIDERS) {
            const remote = data.providers[p.id];
            if (remote) {
              next[p.id] = {
                ...next[p.id],
                hasKey: remote.has_key,
                model: remote.model || p.defaultModel,
                isActive: remote.is_active,
              };
            }
          }
          return next;
        });
      } catch {
      }
    }
    load();
  }, [token]);

  const updateProvider = useCallback((id: ProviderId, patch: Partial<ProviderState>) => {
    setProviderStates((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }, []);

  const saveProvider = useCallback(async (id: ProviderId) => {
    const state = providerStates[id];
    updateProvider(id, { status: "saving" });
    try {
      const res = await fetch(`/api/v1/settings/llm-providers/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ api_key: state.apiKey, model_id: state.model }),
      });
      if (res.ok) {
        updateProvider(id, {
          status: "saved",
          hasKey: state.apiKey.trim().length > 0 ? true : state.hasKey,
        });
        setTimeout(() => updateProvider(id, { status: "idle" }), 2000);
      } else {
        updateProvider(id, { status: "error" });
        setTimeout(() => updateProvider(id, { status: "idle" }), 2000);
      }
    } catch {
      updateProvider(id, { status: "error" });
      setTimeout(() => updateProvider(id, { status: "idle" }), 2000);
    }
  }, [providerStates, token, updateProvider]);

  const activateProvider = useCallback(async (id: ProviderId) => {
    try {
      const res = await fetch(`/api/v1/settings/llm-providers/${id}/activate`, {
        method: "PUT",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        setProviderStates((prev) => {
          const next = { ...prev };
          for (const p of PROVIDERS) {
            next[p.id] = { ...next[p.id], isActive: p.id === id };
          }
          return next;
        });
      }
    } catch {
    }
  }, [token]);

  return (
    <div className="space-y-6">
      <InsightBanner
        variant="warning"
        title="API keys are stored server-side — never share them in URLs or logs"
        message="Keys are encrypted at rest. Only the active provider is used for AI investigations."
        dismissible
      />

      <div>
        <h1 className="font-sans font-bold text-xl text-[#001C2E]">AI Provider Settings</h1>
        <p className="text-sm text-[#6A8A9A] mt-1">Configure API keys and models for AI-powered factory investigations.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {PROVIDERS.map((p) => (
          <ProviderCard
            key={p.id}
            provider={p}
            state={providerStates[p.id]}
            onUpdate={(patch) => updateProvider(p.id, patch)}
            onSave={() => saveProvider(p.id)}
            onActivate={() => activateProvider(p.id)}
          />
        ))}
      </div>
    </div>
  );
}
