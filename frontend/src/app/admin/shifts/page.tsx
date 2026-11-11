"use client";

import { useEffect, useState } from "react";
import { Clock, Plus, Edit2, Pause, X, ChevronDown } from "lucide-react";
import { InsightBanner } from "@/components/admin/InsightBanner";
import { factoriesApi, shiftsApi } from "@/lib/api";
import type { ShiftSchema } from "@/types/api";

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

const DAYS_ALL = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const DOW_TO_LABEL: Record<number, string> = { 1:"Mon", 2:"Tue", 3:"Wed", 4:"Thu", 5:"Fri", 6:"Sat", 7:"Sun" };
const LABEL_TO_DOW: Record<string, number> = { Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6, Sun:7 };

const MOCK_SHIFTS: ShiftSchema[] = [
  { id:"mock-1", organization_id:"", factory_id:"", name:"Shift 1", start_time:"08:00", end_time:"16:00", days_of_week:[1,2,3,4,5], planned_stops:[{ name:"Lunch", duration_minutes:30 },{ name:"Tea", duration_minutes:10 }], planned_production_time_minutes:420 },
  { id:"mock-2", organization_id:"", factory_id:"", name:"Shift 2", start_time:"16:00", end_time:"00:00", days_of_week:[1,2,3,4,5], planned_stops:[{ name:"Dinner", duration_minutes:30 }], planned_production_time_minutes:450 },
  { id:"mock-3", organization_id:"", factory_id:"", name:"Night Shift", start_time:"00:00", end_time:"08:00", days_of_week:[1,2,3,4,5], planned_stops:[{ name:"Break", duration_minutes:15 }], planned_production_time_minutes:465 },
];

function isCurrentShift(s: ShiftSchema): boolean {
  const now = new Date();
  const hm  = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = s.start_time.split(":").map(Number);
  const [eh, em] = s.end_time.split(":").map(Number);
  const start = sh * 60 + sm;
  const end   = eh * 60 + em;
  if (end > start) return hm >= start && hm < end;
  return hm >= start || hm < end;
}

function DayPip({ day, active }: { day: string; active: boolean }) {
  return (
    <span
      className="w-7 h-7 rounded-full flex items-center justify-center font-mono text-2xs font-bold"
      style={active
        ? { background: T.brand, color: "#fff" }
        : { background: T.bgSubtle, color: T.disabled }}
    >
      {day[0]}
    </span>
  );
}

export default function AdminShiftsPage() {
  const [shifts, setShifts]       = useState<ShiftSchema[]>(IS_MOCK ? MOCK_SHIFTS : []);
  const [factoryId, setFactoryId] = useState<string | null>(null);
  const [loading, setLoading]     = useState(!IS_MOCK);
  const [showAdd, setShowAdd]     = useState(false);
  const [editShift, setEditShift] = useState<ShiftSchema | null>(null);
  const [form, setForm] = useState({ name:"", start_time:"08:00", end_time:"16:00", days:[1,2,3,4,5] as number[] });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (IS_MOCK) return;
    setLoading(true);
    factoriesApi.list().then(async (res) => {
      const f = res.items[0];
      if (!f) return;
      setFactoryId(f.id);
      const data = await factoriesApi.listShifts(f.id);
      setShifts(data.items);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    setSubmitting(true);
    const payload = {
      name: form.name,
      start_time: form.start_time,
      end_time: form.end_time,
      days_of_week: form.days,
      planned_stops: [],
    };
    if (IS_MOCK) {
      setShifts((s) => [...s, { ...payload, id:`mock-${Date.now()}`, organization_id:"", factory_id:"", planned_production_time_minutes: 480 }]);
    } else if (factoryId) {
      try {
        const created = await factoriesApi.createShift(factoryId, payload);
        setShifts((s) => [...s, created]);
      } catch {}
    }
    setShowAdd(false);
    setForm({ name:"", start_time:"08:00", end_time:"16:00", days:[1,2,3,4,5] });
    setSubmitting(false);
  };

  const handleUpdate = async () => {
    if (!editShift) return;
    setSubmitting(true);
    const payload = {
      name: editShift.name,
      start_time: editShift.start_time,
      end_time: editShift.end_time,
      days_of_week: editShift.days_of_week,
      planned_stops: editShift.planned_stops,
    };
    if (!IS_MOCK) {
      try {
        const updated = await shiftsApi.update(editShift.id, payload);
        setShifts((s) => s.map((x) => x.id === editShift.id ? updated : x));
      } catch {}
    } else {
      setShifts((s) => s.map((x) => x.id === editShift.id ? { ...x, ...payload } : x));
    }
    setEditShift(null);
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!IS_MOCK) {
      try { await shiftsApi.delete(id); } catch {}
    }
    setShifts((s) => s.filter((x) => x.id !== id));
  };

  const toggleDay = (dow: number, days: number[], setDays: (d: number[]) => void) => {
    setDays(days.includes(dow) ? days.filter((d) => d !== dow) : [...days, dow].sort());
  };

  const totalProdMins = shifts.reduce((sum, s) => sum + s.planned_production_time_minutes, 0);

  const ShiftForm = ({ values, onNameChange, onStartChange, onEndChange, onDayToggle, days, onSubmit, onCancel, label }:
    { values: { name: string; start_time: string; end_time: string }; onNameChange:(v:string)=>void; onStartChange:(v:string)=>void; onEndChange:(v:string)=>void; onDayToggle:(dow:number)=>void; days:number[]; onSubmit:()=>void; onCancel:()=>void; label:string }) => (
    <div className="space-y-3 p-5 bg-bg-subtle rounded-xl border border-border">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="font-mono text-2xs text-text-disabled block mb-1">Shift Name</label>
          <input
            value={values.name}
            onChange={(e) => onNameChange(e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-brand"
            placeholder="e.g. Morning Shift"
          />
        </div>
        <div>
          <label className="font-mono text-2xs text-text-disabled block mb-1">Start Time</label>
          <input
            type="time"
            value={values.start_time}
            onChange={(e) => onStartChange(e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-brand"
          />
        </div>
        <div>
          <label className="font-mono text-2xs text-text-disabled block mb-1">End Time</label>
          <input
            type="time"
            value={values.end_time}
            onChange={(e) => onEndChange(e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-brand"
          />
        </div>
      </div>
      <div>
        <label className="font-mono text-2xs text-text-disabled block mb-2">Working Days</label>
        <div className="flex gap-1">
          {DAYS_ALL.map((d, i) => {
            const dow = i + 1;
            const active = days.includes(dow);
            return (
              <button
                key={d}
                onClick={() => onDayToggle(dow)}
                className="w-8 h-8 rounded-full font-mono text-2xs font-bold transition-colors"
                style={active ? { background: T.brand, color: "#fff" } : { background: T.bgSubtle, color: T.disabled }}
              >
                {d[0]}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={onSubmit} disabled={submitting} className="px-3 py-1.5 font-mono text-xs font-bold rounded-lg disabled:opacity-50" style={{ background: T.brand, color: "#fff" }}>
          {submitting ? "Saving…" : label}
        </button>
        <button onClick={onCancel} className="px-3 py-1.5 font-mono text-xs border border-border rounded-lg text-text-secondary hover:bg-bg-subtle">Cancel</button>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <InsightBanner
        variant="warning"
        title="Shifts are critical for OEE accuracy"
        message="OEE Availability is calculated as actual production time ÷ planned production time (shifts). Without shift schedules, Availability will always show 100% and your OEE data will be misleading."
        dismissible
      />

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Shift Management</h1>
          <p className="font-mono text-xs text-text-tertiary mt-0.5">Schedules · planned stops · production targets</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-1.5 font-mono text-xs font-bold rounded-lg px-3 py-2 transition-colors"
          style={{ background: T.brand, color: "#fff" }}
        >
          <Plus size={12} /> Add Shift
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Active Shifts",   value: shifts.length.toString(),         color: T.brand },
          { label: "Running Now",     value: shifts.filter(isCurrentShift).map(s => s.name).join(", ") || "None", color: T.success },
          { label: "Planned Time",    value: `${totalProdMins}m / day`,        color: T.text },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl p-4 shadow-card">
            <p className="font-mono text-2xs text-text-disabled uppercase tracking-widest mb-2">{label}</p>
            <p className="font-mono text-lg font-black leading-tight tabular-nums" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {showAdd && (
        <ShiftForm
          values={form}
          onNameChange={(v) => setForm((f) => ({ ...f, name: v }))}
          onStartChange={(v) => setForm((f) => ({ ...f, start_time: v }))}
          onEndChange={(v) => setForm((f) => ({ ...f, end_time: v }))}
          onDayToggle={(dow) => toggleDay(dow, form.days, (d) => setForm((f) => ({ ...f, days: d })))}
          days={form.days}
          onSubmit={handleCreate}
          onCancel={() => setShowAdd(false)}
          label="Create Shift"
        />
      )}

      {loading ? (
        <div className="text-center font-mono text-xs text-text-disabled py-10">Loading shifts…</div>
      ) : (
        <div className="space-y-4">
          {shifts.map((shift) => {
            const isCurrent = isCurrentShift(shift);
            return (
              <div key={shift.id} className="bg-white rounded-xl shadow-card overflow-hidden">
                {editShift?.id === shift.id ? (
                  <div className="p-5">
                    <ShiftForm
                      values={editShift}
                      onNameChange={(v) => setEditShift((s) => s ? { ...s, name: v } : s)}
                      onStartChange={(v) => setEditShift((s) => s ? { ...s, start_time: v } : s)}
                      onEndChange={(v) => setEditShift((s) => s ? { ...s, end_time: v } : s)}
                      onDayToggle={(dow) => toggleDay(dow, editShift.days_of_week, (d) => setEditShift((s) => s ? { ...s, days_of_week: d } : s))}
                      days={editShift.days_of_week}
                      onSubmit={handleUpdate}
                      onCancel={() => setEditShift(null)}
                      label="Save Changes"
                    />
                  </div>
                ) : (
                  <>
                    <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: isCurrent ? T.brandDim : T.neutralDim }}>
                          <Clock size={15} style={{ color: isCurrent ? T.brand : T.neutral }} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-sans text-sm font-bold text-text-primary">{shift.name}</p>
                            {isCurrent && (
                              <span className="inline-flex items-center gap-1 font-mono text-2xs font-bold rounded-full px-2 py-0.5" style={{ background: T.successDim, color: T.success }}>
                                <span className="w-1 h-1 rounded-full bg-green-600 animate-ping" />
                                Running
                              </span>
                            )}
                          </div>
                          <p className="font-mono text-xs text-text-disabled">{shift.start_time} → {shift.end_time}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          {DAYS_ALL.map((d, i) => (
                            <DayPip key={d} day={d} active={shift.days_of_week.includes(i + 1)} />
                          ))}
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-sm font-black tabular-nums" style={{ color: T.brand }}>
                            {shift.planned_production_time_minutes}m
                          </p>
                          <p className="font-mono text-2xs text-text-disabled">planned / shift</p>
                        </div>
                        <button onClick={() => setEditShift(shift)} className="p-2 rounded-lg hover:bg-bg-subtle transition-colors text-text-disabled hover:text-brand">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDelete(shift.id)} className="p-2 rounded-lg hover:bg-bg-subtle transition-colors text-text-disabled hover:text-red-500">
                          <X size={14} />
                        </button>
                      </div>
                    </div>

                    {shift.planned_stops.length > 0 && (
                      <>
                        <div className="px-5 py-3 bg-bg-subtle border-b border-border">
                          <div className="relative h-5 rounded-full overflow-hidden bg-bg-muted">
                            <div className="absolute inset-0 rounded-full" style={{ background: isCurrent ? `${T.brand}10` : `${T.neutral}08` }} />
                            {shift.planned_stops.map((stop, i) => (
                              <div
                                key={i}
                                className="absolute top-1 bottom-1 rounded"
                                title={stop.name}
                                style={{
                                  left: `${Math.min(i * 25, 70)}%`,
                                  width: `${Math.max((stop.duration_minutes / 60) * 100, 1.5)}%`,
                                  background: T.warning + "80",
                                }}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="px-5 py-3">
                          <p className="font-mono text-2xs text-text-disabled uppercase tracking-widest mb-2">Planned Stops</p>
                          <div className="space-y-1.5">
                            {shift.planned_stops.map((stop, i) => (
                              <div key={i} className="flex items-center gap-3">
                                <Pause size={10} style={{ color: T.warning }} className="shrink-0" />
                                <span className="font-sans text-xs text-text-primary">{stop.name}</span>
                                <span className="font-mono text-xs text-text-disabled ml-auto">{stop.duration_minutes} min</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
