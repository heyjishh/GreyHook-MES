"use client";

import React, { useState } from "react";
import { PLANTS } from "@/lib/enterprise-config";
import {
  Shield,
  Users,
  Lock,
  CheckCircle2,
  XCircle,
  Eye,
  Edit2,
  Plus,
  Building2,
  Factory,
  AlertTriangle,
  Clock,
} from "lucide-react";

type AccessLevel = "Full" | "Read" | "Limited" | "None";
type TabId = "matrix" | "users" | "requests";

const ROLES = [
  { id: "company_admin",    label: "Company Admin",    color: "#F05230", short: "CA" },
  { id: "plant_manager",    label: "Plant Manager",    color: "#0057CC", short: "PM" },
  { id: "shift_supervisor", label: "Shift Supervisor", color: "#1A7A40", short: "SS" },
  { id: "quality_engineer", label: "Quality Engineer", color: "#7C3AED", short: "QE" },
  { id: "operator",         label: "Operator",         color: "#A85E00", short: "OP" },
  { id: "viewer",           label: "Viewer",           color: "#6A8A9A", short: "VW" },
] as const;

type RoleId = typeof ROLES[number]["id"];

interface ModuleRow {
  module: string;
  ca: AccessLevel; pm: AccessLevel; ss: AccessLevel; qe: AccessLevel; op: AccessLevel; vw: AccessLevel;
}
interface SectionDef { label: string; rows: ModuleRow[] }

const SECTIONS: SectionDef[] = [
  {
    label: "OPERATIONS",
    rows: [
      { module: "Overview",        ca:"Full", pm:"Full",    ss:"Read",    qe:"Read",    op:"Read",    vw:"Read" },
      { module: "Production",      ca:"Full", pm:"Full",    ss:"Limited", qe:"Read",    op:"Limited", vw:"Read" },
      { module: "OEE",             ca:"Full", pm:"Full",    ss:"Read",    qe:"Read",    op:"None",    vw:"Read" },
      { module: "Downtime",        ca:"Full", pm:"Full",    ss:"Limited", qe:"Read",    op:"None",    vw:"Read" },
      { module: "Work Orders",     ca:"Full", pm:"Full",    ss:"Limited", qe:"Read",    op:"Limited", vw:"Read" },
      { module: "Operator Board",  ca:"Full", pm:"Full",    ss:"Full",    qe:"Read",    op:"Full",    vw:"Read" },
      { module: "Scheduling",      ca:"Full", pm:"Full",    ss:"None",    qe:"None",    op:"None",    vw:"Read" },
      { module: "Shift Handover",  ca:"Full", pm:"Full",    ss:"Full",    qe:"Read",    op:"Read",    vw:"Read" },
    ],
  },
  {
    label: "QUALITY",
    rows: [
      { module: "Quality",         ca:"Full", pm:"Full",    ss:"Read",    qe:"Full",    op:"None",    vw:"Read" },
      { module: "Inspections",     ca:"Full", pm:"Full",    ss:"Read",    qe:"Full",    op:"None",    vw:"Read" },
      { module: "NCM",             ca:"Full", pm:"Full",    ss:"Read",    qe:"Full",    op:"None",    vw:"None" },
      { module: "CAPA",            ca:"Full", pm:"Full",    ss:"Read",    qe:"Full",    op:"None",    vw:"None" },
      { module: "SPC / Capability",ca:"Full", pm:"Full",    ss:"Read",    qe:"Full",    op:"None",    vw:"Read" },
      { module: "Genealogy",       ca:"Full", pm:"Full",    ss:"None",    qe:"Full",    op:"None",    vw:"Read" },
      { module: "Calibration",     ca:"Full", pm:"Full",    ss:"None",    qe:"Full",    op:"None",    vw:"None" },
      { module: "Supplier Quality",ca:"Full", pm:"Full",    ss:"None",    qe:"Full",    op:"None",    vw:"None" },
    ],
  },
  {
    label: "ASSETS",
    rows: [
      { module: "Maintenance",     ca:"Full", pm:"Full",    ss:"None",    qe:"None",    op:"None",    vw:"None" },
      { module: "Tooling",         ca:"Full", pm:"Full",    ss:"None",    qe:"None",    op:"None",    vw:"None" },
      { module: "BOM",             ca:"Full", pm:"Read",    ss:"None",    qe:"None",    op:"None",    vw:"None" },
      { module: "Inventory / WIP", ca:"Full", pm:"Full",    ss:"Read",    qe:"None",    op:"None",    vw:"None" },
      { module: "Recipes",         ca:"Full", pm:"Full",    ss:"None",    qe:"Read",    op:"None",    vw:"None" },
      { module: "ERP Sync",        ca:"Full", pm:"Read",    ss:"None",    qe:"None",    op:"None",    vw:"None" },
    ],
  },
  {
    label: "ANALYTICS",
    rows: [
      { module: "Analytics",       ca:"Full", pm:"Read",    ss:"None",    qe:"Read",    op:"None",    vw:"Read" },
      { module: "Reports",         ca:"Full", pm:"Read",    ss:"Read",    qe:"Read",    op:"None",    vw:"Read" },
      { module: "AI Insight",      ca:"Full", pm:"Read",    ss:"None",    qe:"Read",    op:"None",    vw:"Read" },
      { module: "Energy",          ca:"Full", pm:"Read",    ss:"None",    qe:"None",    op:"None",    vw:"None" },
      { module: "Yield & Loss",    ca:"Full", pm:"Read",    ss:"None",    qe:"Read",    op:"None",    vw:"None" },
      { module: "Golden Batch",    ca:"Full", pm:"Read",    ss:"None",    qe:"Full",    op:"None",    vw:"None" },
    ],
  },
  {
    label: "ENTERPRISE",
    rows: [
      { module: "Command Center",  ca:"Full", pm:"Read",    ss:"None",    qe:"None",    op:"None",    vw:"None" },
      { module: "Benchmarking",    ca:"Full", pm:"Read",    ss:"None",    qe:"None",    op:"None",    vw:"None" },
      { module: "Compliance",      ca:"Full", pm:"Read",    ss:"None",    qe:"Read",    op:"None",    vw:"None" },
      { module: "Recipe Library",  ca:"Full", pm:"Read",    ss:"None",    qe:"Read",    op:"None",    vw:"None" },
      { module: "WIP Transfer",    ca:"Full", pm:"Full",    ss:"None",    qe:"None",    op:"None",    vw:"None" },
      { module: "Ent. Scheduling", ca:"Full", pm:"Read",    ss:"None",    qe:"None",    op:"None",    vw:"None" },
    ],
  },
  {
    label: "FINANCE",
    rows: [
      { module: "Finance",         ca:"Full", pm:"Read",    ss:"None",    qe:"None",    op:"None",    vw:"None" },
      { module: "Procurement",     ca:"Full", pm:"Limited", ss:"None",    qe:"None",    op:"None",    vw:"None" },
    ],
  },
  {
    label: "ADMIN",
    rows: [
      { module: "Admin Console",   ca:"Full", pm:"None",    ss:"None",    qe:"None",    op:"None",    vw:"None" },
    ],
  },
];

const ACCESS_CHIP: Record<AccessLevel, { bg: string; color: string; label: string }> = {
  Full:    { bg: "#E8F5EC", color: "#1A7A40", label: "Full"    },
  Read:    { bg: "#E8F0FF", color: "#0057CC", label: "Read"    },
  Limited: { bg: "#FEF0D6", color: "#A85E00", label: "Limited" },
  None:    { bg: "#F4F0EC", color: "#6A8A9A", label: "—"       },
};

function AccessCell({ level }: { level: AccessLevel }) {
  const cfg = ACCESS_CHIP[level];
  return (
    <div className="flex justify-center">
      <span
        className="inline-flex items-center justify-center px-2 py-0.5 rounded font-mono text-2xs font-semibold min-w-[52px]"
        style={{ background: cfg.bg, color: cfg.color }}
      >
        {cfg.label}
      </span>
    </div>
  );
}

const USERS = [
  { name: "Ravi Kumar",    email: "ravi@sunrise.com",   role: "company_admin",    plants: "All Plants",          status: "Active",   lastActive: "just now" },
  { name: "Priya Sharma",  email: "priya@sunrise.com",  role: "plant_manager",    plants: "Chennai, Bangalore",  status: "Active",   lastActive: "2h ago" },
  { name: "Dr. S. Reddy", email: "reddy@sunrise.com",  role: "plant_manager",    plants: "Hyderabad",           status: "Active",   lastActive: "5m ago" },
  { name: "M. Sharma",     email: "sharma@sunrise.com", role: "shift_supervisor", plants: "Pune",                status: "Active",   lastActive: "12m ago" },
  { name: "K. Nair",       email: "nair@sunrise.com",   role: "quality_engineer", plants: "Bangalore",           status: "Active",   lastActive: "1h ago" },
  { name: "Arun Singh",    email: "arun@sunrise.com",   role: "operator",         plants: "Chennai",             status: "Active",   lastActive: "Now" },
  { name: "Meera Pillai",  email: "meera@sunrise.com",  role: "viewer",           plants: "All Plants",          status: "Active",   lastActive: "3d ago" },
  { name: "Vikram Joshi",  email: "vikram@sunrise.com", role: "quality_engineer", plants: "Chennai, Pune",       status: "Inactive", lastActive: "14d ago" },
];

const REQUESTS = [
  { name: "Ananya Iyer",    email: "ananya@sunrise.com",   requestedRole: "quality_engineer", requestedPlant: "Bangalore", submitted: "2026-11-05" },
  { name: "Rohit Verma",    email: "rohit@sunrise.com",    requestedRole: "shift_supervisor", requestedPlant: "Chennai",   submitted: "2026-11-04" },
  { name: "Sunita Krishnan",email: "sunita@sunrise.com",   requestedRole: "viewer",           requestedPlant: "All Plants",submitted: "2026-11-03" },
];

const PLANT_SCOPE: Record<RoleId, Record<string, boolean>> = {
  company_admin:    { "plant-chennai": true,  "plant-hyderabad": true,  "plant-bangalore": true,  "plant-pune": true  },
  plant_manager:    { "plant-chennai": true,  "plant-hyderabad": false, "plant-bangalore": true,  "plant-pune": false },
  shift_supervisor: { "plant-chennai": false, "plant-hyderabad": false, "plant-bangalore": false, "plant-pune": true  },
  quality_engineer: { "plant-chennai": false, "plant-hyderabad": false, "plant-bangalore": true,  "plant-pune": false },
  operator:         { "plant-chennai": true,  "plant-hyderabad": false, "plant-bangalore": false, "plant-pune": false },
  viewer:           { "plant-chennai": true,  "plant-hyderabad": true,  "plant-bangalore": true,  "plant-pune": true  },
};

function RoleBadge({ roleId }: { roleId: string }) {
  const role = ROLES.find((r) => r.id === roleId);
  if (!role) return null;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-2xs font-semibold"
      style={{ background: role.color + "18", color: role.color }}
    >
      {role.label}
    </span>
  );
}

export default function RBACPage() {
  const [activeTab, setActiveTab] = useState<TabId>("matrix");

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "matrix",   label: "Permissions Matrix", icon: <Lock size={13} /> },
    { id: "users",    label: "Users & Roles",       icon: <Users size={13} /> },
    { id: "requests", label: "Access Requests",     icon: <AlertTriangle size={13} /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield size={18} className="text-[#F05230]" />
            <h1 className="font-heading text-xl font-bold text-[#001C2E]">Role-Based Access Control</h1>
          </div>
          <p className="font-sans text-sm text-[#6A8A9A]">Manage roles, permissions, and plant-level access across Sunrise Industries Ltd</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#F05230] text-white font-sans text-sm font-semibold hover:bg-[#F05230]/90 transition-colors">
          <Plus size={14} />
          Add User
        </button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Users",             value: "12",  icon: <Users size={14} />,    color: "#001C2E" },
          { label: "Active Roles",            value: "6",   icon: <Shield size={14} />,   color: "#1A7A40" },
          { label: "Plants",                  value: "4",   icon: <Factory size={14} />,  color: "#0057CC" },
          { label: "Pending Requests",        value: "3",   icon: <Clock size={14} />,    color: "#A85E00" },
        ].map((tile) => (
          <div key={tile.label} className="bg-white rounded-xl border border-[#E8E4DF] shadow-card p-4">
            <div className="flex items-center gap-2 mb-2" style={{ color: tile.color }}>{tile.icon}
              <p className="font-mono text-2xs text-[#6A8A9A] uppercase tracking-widest">{tile.label}</p>
            </div>
            <p className="font-mono text-3xl font-bold" style={{ color: tile.color }}>{tile.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[#E8E4DF]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 font-sans text-sm font-medium transition-all border-b-2 ${
              activeTab === tab.id
                ? "border-[#F05230] text-[#F05230]"
                : "border-transparent text-[#6A8A9A] hover:text-[#001C2E]"
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.id === "requests" && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[#A85E00] text-white font-mono text-2xs">3</span>
            )}
          </button>
        ))}
      </div>

      {/* Permissions Matrix */}
      {activeTab === "matrix" && (
        <div className="bg-white rounded-xl border border-[#E8E4DF] shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E8E4DF]">
            <h2 className="font-mono text-xs font-bold text-[#001C2E] uppercase tracking-widest">Module × Role Permissions</h2>
            <p className="font-sans text-xs text-[#6A8A9A] mt-0.5">Default permissions per role — plant managers may override within their scope</p>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 px-5 py-2 bg-[#FAFAF8] border-b border-[#E8E4DF]">
            {(Object.entries(ACCESS_CHIP) as [AccessLevel, { bg: string; color: string; label: string }][]).map(([level, cfg]) => (
              <span key={level} className="inline-flex items-center gap-1.5">
                <span className="inline-block px-2 py-0.5 rounded font-mono text-2xs font-semibold" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
              </span>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#E8E4DF]">
                  <th className="px-5 py-2.5 font-mono text-2xs text-[#6A8A9A] uppercase tracking-widest w-40">Module</th>
                  {ROLES.map((role) => (
                    <th key={role.id} className="px-3 py-2.5 text-center min-w-[90px]">
                      <span className="inline-flex flex-col items-center gap-0.5">
                        <span className="w-6 h-6 rounded-full flex items-center justify-center font-mono text-2xs font-bold text-white" style={{ background: role.color }}>{role.short}</span>
                        <span className="font-sans text-2xs font-semibold text-[#001C2E] leading-none whitespace-nowrap">{role.label}</span>
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SECTIONS.map((section) => (
                  <React.Fragment key={section.label}>
                    <tr className="bg-[#F4F0EC]">
                      <td colSpan={7} className="px-5 py-1.5">
                        <span className="font-mono text-2xs font-bold text-[#6A8A9A] uppercase tracking-widest">{section.label}</span>
                      </td>
                    </tr>
                    {section.rows.map((row) => (
                      <tr key={row.module} className="border-b border-[#E8E4DF] hover:bg-[#FAFAF8]">
                        <td className="px-5 py-2 font-sans text-xs text-[#001C2E]">{row.module}</td>
                        <td className="px-3 py-2"><AccessCell level={row.ca} /></td>
                        <td className="px-3 py-2"><AccessCell level={row.pm} /></td>
                        <td className="px-3 py-2"><AccessCell level={row.ss} /></td>
                        <td className="px-3 py-2"><AccessCell level={row.qe} /></td>
                        <td className="px-3 py-2"><AccessCell level={row.op} /></td>
                        <td className="px-3 py-2"><AccessCell level={row.vw} /></td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Users & Roles */}
      {activeTab === "users" && (
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-[#E8E4DF] shadow-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8E4DF]">
              <h2 className="font-mono text-xs font-bold text-[#001C2E] uppercase tracking-widest">Users & Role Assignments</h2>
              <span className="font-mono text-2xs text-[#6A8A9A]">8 users</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E8E4DF] bg-[#FAFAF8]">
                    {["Name", "Role", "Plant Access", "Status", "Last Active", "Actions"].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left font-mono text-2xs text-[#6A8A9A] uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E4DF]">
                  {USERS.map((user) => (
                    <tr key={user.email} className="hover:bg-[#FAFAF8]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-bold text-white shrink-0"
                            style={{ background: ROLES.find((r) => r.id === user.role)?.color ?? "#6A8A9A" }}>
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-sans text-xs font-semibold text-[#001C2E]">{user.name}</p>
                            <p className="font-mono text-2xs text-[#6A8A9A]">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><RoleBadge roleId={user.role} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Building2 size={10} className="text-[#6A8A9A]" />
                          <span className="font-sans text-xs text-[#001C2E]">{user.plants}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-2xs font-semibold ${
                          user.status === "Active"
                            ? "bg-[#E8F5EC] text-[#1A7A40]"
                            : "bg-[#F4F0EC] text-[#6A8A9A]"
                        }`}>
                          {user.status === "Active" ? <CheckCircle2 size={9} /> : <XCircle size={9} />}
                          {user.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-2xs text-[#6A8A9A]">{user.lastActive}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button className="p-1.5 rounded-lg border border-[#E8E4DF] text-[#6A8A9A] hover:text-[#001C2E] hover:border-[#6A8A9A] transition-colors">
                            <Edit2 size={12} />
                          </button>
                          <button className="p-1.5 rounded-lg border border-[#E8E4DF] text-[#6A8A9A] hover:text-[#001C2E] transition-colors">
                            <Eye size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Plant scope matrix */}
          <div className="bg-white rounded-xl border border-[#E8E4DF] shadow-card overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E8E4DF]">
              <h2 className="font-mono text-xs font-bold text-[#001C2E] uppercase tracking-widest">Default Plant Scope by Role</h2>
              <p className="font-sans text-xs text-[#6A8A9A] mt-0.5">Shows example scope — actual access depends on individual assignment</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E8E4DF] bg-[#FAFAF8]">
                    <th className="px-5 py-2.5 text-left font-mono text-2xs text-[#6A8A9A] uppercase tracking-widest">Role</th>
                    {PLANTS.map((p) => (
                      <th key={p.id} className="px-4 py-2.5 text-center font-mono text-2xs text-[#6A8A9A]">
                        <span style={{ color: p.industryColor }}>{p.industryEmoji}</span>{" "}
                        {p.name.replace("Sunrise ", "").replace("Electronics BLR", "BLR").replace("Textiles Pune", "Pune").replace("Pharma Hyd", "Hyd")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E4DF]">
                  {ROLES.map((role) => (
                    <tr key={role.id} className="hover:bg-[#FAFAF8]">
                      <td className="px-5 py-2.5">
                        <span className="inline-flex items-center gap-1.5 font-sans text-xs font-semibold" style={{ color: role.color }}>
                          <span className="w-5 h-5 rounded-full flex items-center justify-center font-mono text-2xs font-bold text-white" style={{ background: role.color }}>{role.short}</span>
                          {role.label}
                        </span>
                      </td>
                      {PLANTS.map((p) => {
                        const has = PLANT_SCOPE[role.id as RoleId]?.[p.id] ?? false;
                        return (
                          <td key={p.id} className="px-4 py-2.5 text-center">
                            {has
                              ? <CheckCircle2 size={14} className="mx-auto" style={{ color: "#1A7A40" }} />
                              : <span className="font-mono text-xs text-[#E8E4DF]">—</span>
                            }
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Access Requests */}
      {activeTab === "requests" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <AlertTriangle size={14} className="text-[#A85E00]" />
            <p className="font-sans text-sm text-[#6A8A9A]">3 pending access requests require approval</p>
          </div>
          {REQUESTS.map((req, i) => (
            <div key={i} className="bg-white rounded-xl border border-[#E8E4DF] shadow-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#FEF0D6] flex items-center justify-center font-mono text-sm font-bold text-[#A85E00] shrink-0">
                    {req.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-sans text-sm font-semibold text-[#001C2E]">{req.name}</p>
                    <p className="font-mono text-2xs text-[#6A8A9A]">{req.email}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="font-mono text-2xs text-[#6A8A9A]">Requesting:</span>
                      <RoleBadge roleId={req.requestedRole} />
                      <span className="font-mono text-2xs text-[#6A8A9A]">for</span>
                      <span className="inline-flex items-center gap-1 font-mono text-2xs text-[#001C2E] font-semibold">
                        <Factory size={10} />
                        {req.requestedPlant}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="inline-flex items-center gap-1 font-mono text-2xs text-[#6A8A9A]">
                    <Clock size={10} />
                    Submitted {req.submitted}
                  </span>
                  <div className="flex items-center gap-2">
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E8F5EC] text-[#1A7A40] font-sans text-xs font-semibold hover:bg-[#1A7A40] hover:text-white transition-colors">
                      <CheckCircle2 size={12} />
                      Approve
                    </button>
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FDE8E4] text-[#CC1800] font-sans text-xs font-semibold hover:bg-[#CC1800] hover:text-white transition-colors">
                      <XCircle size={12} />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
