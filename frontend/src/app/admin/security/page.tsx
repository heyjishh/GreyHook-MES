"use client";

import { useState } from "react";
import { ShieldCheck, Save, RefreshCw, CheckCircle2, Lock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SecurityConfig {
  mfaRequired: boolean;
  mfaGraceDays: number;
  sessionTimeoutMin: number;
  maxSessionsPerUser: number;
  passwordMinLength: number;
  passwordRequireUpper: boolean;
  passwordRequireNumber: boolean;
  passwordRequireSymbol: boolean;
  passwordExpiryDays: number;
  ipAllowlistEnabled: boolean;
  ipAllowlist: string;
  loginAttempts: number;
  lockoutDurationMin: number;
  auditRetentionDays: number;
  ssoEnabled: boolean;
  ssoProvider: string;
}

const INIT: SecurityConfig = {
  mfaRequired: false,
  mfaGraceDays: 7,
  sessionTimeoutMin: 480,
  maxSessionsPerUser: 3,
  passwordMinLength: 12,
  passwordRequireUpper: true,
  passwordRequireNumber: true,
  passwordRequireSymbol: false,
  passwordExpiryDays: 90,
  ipAllowlistEnabled: false,
  ipAllowlist: "",
  loginAttempts: 5,
  lockoutDurationMin: 15,
  auditRetentionDays: 730,
  ssoEnabled: false,
  ssoProvider: "SAML 2.0",
};

function Toggle({ value, onChange }: { value: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={cn("relative w-10 h-5 rounded-full transition-colors shrink-0", value ? "bg-[#F05230]" : "bg-[#E8E4DF]")}
    >
      <span className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform", value ? "translate-x-5" : "translate-x-0.5")} />
    </button>
  );
}

export default function SecurityPage() {
  const [config, setConfig] = useState<SecurityConfig>(INIT);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = <K extends keyof SecurityConfig>(key: K, val: SecurityConfig[K]) =>
    setConfig((c) => ({ ...c, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 700));
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-[#001C2E] font-mono tracking-tight flex items-center gap-2">
          <ShieldCheck size={20} className="text-[#F05230]" />
          Security
        </h1>
        <p className="text-sm text-[#6A8A9A] mt-1">Authentication, session, password, and access control policies for your organization.</p>
      </div>

      {/* MFA */}
      <section className="space-y-4">
        <h2 className="text-xs font-mono font-bold text-[#001C2E] uppercase tracking-widest">Multi-Factor Authentication</h2>
        <div className="p-5 rounded-xl border border-[#E8E4DF] bg-white space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold text-sm text-[#001C2E] mb-0.5">Require MFA for all users</div>
              <div className="text-xs text-[#6A8A9A]">Enforce TOTP or hardware key for every login.</div>
            </div>
            <Toggle value={config.mfaRequired} onChange={() => set("mfaRequired", !config.mfaRequired)} />
          </div>
          {config.mfaRequired && (
            <div className="pt-3 border-t border-[#E8E4DF]">
              <label className="block text-xs font-semibold text-[#001C2E] mb-1.5">Grace period for existing users (days)</label>
              <input type="number" min={0} max={30} value={config.mfaGraceDays} onChange={(e) => set("mfaGraceDays", parseInt(e.target.value))}
                className="w-24 px-3 py-2 rounded-lg border border-[#E8E4DF] text-sm font-mono text-[#001C2E] focus:outline-none focus:ring-2 focus:ring-[#F05230]/20 focus:border-[#F05230]" />
            </div>
          )}
        </div>
      </section>

      {/* Sessions */}
      <section className="space-y-4">
        <h2 className="text-xs font-mono font-bold text-[#001C2E] uppercase tracking-widest">Session Management</h2>
        <div className="p-5 rounded-xl border border-[#E8E4DF] bg-white grid grid-cols-1 sm:grid-cols-2 gap-5">
          {[
            { label: "Session timeout (minutes)", key: "sessionTimeoutMin" as const, min: 15, max: 1440 },
            { label: "Max concurrent sessions per user", key: "maxSessionsPerUser" as const, min: 1, max: 10 },
          ].map(({ label, key, min, max }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-[#001C2E] mb-1.5">{label}</label>
              <input type="number" min={min} max={max} value={config[key] as number}
                onChange={(e) => set(key, parseInt(e.target.value))}
                className="w-32 px-3 py-2 rounded-lg border border-[#E8E4DF] text-sm font-mono text-[#001C2E] focus:outline-none focus:ring-2 focus:ring-[#F05230]/20 focus:border-[#F05230]" />
              <p className="text-2xs text-[#6A8A9A] mt-1">{key === "sessionTimeoutMin" ? `${Math.floor((config[key] as number) / 60)}h ${(config[key] as number) % 60}m` : `${config[key]} active sessions`}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Password */}
      <section className="space-y-4">
        <h2 className="text-xs font-mono font-bold text-[#001C2E] uppercase tracking-widest">Password Policy</h2>
        <div className="p-5 rounded-xl border border-[#E8E4DF] bg-white space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-[#001C2E] mb-1.5">Minimum length</label>
              <input type="number" min={8} max={32} value={config.passwordMinLength}
                onChange={(e) => set("passwordMinLength", parseInt(e.target.value))}
                className="w-24 px-3 py-2 rounded-lg border border-[#E8E4DF] text-sm font-mono text-[#001C2E] focus:outline-none focus:ring-2 focus:ring-[#F05230]/20 focus:border-[#F05230]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#001C2E] mb-1.5">Password expiry (days, 0 = never)</label>
              <input type="number" min={0} max={365} value={config.passwordExpiryDays}
                onChange={(e) => set("passwordExpiryDays", parseInt(e.target.value))}
                className="w-24 px-3 py-2 rounded-lg border border-[#E8E4DF] text-sm font-mono text-[#001C2E] focus:outline-none focus:ring-2 focus:ring-[#F05230]/20 focus:border-[#F05230]" />
            </div>
          </div>
          <div className="space-y-3 pt-2 border-t border-[#E8E4DF]">
            {([
              ["passwordRequireUpper", "Require uppercase letters (A–Z)"],
              ["passwordRequireNumber", "Require numbers (0–9)"],
              ["passwordRequireSymbol", "Require symbols (!@#$…)"],
            ] as [keyof SecurityConfig, string][]).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <span className="text-sm text-[#001C2E]">{label}</span>
                <Toggle value={config[key] as boolean} onChange={() => set(key, !config[key])} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Login protection */}
      <section className="space-y-4">
        <h2 className="text-xs font-mono font-bold text-[#001C2E] uppercase tracking-widest">Login Protection</h2>
        <div className="p-5 rounded-xl border border-[#E8E4DF] bg-white grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-[#001C2E] mb-1.5">Max failed login attempts</label>
            <input type="number" min={3} max={20} value={config.loginAttempts}
              onChange={(e) => set("loginAttempts", parseInt(e.target.value))}
              className="w-24 px-3 py-2 rounded-lg border border-[#E8E4DF] text-sm font-mono text-[#001C2E] focus:outline-none focus:ring-2 focus:ring-[#F05230]/20 focus:border-[#F05230]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#001C2E] mb-1.5">Lockout duration (minutes)</label>
            <input type="number" min={5} max={1440} value={config.lockoutDurationMin}
              onChange={(e) => set("lockoutDurationMin", parseInt(e.target.value))}
              className="w-24 px-3 py-2 rounded-lg border border-[#E8E4DF] text-sm font-mono text-[#001C2E] focus:outline-none focus:ring-2 focus:ring-[#F05230]/20 focus:border-[#F05230]" />
          </div>
        </div>
      </section>

      {/* SSO */}
      <section className="space-y-4">
        <h2 className="text-xs font-mono font-bold text-[#001C2E] uppercase tracking-widest">Single Sign-On</h2>
        <div className="p-5 rounded-xl border border-[#E8E4DF] bg-white space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold text-sm text-[#001C2E] mb-0.5">Enable SSO</div>
              <div className="text-xs text-[#6A8A9A]">Allow users to authenticate via your identity provider.</div>
            </div>
            <Toggle value={config.ssoEnabled} onChange={() => set("ssoEnabled", !config.ssoEnabled)} />
          </div>
          {config.ssoEnabled && (
            <div className="pt-3 border-t border-[#E8E4DF]">
              <label className="block text-xs font-semibold text-[#001C2E] mb-1.5">SSO Protocol</label>
              <select value={config.ssoProvider} onChange={(e) => set("ssoProvider", e.target.value)}
                className="w-48 px-3 py-2 rounded-lg border border-[#E8E4DF] text-sm text-[#001C2E] bg-white focus:outline-none focus:ring-2 focus:ring-[#F05230]/20 focus:border-[#F05230]">
                {["SAML 2.0", "OIDC / OAuth 2.0", "Azure AD", "Okta", "Google Workspace"].map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
          )}
        </div>
      </section>

      {/* IP Allowlist */}
      <section className="space-y-4">
        <h2 className="text-xs font-mono font-bold text-[#001C2E] uppercase tracking-widest">IP Allowlist</h2>
        <div className="p-5 rounded-xl border border-[#E8E4DF] bg-white space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold text-sm text-[#001C2E] mb-0.5">Enable IP Allowlist</div>
              <div className="text-xs text-[#6A8A9A]">Restrict login to specified IP ranges only.</div>
            </div>
            <Toggle value={config.ipAllowlistEnabled} onChange={() => set("ipAllowlistEnabled", !config.ipAllowlistEnabled)} />
          </div>
          {config.ipAllowlistEnabled && (
            <div className="pt-3 border-t border-[#E8E4DF]">
              <div className="flex items-start gap-2 mb-2">
                <AlertTriangle size={12} className="text-orange-500 mt-0.5 shrink-0" />
                <p className="text-xs text-orange-600">Make sure your current IP is in the list before saving. Locking yourself out requires a support ticket.</p>
              </div>
              <label className="block text-xs font-semibold text-[#001C2E] mb-1.5">Allowed IP ranges (one per line, CIDR supported)</label>
              <textarea
                rows={4}
                value={config.ipAllowlist}
                onChange={(e) => set("ipAllowlist", e.target.value)}
                placeholder={"192.168.1.0/24\n10.0.0.0/8\n203.0.113.5"}
                className="w-full max-w-sm px-3 py-2 rounded-lg border border-[#E8E4DF] text-sm font-mono text-[#001C2E] bg-white focus:outline-none focus:ring-2 focus:ring-[#F05230]/20 focus:border-[#F05230] resize-none"
              />
            </div>
          )}
        </div>
      </section>

      <button
        onClick={handleSave}
        disabled={saving}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F05230] text-white text-sm font-semibold hover:bg-[#d94720] disabled:opacity-50 transition-colors"
      >
        {saving ? <RefreshCw size={14} className="animate-spin" /> :
         saved  ? <CheckCircle2 size={14} /> : <Lock size={14} />}
        {saved ? "Saved!" : "Save Security Policy"}
      </button>
    </div>
  );
}
