"use client";

import { useState } from "react";
import { UserCircle2, Plus, MoreHorizontal, Shield, Wrench, Eye } from "lucide-react";

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

type Role = "admin" | "operator" | "viewer";

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  lastLogin: string;
  machines: string[];
}

const USERS: User[] = [
  { id:"1", name:"Rahul Sharma",    email:"admin@sunrise.com",          role:"admin",    active:true,  lastLogin:"Today, 03:28", machines:["All"] },
  { id:"2", name:"Priya Mehta",     email:"priya.mehta@sunrise.com",    role:"operator", active:true,  lastLogin:"Today, 02:15", machines:["M-01","M-04"] },
  { id:"3", name:"Arjun Nair",      email:"arjun.nair@sunrise.com",     role:"operator", active:true,  lastLogin:"Today, 00:00", machines:["M-02","M-03"] },
  { id:"4", name:"Deepa Krishnan",  email:"deepa.k@sunrise.com",        role:"viewer",   active:true,  lastLogin:"Yesterday",    machines:["All"] },
  { id:"5", name:"Suresh Patel",    email:"suresh.p@sunrise.com",       role:"operator", active:false, lastLogin:"3 days ago",   machines:["M-02"] },
  { id:"6", name:"Anitha Rajan",    email:"anitha.r@sunrise.com",       role:"viewer",   active:true,  lastLogin:"Today, 01:45", machines:["All"] },
  { id:"7", name:"Kiran Desai",     email:"kiran.d@sunrise.com",        role:"operator", active:true,  lastLogin:"Today, 00:30", machines:["M-01","M-03"] },
];

const ROLE_CFG: Record<Role, { label: string; color: string; bg: string; icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }> }> = {
  admin:    { label: "Admin",    color: T.brand,   bg: T.brandDim,   icon: Shield },
  operator: { label: "Operator", color: T.warning, bg: T.warningDim, icon: Wrench },
  viewer:   { label: "Viewer",   color: T.neutral,  bg: T.neutralDim, icon: Eye },
};

export default function AdminUsersPage() {
  const [roleFilter, setRoleFilter] = useState<"all" | Role>("all");
  const [showInactive, setShowInactive] = useState(false);

  const visible = USERS
    .filter((u) => roleFilter === "all" || u.role === roleFilter)
    .filter((u) => showInactive || u.active);

  const activeCount   = USERS.filter((u) => u.active).length;
  const onlineCount   = 3;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">User Management</h1>
          <p className="font-mono text-xs text-text-tertiary mt-0.5">Roles · access control · Argon2id authentication</p>
        </div>
        <button
          className="inline-flex items-center gap-1.5 font-mono text-xs font-bold rounded-lg px-3 py-2"
          style={{ background: T.brand, color: "#fff" }}
        >
          <Plus size={12} /> Invite User
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Users",  value: USERS.length.toString(), color: T.text },
          { label: "Active",       value: activeCount.toString(),  color: T.success },
          { label: "Online Now",   value: onlineCount.toString(),  color: T.brand },
          { label: "Admins",       value: USERS.filter(u => u.role === "admin").length.toString(), color: T.warning },
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
          {(["all","admin","operator","viewer"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
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
          {["","Name","Email","Role","Status","Last Login",""].map((h, i) => (
            <span key={i} className="font-mono text-2xs text-text-disabled uppercase tracking-widest">{h}</span>
          ))}
        </div>

        <div className="divide-y divide-border">
          {visible.map((user) => {
            const role = ROLE_CFG[user.role];
            const RoleIcon = role.icon;
            return (
              <div key={user.id} className="grid grid-cols-[2.5rem_1fr_1fr_8rem_5rem_8rem_3rem] items-center px-5 py-3.5 gap-3 hover:bg-bg-subtle transition-colors">

                {/* Avatar */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center font-sans text-xs font-bold"
                  style={{ background: user.active ? T.brandDim : T.neutralDim, color: user.active ? T.brand : T.neutral }}
                >
                  {user.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </div>

                {/* Name + machines */}
                <div className="min-w-0">
                  <p className="font-sans text-xs font-bold text-text-primary">{user.name}</p>
                  <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                    {user.machines.map((m) => (
                      <span key={m} className="font-mono text-2xs text-text-disabled">{m}</span>
                    ))}
                  </div>
                </div>

                {/* Email */}
                <p className="font-mono text-xs text-text-secondary truncate">{user.email}</p>

                {/* Role */}
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-2xs font-semibold w-fit"
                  style={{ background: role.bg, color: role.color }}
                >
                  <RoleIcon size={10} />
                  {role.label}
                </span>

                {/* Status */}
                <span
                  className="inline-flex items-center gap-1.5 font-mono text-2xs font-semibold w-fit"
                  style={{ color: user.active ? T.success : T.disabled }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: user.active ? T.success : T.disabled }} />
                  {user.active ? "Active" : "Inactive"}
                </span>

                {/* Last login */}
                <span className="font-mono text-2xs text-text-disabled tabular-nums">{user.lastLogin}</span>

                {/* Actions */}
                <button className="text-text-disabled hover:text-brand transition-colors">
                  <MoreHorizontal size={14} />
                </button>
              </div>
            );
          })}
        </div>
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
    </div>
  );
}
