"use client";

import { useEffect, useState } from "react";
import { UserCircle2, Plus, MoreHorizontal, Shield, Wrench, Eye, X, ChevronDown } from "lucide-react";
import { usersApi } from "@/lib/api";
import type { UserSchema, UserRole } from "@/types/api";

const IS_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

const T = {
  brand:     "#F05230",
  brandDim:  "#FEF0EB",
  success:   "#1A7A40",
  successDim:"#E8F5EC",
  warning:   "#A85E00",
  warningDim:"#FEF0D6",
  neutral:   "#6A8A9A",
  neutralDim:"#F0ECE8",
  border:    "#E8E4DF",
  text:      "#001C2E",
  muted:     "#6A8A9A",
  disabled:  "#B0C4CE",
  bg:        "#FFFFFF",
  bgSubtle:  "#FAFAF8",
};

type Role = "admin" | "manager" | "supervisor" | "operator";

const ROLE_CFG: Record<string, { label: string; color: string; bg: string; icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }> }> = {
  admin:      { label: "Admin",      color: T.brand,   bg: T.brandDim,   icon: Shield },
  manager:    { label: "Manager",    color: T.warning, bg: T.warningDim, icon: Wrench },
  supervisor: { label: "Supervisor", color: T.warning, bg: T.warningDim, icon: Wrench },
  operator:   { label: "Operator",   color: T.neutral, bg: T.neutralDim, icon: Eye },
  viewer:     { label: "Viewer",     color: T.neutral, bg: T.neutralDim, icon: Eye },
};

const MOCK_USERS: UserSchema[] = [
  { id:"1", organization_id:"org1", email:"admin@sunrise.com",          name:"Rahul Sharma",    role:"admin",    is_active:true, created_at:"2026-01-01T00:00:00Z" },
  { id:"2", organization_id:"org1", email:"supervisor@sunrise.com",     name:"Ravi Singh",      role:"supervisor",is_active:true, created_at:"2026-01-01T00:00:00Z" },
  { id:"3", organization_id:"org1", email:"operator@sunrise.com",       name:"Meena Patel",     role:"operator", is_active:true, created_at:"2026-01-01T00:00:00Z" },
  { id:"4", organization_id:"org1", email:"manager@sunrise.com",        name:"Deepak Kumar",    role:"manager",  is_active:true, created_at:"2026-01-01T00:00:00Z" },
];

function formatDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return "—"; }
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserSchema[]>(IS_MOCK ? MOCK_USERS : []);
  const [loading, setLoading] = useState(!IS_MOCK);
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
  const [showInactive, setShowInactive] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", role: "operator" as UserRole, password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (IS_MOCK) return;
    setLoading(true);
    usersApi.list({ limit: 100 }).then((res) => {
      setUsers(res.items ?? []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleInvite = async () => {
    if (!form.name || !form.email || !form.password) { setFormError("All fields are required"); return; }
    setSubmitting(true);
    setFormError("");
    try {
      const created = await usersApi.create({ name: form.name, email: form.email, role: form.role, password: form.password });
      setUsers((u) => [created, ...u]);
      setShowInvite(false);
      setForm({ name: "", email: "", role: "operator", password: "" });
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Failed to invite user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (user: UserSchema) => {
    setOpenMenu(null);
    try {
      const updated = await usersApi.update(user.id, { is_active: !user.is_active });
      setUsers((u) => u.map((x) => x.id === user.id ? updated : x));
    } catch {}
  };

  const visible = users
    .filter((u) => roleFilter === "all" || u.role === roleFilter)
    .filter((u) => showInactive || u.is_active);

  const activeCount = users.filter((u) => u.is_active).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">User Management</h1>
          <p className="font-mono text-xs text-text-tertiary mt-0.5">Roles · access control · Argon2id authentication</p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="inline-flex items-center gap-1.5 font-mono text-xs font-bold rounded-lg px-3 py-2"
          style={{ background: T.brand, color: "#fff" }}
        >
          <Plus size={12} /> Invite User
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Users",  value: users.length.toString(), color: T.text },
          { label: "Active",       value: activeCount.toString(),  color: T.success },
          { label: "Admins",       value: users.filter(u => u.role === "admin").length.toString(), color: T.warning },
          { label: "Operators",    value: users.filter(u => u.role === "operator").length.toString(), color: T.neutral },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl p-4 shadow-card text-center">
            <p className="font-mono text-2xl font-black leading-none tabular-nums" style={{ color }}>{value}</p>
            <p className="font-mono text-2xs text-text-disabled uppercase tracking-widest mt-1.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 bg-bg-subtle border border-border rounded-lg p-0.5">
          {(["all","admin","manager","supervisor","operator"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r === "all" ? "all" : r as UserRole)}
              className="font-mono text-xs px-3 py-1.5 rounded-md capitalize transition-all"
              style={roleFilter === r ? { background: T.brand, color: "#fff", fontWeight: 700 } : { color: T.muted }}
            >
              {r}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <div
            onClick={() => setShowInactive((v) => !v)}
            className="w-8 h-4 rounded-full relative transition-colors"
            style={{ background: showInactive ? T.brand : T.border }}
          >
            <div
              className="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all"
              style={{ left: showInactive ? "50%" : "2px" }}
            />
          </div>
          <span className="font-mono text-xs text-text-secondary">Show inactive</span>
        </label>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="grid grid-cols-[2.5rem_1fr_1fr_8rem_5rem_8rem_3rem] items-center px-5 py-2.5 bg-bg-subtle border-b border-border gap-3">
          {["","Name","Email","Role","Status","Joined",""].map((h, i) => (
            <span key={i} className="font-mono text-2xs text-text-disabled uppercase tracking-widest">{h}</span>
          ))}
        </div>

        {loading ? (
          <div className="px-5 py-10 text-center font-mono text-xs text-text-disabled">Loading users…</div>
        ) : visible.length === 0 ? (
          <div className="px-5 py-10 text-center font-mono text-xs text-text-disabled">No users found</div>
        ) : (
          <div className="divide-y divide-border">
            {visible.map((user) => {
              const roleCfg = ROLE_CFG[user.role] ?? ROLE_CFG.operator;
              const RoleIcon = roleCfg.icon;
              return (
                <div key={user.id} className="grid grid-cols-[2.5rem_1fr_1fr_8rem_5rem_8rem_3rem] items-center px-5 py-3.5 gap-3 hover:bg-bg-subtle transition-colors">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center font-sans text-xs font-bold"
                    style={{ background: user.is_active ? T.brandDim : T.neutralDim, color: user.is_active ? T.brand : T.neutral }}
                  >
                    {user.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-sans text-xs font-bold text-text-primary">{user.name}</p>
                  </div>
                  <p className="font-mono text-xs text-text-secondary truncate">{user.email}</p>
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-2xs font-semibold w-fit"
                    style={{ background: roleCfg.bg, color: roleCfg.color }}
                  >
                    <RoleIcon size={10} />
                    {roleCfg.label}
                  </span>
                  <span
                    className="inline-flex items-center gap-1.5 font-mono text-2xs font-semibold w-fit"
                    style={{ color: user.is_active ? T.success : T.disabled }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: user.is_active ? T.success : T.disabled }} />
                    {user.is_active ? "Active" : "Inactive"}
                  </span>
                  <span className="font-mono text-2xs text-text-disabled tabular-nums">{formatDate(user.created_at)}</span>
                  <div className="relative">
                    <button
                      onClick={() => setOpenMenu(openMenu === user.id ? null : user.id)}
                      className="text-text-disabled hover:text-brand transition-colors"
                    >
                      <MoreHorizontal size={14} />
                    </button>
                    {openMenu === user.id && (
                      <div className="absolute right-0 top-6 z-10 w-40 bg-white border border-border rounded-xl shadow-lg py-1">
                        <button
                          onClick={() => handleToggleActive(user)}
                          className="w-full text-left px-4 py-2 font-mono text-xs hover:bg-bg-subtle transition-colors"
                          style={{ color: user.is_active ? T.warning : T.success }}
                        >
                          {user.is_active ? "Deactivate" : "Reactivate"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Auth notice */}
      <div className="flex items-start gap-3 bg-bg-subtle border border-border rounded-xl px-5 py-4">
        <Shield size={14} style={{ color: T.muted }} className="shrink-0 mt-0.5" />
        <div>
          <p className="font-sans text-xs font-bold text-text-primary">Argon2id password hashing · 10 character minimum</p>
          <p className="font-mono text-2xs text-text-disabled mt-0.5">
            Passwords never stored in plaintext. JWT sessions expire after 8h. Audit log captures all auth events.
          </p>
        </div>
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-mono text-sm font-bold text-text-primary">Invite User</h2>
              <button onClick={() => { setShowInvite(false); setFormError(""); }} className="text-text-disabled hover:text-brand">
                <X size={16} />
              </button>
            </div>
            {(["name","email","password"] as const).map((field) => (
              <div key={field}>
                <label className="font-mono text-2xs uppercase tracking-widest text-text-disabled block mb-1">
                  {field === "name" ? "Full Name" : field === "email" ? "Email" : "Temporary Password"}
                </label>
                <input
                  type={field === "password" ? "password" : field === "email" ? "email" : "text"}
                  value={form[field]}
                  onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                  className="w-full border border-border rounded-lg px-3 py-2 font-mono text-xs focus:outline-none focus:border-brand"
                  placeholder={field === "name" ? "Ravi Singh" : field === "email" ? "ravi@factory.com" : "Min. 10 characters"}
                />
              </div>
            ))}
            <div>
              <label className="font-mono text-2xs uppercase tracking-widest text-text-disabled block mb-1">Role</label>
              <div className="relative">
                <select
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}
                  className="w-full border border-border rounded-lg px-3 py-2 font-mono text-xs appearance-none focus:outline-none focus:border-brand"
                >
                  {["admin","manager","supervisor","operator"].map((r) => (
                    <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                  ))}
                </select>
                <ChevronDown size={12} className="absolute right-3 top-2.5 text-text-disabled pointer-events-none" />
              </div>
            </div>
            {formError && <p className="font-mono text-2xs text-red-600">{formError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => { setShowInvite(false); setFormError(""); }}
                className="px-4 py-2 font-mono text-xs border border-border rounded-lg hover:bg-bg-subtle transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                disabled={submitting}
                className="px-4 py-2 font-mono text-xs font-bold rounded-lg disabled:opacity-50"
                style={{ background: T.brand, color: "#fff" }}
              >
                {submitting ? "Inviting…" : "Invite"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close menu on outside click */}
      {openMenu && (
        <div className="fixed inset-0 z-0" onClick={() => setOpenMenu(null)} />
      )}
    </div>
  );
}
