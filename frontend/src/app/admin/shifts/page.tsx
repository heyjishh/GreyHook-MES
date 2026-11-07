"use client";

import { useState } from "react";
import { Clock, Plus, Edit2, Pause } from "lucide-react";

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

interface PlannedStop { label: string; start: string; duration: string; }

interface Shift {
  id: number;
  name: string;
  start: string;
  end: string;
  days: string[];
  targetParts: number;
  active: boolean;
  current: boolean;
  plannedStops: PlannedStop[];
}

const SHIFTS: Shift[] = [
  {
    id: 1, name: "Shift 1", start: "08:00", end: "16:00", days: ["Mon","Tue","Wed","Thu","Fri"],
    targetParts: 1040, active: true, current: false,
    plannedStops: [
      { label: "Lunch Break",    start: "12:00", duration: "30 min" },
      { label: "Tea Break",      start: "10:30", duration: "10 min" },
    ],
  },
  {
    id: 2, name: "Shift 2", start: "16:00", end: "00:00", days: ["Mon","Tue","Wed","Thu","Fri"],
    targetParts: 980, active: true, current: true,
    plannedStops: [
      { label: "Dinner Break",   start: "19:00", duration: "30 min" },
      { label: "Changeover",     start: "22:00", duration: "20 min" },
    ],
  },
  {
    id: 3, name: "Shift 3 (Night)", start: "00:00", end: "08:00", days: ["Mon","Tue","Wed","Thu","Fri"],
    targetParts: 820, active: true, current: false,
    plannedStops: [
      { label: "Break",          start: "04:00", duration: "15 min" },
    ],
  },
];

const DAYS_ALL = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

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
  const [shifts] = useState(SHIFTS);
  const totalTarget = shifts.filter(s => s.active).reduce((sum, s) => sum + s.targetParts, 0);

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Shift Management</h1>
          <p className="font-mono text-xs text-text-tertiary mt-0.5">Schedules · planned stops · production targets</p>
        </div>
        <button
          className="inline-flex items-center gap-1.5 font-mono text-xs font-bold rounded-lg px-3 py-2 transition-colors"
          style={{ background: T.brand, color: "#fff" }}
        >
          <Plus size={12} /> Add Shift
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Active Shifts",   value: shifts.filter(s => s.active).length.toString(),       color: T.brand },
          { label: "Running Now",     value: shifts.filter(s => s.current).map(s => s.name).join(", ") || "None", color: T.success },
          { label: "Daily Target",    value: totalTarget.toLocaleString() + " pts",                 color: T.text },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl p-4 shadow-card">
            <p className="font-mono text-2xs text-text-disabled uppercase tracking-widest mb-2">{label}</p>
            <p className="font-mono text-lg font-black leading-tight tabular-nums" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Shift cards */}
      <div className="space-y-4">
        {shifts.map((shift) => (
          <div key={shift.id} className="bg-white rounded-xl shadow-card overflow-hidden">

            {/* Shift header */}
            <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: shift.current ? T.brandDim : T.neutralDim }}
                >
                  <Clock size={15} style={{ color: shift.current ? T.brand : T.neutral }} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-sans text-sm font-bold text-text-primary">{shift.name}</p>
                    {shift.current && (
                      <span
                        className="inline-flex items-center gap-1 font-mono text-2xs font-bold rounded-full px-2 py-0.5"
                        style={{ background: T.successDim, color: T.success }}
                      >
                        <span className="w-1 h-1 rounded-full bg-success animate-ping" />
                        Running
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-xs text-text-disabled">{shift.start} → {shift.end} IST</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  {DAYS_ALL.map((d) => (
                    <DayPip key={d} day={d} active={shift.days.includes(d)} />
                  ))}
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm font-black tabular-nums" style={{ color: T.brand }}>
                    {shift.targetParts.toLocaleString()}
                  </p>
                  <p className="font-mono text-2xs text-text-disabled">target / shift</p>
                </div>
                <button className="p-2 rounded-lg hover:bg-bg-subtle transition-colors text-text-disabled hover:text-brand">
                  <Edit2 size={14} />
                </button>
              </div>
            </div>

            {/* Timeline bar */}
            <div className="px-5 py-3 bg-bg-subtle border-b border-border">
              <div className="relative h-5 rounded-full overflow-hidden bg-bg-muted">
                {/* Shift span */}
                <div
                  className="absolute top-0 bottom-0 rounded-full"
                  style={{
                    left: "0%", right: "0%",
                    background: shift.current
                      ? `linear-gradient(90deg, ${T.brand}20, ${T.brand}10)`
                      : `${T.neutral}10`,
                  }}
                />
                {/* Planned stops */}
                {shift.plannedStops.map((stop, i) => {
                  const startH = parseInt(stop.start.split(":")[0]);
                  const shiftStartH = parseInt(shift.start.split(":")[0]);
                  const shiftEndH   = parseInt(shift.end.split(":")[0]) || 24;
                  const shiftLen    = shiftEndH - shiftStartH;
                  const stopOffset  = ((startH - shiftStartH + 24) % 24) / shiftLen * 100;
                  const stopWidth   = (parseInt(stop.duration) / (shiftLen * 60)) * 100;
                  return (
                    <div
                      key={i}
                      className="absolute top-1 bottom-1 rounded"
                      title={stop.label}
                      style={{
                        left: `${Math.min(stopOffset, 95)}%`,
                        width: `${Math.max(stopWidth, 1.5)}%`,
                        background: T.warning + "80",
                      }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Planned stops table */}
            {shift.plannedStops.length > 0 && (
              <div className="px-5 py-3">
                <p className="font-mono text-2xs text-text-disabled uppercase tracking-widest mb-2">Planned Stops</p>
                <div className="space-y-1.5">
                  {shift.plannedStops.map((stop, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Pause size={10} style={{ color: T.warning }} className="shrink-0" />
                      <span className="font-mono text-xs text-text-secondary">{stop.start}</span>
                      <span className="font-sans text-xs text-text-primary">{stop.label}</span>
                      <span className="font-mono text-xs text-text-disabled ml-auto">{stop.duration}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
