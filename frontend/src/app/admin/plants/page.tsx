"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import {
  Factory, Plus, MapPin, Clock, Trash2, CheckCircle2, XCircle, RefreshCw,
  PlugZap, ChevronRight, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Plant {
  id: string;
  name: string;
  code: string;
  location: string;
  timezone: string;
  is_active: boolean;
  created_at: string;
}

interface PlantForm {
  name: string;
  code: string;
  location: string;
  timezone: string;
}

const TIMEZONES = [
  "Asia/Kolkata", "Asia/Shanghai", "Asia/Tokyo", "Asia/Seoul",
  "Europe/Berlin", "Europe/London", "America/New_York", "America/Chicago",
  "America/Los_Angeles", "UTC",
];

export default function PlantsPage() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);

  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<PlantForm>({ name: "", code: "", location: "", timezone: "Asia/Kolkata" });
  const [error, setError] = useState<string | null>(null);
  const [justCreated, setJustCreated] = useState<Plant | null>(null);

  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
  const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };

  const fetchPlants = () => {
    setLoading(true);
    fetch(`${base}/factories`, { headers })
      .then((r) => r.json())
      .then((d) => setPlants(Array.isArray(d) ? d : []))
      .catch(() => setPlants([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPlants(); }, []);

  const handleCreate = async () => {
    if (!form.name || !form.code) { setError("Name and code are required."); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${base}/factories`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: form.name,
          code: form.code,
          location: form.location,
          timezone: form.timezone,
        }),
      });
      if (!res.ok) {
        const e = await res.json();
        setError(e?.detail ?? "Failed to create plant.");
        return;
      }
      const created: Plant = await res.json().catch(() => ({ id: Date.now().toString(), ...form, is_active: true, created_at: new Date().toISOString() }));
      setJustCreated(created);
      setForm({ name: "", code: "", location: "", timezone: "Asia/Kolkata" });
      setShowForm(false);
      fetchPlants();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this plant? This cannot be undone.")) return;
    await fetch(`${base}/factories/${id}`, { method: "DELETE", headers });
    fetchPlants();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-[#001C2E] font-mono tracking-tight flex items-center gap-2">
            <Factory size={20} className="text-[#F05230]" />
            Plants / Factories
          </h1>
          <p className="text-sm text-[#6A8A9A] mt-1">{plants.length} plants configured for your organisation.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#F05230] text-white text-xs font-semibold hover:bg-[#d94720] transition-colors"
        >
          <Plus size={13} /> Add Plant
        </button>
      </div>

      {/* Post-creation CTA */}
      {justCreated && (
        <div className="p-5 rounded-xl border border-[#1A7A40]/30 bg-[#E8F5EC] flex items-start gap-4">
          <CheckCircle2 size={18} className="text-[#1A7A40] shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-semibold text-sm text-[#1A7A40] mb-1">
              Plant <span className="font-bold">{justCreated.name}</span> created!
            </div>
            <p className="text-xs text-[#1A7A40]/80 mb-3">
              Next step: choose which MES plugins and modules to activate for this plant.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/admin/plants/${justCreated.id}/plugins`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1A7A40] text-white text-xs font-semibold hover:bg-[#166234] transition-colors"
              >
                <PlugZap size={13} />
                Configure Plugins for this Plant
                <ChevronRight size={12} />
              </Link>
              <Link
                href="/admin/modules"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#1A7A40]/30 text-xs font-medium text-[#1A7A40] hover:bg-[#1A7A40]/10 transition-colors"
              >
                <Sparkles size={12} />
                Or browse all modules
              </Link>
              <button
                onClick={() => setJustCreated(null)}
                className="px-3 py-2 rounded-lg text-xs text-[#1A7A40]/60 hover:text-[#1A7A40]"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="p-5 rounded-xl border border-[#F05230]/30 bg-[#FEF0EB]/20 space-y-4">
          <h2 className="text-sm font-semibold text-[#001C2E]">New Plant</h2>
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              <XCircle size={13} /> {error}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(["name", "code", "location"] as const).map((field) => (
              <div key={field}>
                <label className="block text-xs font-medium text-[#001C2E] mb-1 capitalize">{field}</label>
                <input
                  value={form[field]}
                  onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                  placeholder={field === "code" ? "e.g. PLT-01" : ""}
                  className="w-full px-3 py-2 rounded-lg border border-[#E8E4DF] text-sm text-[#001C2E] bg-white focus:outline-none focus:ring-2 focus:ring-[#F05230]/20 focus:border-[#F05230]"
                />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-[#001C2E] mb-1">Timezone</label>
              <select
                value={form.timezone}
                onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[#E8E4DF] text-sm text-[#001C2E] bg-white focus:outline-none focus:ring-2 focus:ring-[#F05230]/20"
              >
                {TIMEZONES.map((tz) => <option key={tz}>{tz}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 rounded-lg border border-[#E8E4DF] text-xs text-[#6A8A9A] hover:bg-[#FAFAF8]">Cancel</button>
            <button onClick={handleCreate} disabled={saving} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-[#F05230] text-white text-xs font-semibold hover:bg-[#d94720] disabled:opacity-50">
              {saving ? <RefreshCw size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
              Create Plant
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <RefreshCw size={22} className="animate-spin text-[#F05230]" />
        </div>
      ) : plants.length === 0 ? (
        <div className="py-16 text-center">
          <Factory size={40} className="text-[#E8E4DF] mx-auto mb-3" />
          <p className="text-sm text-[#6A8A9A]">No plants configured yet. Add your first plant above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {plants.map((plant) => (
            <div key={plant.id} className="rounded-xl border border-[#E8E4DF] bg-white hover:border-[#F05230]/30 transition-all overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm text-[#001C2E]">{plant.name}</span>
                      <span className="font-mono text-2xs px-1.5 py-0.5 rounded bg-[#F05230]/10 text-[#F05230]">{plant.code}</span>
                    </div>
                    {plant.location && (
                      <div className="flex items-center gap-1 text-xs text-[#6A8A9A] mb-0.5">
                        <MapPin size={11} /> {plant.location}
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-xs text-[#6A8A9A]">
                      <Clock size={11} /> {plant.timezone}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className={cn("w-2 h-2 rounded-full shrink-0", plant.is_active ? "bg-[#1A7A40]" : "bg-[#E8E4DF]")} />
                    <button
                      onClick={() => handleDelete(plant.id)}
                      className="p-1.5 rounded-lg text-[#6A8A9A] hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
              {/* Plugin CTA footer */}
              <Link
                href={`/admin/plants/${plant.id}/plugins`}
                className="flex items-center gap-2 px-5 py-3 bg-[#F5F4F1] border-t border-[#E8E4DF] text-xs font-medium text-[#6A8A9A] hover:bg-[#FEF0EB] hover:text-[#F05230] transition-all group"
              >
                <PlugZap size={13} className="group-hover:text-[#F05230]" />
                Configure Plugins & Modules
                <ChevronRight size={12} className="ml-auto" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
