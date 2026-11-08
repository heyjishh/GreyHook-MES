"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth";
import { GitBranch, Plus, RefreshCw, CheckCircle2, XCircle, Trash2 } from "lucide-react";

interface Factory { id: string; name: string; code: string; production_lines?: Line[]; }
interface Line { id: string; name: string; code: string; factory_id: string; is_active: boolean; }

export default function LinesPage() {
  const token = useAuthStore((s) => s.token);
  const [factories, setFactories] = useState<Factory[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", factory_id: "" });
  const [error, setError] = useState<string | null>(null);

  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
  const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      fetch(`${base}/factories`, { headers }).then((r) => r.json()),
    ])
      .then(([facs]) => {
        const facArr: Factory[] = Array.isArray(facs) ? facs : [];
        setFactories(facArr);
        const allLines: Line[] = facArr.flatMap((f) => f.production_lines ?? []);
        setLines(allLines);
        if (facArr.length > 0 && !form.factory_id) {
          setForm((ff) => ({ ...ff, factory_id: facArr[0].id }));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async () => {
    if (!form.name || !form.code || !form.factory_id) { setError("All fields required."); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${base}/factories/${form.factory_id}/lines`, {
        method: "POST",
        headers,
        body: JSON.stringify({ name: form.name, code: form.code }),
      });
      if (!res.ok) { const e = await res.json(); setError(e?.detail ?? "Failed to create line."); return; }
      setForm((f) => ({ ...f, name: "", code: "" }));
      setShowForm(false);
      fetchData();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (factoryId: string, lineId: string) => {
    if (!confirm("Delete this production line?")) return;
    await fetch(`${base}/factories/${factoryId}/lines/${lineId}`, { method: "DELETE", headers });
    fetchData();
  };

  const linesWithFactory = lines.map((l) => ({
    ...l,
    factoryName: factories.find((f) => f.id === l.factory_id)?.name ?? "Unknown",
    factoryCode: factories.find((f) => f.id === l.factory_id)?.code ?? "",
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-[#001C2E] font-mono tracking-tight flex items-center gap-2">
            <GitBranch size={20} className="text-[#F05230]" />
            Production Lines
          </h1>
          <p className="text-sm text-[#6A8A9A] mt-1">{lines.length} lines across {factories.length} plants.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#F05230] text-white text-xs font-semibold hover:bg-[#d94720] transition-colors"
        >
          <Plus size={13} /> Add Line
        </button>
      </div>

      {showForm && (
        <div className="p-5 rounded-xl border border-[#F05230]/30 bg-[#FEF0EB]/20 space-y-4">
          <h2 className="text-sm font-semibold text-[#001C2E]">New Production Line</h2>
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              <XCircle size={13} /> {error}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#001C2E] mb-1">Plant</label>
              <select
                value={form.factory_id}
                onChange={(e) => setForm((f) => ({ ...f, factory_id: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[#E8E4DF] text-sm text-[#001C2E] bg-white focus:outline-none focus:ring-2 focus:ring-[#F05230]/20"
              >
                {factories.map((f) => <option key={f.id} value={f.id}>{f.name} ({f.code})</option>)}
              </select>
            </div>
            {(["name", "code"] as const).map((field) => (
              <div key={field}>
                <label className="block text-xs font-medium text-[#001C2E] mb-1 capitalize">{field}</label>
                <input
                  value={form[field]}
                  onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                  placeholder={field === "code" ? "e.g. L-01" : ""}
                  className="w-full px-3 py-2 rounded-lg border border-[#E8E4DF] text-sm text-[#001C2E] bg-white focus:outline-none focus:ring-2 focus:ring-[#F05230]/20 focus:border-[#F05230]"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 rounded-lg border border-[#E8E4DF] text-xs text-[#6A8A9A] hover:bg-[#FAFAF8]">Cancel</button>
            <button onClick={handleCreate} disabled={saving} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-[#F05230] text-white text-xs font-semibold hover:bg-[#d94720] disabled:opacity-50">
              {saving ? <RefreshCw size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
              Create Line
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><RefreshCw size={22} className="animate-spin text-[#F05230]" /></div>
      ) : linesWithFactory.length === 0 ? (
        <div className="py-16 text-center">
          <GitBranch size={40} className="text-[#E8E4DF] mx-auto mb-3" />
          <p className="text-sm text-[#6A8A9A]">No production lines yet.{factories.length === 0 ? " Add a plant first." : " Add your first line above."}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-[#E8E4DF] bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#FAFAF8] border-b border-[#E8E4DF]">
              <tr>
                {["Line", "Code", "Plant", "Status", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#6A8A9A] font-mono uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E4DF]">
              {linesWithFactory.map((l) => (
                <tr key={l.id} className="hover:bg-[#FAFAF8] transition-colors">
                  <td className="px-4 py-3 font-medium text-[#001C2E]">{l.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-[#F05230]">{l.code}</td>
                  <td className="px-4 py-3 text-xs text-[#6A8A9A]">{l.factoryName} <span className="font-mono text-[#F05230]">({l.factoryCode})</span></td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium ${l.is_active ? "bg-[#E8F5EC] text-[#1A7A40]" : "bg-[#E8E4DF] text-[#6A8A9A]"}`}>
                      {l.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(l.factory_id, l.id)} className="p-1.5 rounded text-[#6A8A9A] hover:text-red-500 hover:bg-red-50">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
