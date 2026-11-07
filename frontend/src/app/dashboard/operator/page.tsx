"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ClipboardList,
} from "lucide-react";

const T = {
  brand: "#F05230",
  brandDim: "#FEF0EB",
  success: "#1A7A40",
  successDim: "#E8F5EC",
  warning: "#A85E00",
  warningDim: "#FEF0D6",
  danger: "#CC1800",
  dangerDim: "#FDE8E4",
  neutral: "#6A8A9A",
  neutralDim: "#F0ECE8",
  border: "#E8E4DF",
  text: "#001C2E",
  muted: "#6A8A9A",
  disabled: "#B0C4CE",
  bg: "#FFFFFF",
  bgSubtle: "#FAFAF8",
  bgMuted: "#F4F0EC",
  grid: "#F0ECE8",
  axis: "#B0C4CE",
};

type TimerState = "idle" | "running" | "paused";
type MachineStatus = "Running" | "Idle" | "Fault";

interface Step {
  id: string;
  text: string;
  type: "action" | "measurement" | "checkpoint";
  unit?: string;
  target?: number;
  tolerance?: number;
  completed: boolean;
  recordedValue: string;
}

const MACHINE_STATUSES: Record<string, MachineStatus> = {
  "CNC Lathe #1": "Running",
  "Press Machine #1": "Running",
  "Welding Robot #1": "Fault",
  "QC Station #1": "Idle",
};

const MACHINE_OPS: Record<string, { opId: string; opName: string; orderId: string }> = {
  "CNC Lathe #1": { opId: "OP-020", opName: "CNC Machining — Housing", orderId: "PO-2026-11-003" },
  "Press Machine #1": { opId: "OP-030", opName: "Press Forming — Bracket", orderId: "PO-2026-11-003" },
  "Welding Robot #1": { opId: "OP-040", opName: "Welding — Subframe Assembly", orderId: "PO-2026-11-003" },
  "QC Station #1": { opId: "OP-050", opName: "Final Inspection & Stamp", orderId: "PO-2026-11-003" },
};

const INITIAL_STEPS: Step[] = [
  { id: "s1", text: "Load steel sheet LOT-SS-4412 into Press Die A-07", type: "action", completed: true, recordedValue: "" },
  { id: "s2", text: "Set press tonnage to 85 tons — confirm on press display", type: "measurement", unit: "tons", target: 85, tolerance: 2, completed: false, recordedValue: "" },
  { id: "s3", text: "Run press cycle — cycle count must increment by 1", type: "checkpoint", completed: false, recordedValue: "" },
  { id: "s4", text: "Measure bracket flange angle: target 90° ±0.5°", type: "measurement", unit: "°", target: 90, tolerance: 0.5, completed: false, recordedValue: "" },
  { id: "s5", text: "Measure spring-back: must be ≤1.5°. If >1.5° raise NCR immediately", type: "checkpoint", completed: false, recordedValue: "" },
];

const BOM_ITEMS = [
  { name: "Steel Sheet 304SS 1.5mm", lot: "LOT-SS-4412", checked: true },
  { name: "Drill Blanks", lot: "LOT-DR-7721", checked: true },
  { name: "Grease EP-2", lot: null, checked: false },
  { name: "Bolt M8×25 Grade 8.8", lot: null, checked: false },
];

function formatTime(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

function formatClock(d: Date): string {
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map((v) => String(v).padStart(2, "0"))
    .join(":");
}

function statusColor(s: MachineStatus) {
  if (s === "Running") return { bg: T.successDim, color: T.success };
  if (s === "Fault") return { bg: T.dangerDim, color: T.danger };
  return { bg: T.neutralDim, color: T.neutral };
}

function MachineIcon({ label }: { label: string }) {
  const abbr = label.split(" ").map((w) => w[0]).join("").slice(0, 3);
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
      <rect x="4" y="4" width="64" height="64" rx="10" fill={T.bgMuted} stroke={T.border} strokeWidth="2" />
      <rect x="16" y="20" width="40" height="28" rx="4" fill={T.disabled} />
      <rect x="22" y="26" width="28" height="16" rx="2" fill={T.muted} />
      <circle cx="36" cy="58" r="4" fill={T.border} />
      <text x="36" y="34" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="11" fontFamily="monospace" fontWeight="bold">{abbr}</text>
    </svg>
  );
}

export default function OperatorPage() {
  const [mode, setMode] = useState<"select" | "active">("select");
  const [selectedMachine, setSelectedMachine] = useState<string | null>(null);
  const [timerState, setTimerState] = useState<TimerState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [steps, setSteps] = useState<Step[]>(INITIAL_STEPS);
  const [clockStr, setClockStr] = useState(formatClock(new Date()));
  const [unitsProduced, setUnitsProduced] = useState("");
  const [unitsRejected, setUnitsRejected] = useState("");
  const [note, setNote] = useState("");
  const [completed, setCompleted] = useState(false);
  const [bomItems, setBomItems] = useState(BOM_ITEMS);

  useEffect(() => {
    const id = setInterval(() => setClockStr(formatClock(new Date())), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (timerState !== "running") return;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [timerState]);

  const selectMachine = (m: string) => {
    setSelectedMachine(m);
    setMode("active");
    setTimerState("idle");
    setElapsed(0);
    setSteps(INITIAL_STEPS);
    setCompleted(false);
    setUnitsProduced("");
    setUnitsRejected("");
    setNote("");
    setBomItems(BOM_ITEMS);
  };

  const goBack = () => {
    setMode("select");
    setSelectedMachine(null);
    setTimerState("idle");
    setElapsed(0);
  };

  const toggleStep = (id: string) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, completed: !s.completed } : s))
    );
  };

  const setStepValue = (id: string, val: string) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, recordedValue: val } : s))
    );
  };

  const allStepsDone = steps.every((s) => s.completed);

  const firstIncomplete = steps.find((s) => !s.completed);

  const measurementOk = (step: Step): boolean | null => {
    if (step.type !== "measurement" || step.recordedValue === "") return null;
    const v = parseFloat(step.recordedValue);
    if (isNaN(v) || step.target === undefined || step.tolerance === undefined) return null;
    return Math.abs(v - step.target) <= step.tolerance;
  };

  const op = selectedMachine ? MACHINE_OPS[selectedMachine] : null;
  const machineStatus = selectedMachine ? MACHINE_STATUSES[selectedMachine] : "Idle";

  if (mode === "select") {
    return (
      <div style={{ minHeight: "100vh", background: T.bgSubtle, fontFamily: "'IBM Plex Sans', sans-serif" }}>
        <div style={{ background: T.text, color: "white", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <span style={{ fontFamily: "'Familjen Grotesk', sans-serif", fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em" }}>
              Operator Board
            </span>
            <span style={{ color: T.disabled, marginLeft: 12, fontSize: 14 }}>Sunrise Auto Parts · Shift 2</span>
          </div>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 20, color: T.brand }}>{clockStr}</span>
        </div>

        <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px" }}>
          <h2 style={{ fontFamily: "'Familjen Grotesk', sans-serif", fontSize: 28, fontWeight: 700, color: T.text, marginBottom: 8 }}>
            Select Your Station
          </h2>
          <p style={{ color: T.muted, marginBottom: 40, fontSize: 15 }}>
            Tap the machine you are operating to begin your session.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
            {Object.keys(MACHINE_OPS).map((machine) => {
              const st = MACHINE_STATUSES[machine];
              const sc = statusColor(st);
              const machOp = MACHINE_OPS[machine];
              return (
                <button
                  key={machine}
                  onClick={() => selectMachine(machine)}
                  style={{
                    background: T.bg,
                    border: `2px solid ${T.border}`,
                    borderRadius: 16,
                    padding: "32px 28px",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "box-shadow 0.15s, border-color 0.15s",
                    display: "flex",
                    gap: 24,
                    alignItems: "flex-start",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = T.brand;
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 4px 20px rgba(240,82,48,0.12)`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = T.border;
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
                  }}
                >
                  <MachineIcon label={machine} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <span
                        style={{
                          fontFamily: "'Familjen Grotesk', sans-serif",
                          fontSize: 20,
                          fontWeight: 700,
                          color: T.text,
                        }}
                      >
                        {machine}
                      </span>
                      <span
                        style={{
                          background: sc.bg,
                          color: sc.color,
                          borderRadius: 999,
                          padding: "2px 10px",
                          fontSize: 11,
                          fontWeight: 700,
                          fontFamily: "'IBM Plex Mono', monospace",
                          letterSpacing: "0.05em",
                        }}
                      >
                        {st}
                      </span>
                    </div>
                    <div style={{ color: T.muted, fontSize: 13, marginBottom: 10 }}>Current operation</div>
                    <div
                      style={{
                        background: T.bgMuted,
                        borderRadius: 8,
                        padding: "8px 12px",
                        display: "inline-flex",
                        gap: 8,
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: 12,
                          color: T.brand,
                          fontWeight: 700,
                        }}
                      >
                        {machOp.opId}
                      </span>
                      <span style={{ color: T.text, fontSize: 13 }}>{machOp.opName}</span>
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <span
                        style={{
                          background: T.bgMuted,
                          borderRadius: 6,
                          padding: "3px 10px",
                          fontSize: 12,
                          fontFamily: "'IBM Plex Mono', monospace",
                          color: T.muted,
                        }}
                      >
                        {machOp.orderId}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: 40, textAlign: "center" }}>
            <Link
              href="/dashboard"
              style={{ color: T.muted, fontSize: 13, textDecoration: "none" }}
            >
              ← Back to Overview Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const sc = statusColor(machineStatus);
  const rejCount = parseInt(unitsRejected || "0");

  return (
    <div style={{ minHeight: "100vh", background: T.bgSubtle, display: "flex", flexDirection: "column", fontFamily: "'IBM Plex Sans', sans-serif" }}>
      {/* Top bar */}
      <div
        style={{
          background: T.text,
          color: "white",
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexShrink: 0,
        }}
      >
        <button
          onClick={goBack}
          style={{
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.2)",
            color: "rgba(255,255,255,0.8)",
            borderRadius: 8,
            padding: "6px 14px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
          }}
        >
          <ChevronLeft size={14} />
          Change Station
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontFamily: "'Familjen Grotesk', sans-serif", fontSize: 16, fontWeight: 700 }}>
            {selectedMachine}
          </span>
          <span
            style={{
              background: sc.bg,
              color: sc.color,
              borderRadius: 999,
              padding: "2px 10px",
              fontSize: 11,
              fontWeight: 700,
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            {machineStatus}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ color: T.disabled, fontSize: 13 }}>Demo User</span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 18, color: T.brand }}>{clockStr}</span>
        </div>
      </div>

      {/* Main 3-column layout */}
      <div style={{ flex: 1, display: "flex", gap: 0, minHeight: 0 }}>
        {/* Left: Order info */}
        <div
          style={{
            width: 288,
            flexShrink: 0,
            background: T.bg,
            borderRight: `1px solid ${T.border}`,
            padding: "24px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 20,
            overflowY: "auto",
          }}
        >
          <div>
            <div style={{ color: T.muted, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
              Work Order
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 22, fontWeight: 700, color: T.text, marginBottom: 4 }}>
              PO-2026-11-003
            </div>
            <div style={{ fontSize: 14, color: T.muted, marginBottom: 2 }}>AP-ENGINE-MOUNT-V2</div>
            <div style={{ fontSize: 12, color: T.disabled }}>Mahindra Automotive</div>

            <div style={{ marginTop: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: T.muted, marginBottom: 6 }}>
                <span>Progress</span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, color: T.text }}>312 / 500</span>
              </div>
              <div style={{ background: T.grid, borderRadius: 999, height: 10 }}>
                <div
                  style={{
                    background: T.brand,
                    width: "62.4%",
                    height: "100%",
                    borderRadius: 999,
                  }}
                />
              </div>
              <div style={{ textAlign: "right", fontSize: 11, color: T.muted, marginTop: 4 }}>62.4% complete</div>
            </div>
          </div>

          <div>
            <div style={{ color: T.muted, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
              BOM Checklist
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {bomItems.map((item, i) => (
                <label
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    cursor: "pointer",
                    padding: "8px 10px",
                    borderRadius: 8,
                    background: item.checked ? T.successDim : T.bgMuted,
                    border: `1px solid ${item.checked ? "#B8DFCA" : T.border}`,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() =>
                      setBomItems((prev) =>
                        prev.map((b, idx) => (idx === i ? { ...b, checked: !b.checked } : b))
                      )
                    }
                    style={{ width: 18, height: 18, marginTop: 1, accentColor: T.success }}
                  />
                  <div>
                    <div style={{ fontSize: 13, color: T.text, fontWeight: item.checked ? 500 : 400 }}>{item.name}</div>
                    {item.lot && (
                      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted }}>
                        {item.lot}
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div
            style={{
              background: T.bgMuted,
              borderRadius: 10,
              padding: "12px 14px",
              fontSize: 13,
            }}
          >
            <div style={{ fontWeight: 600, color: T.text, marginBottom: 6 }}>Shift 2</div>
            <div style={{ color: T.muted }}>16:00 – 00:00</div>
            <div style={{ color: T.muted, marginTop: 4 }}>Supervisor: Arjun Nair</div>
          </div>
        </div>

        {/* Center: Operation + Timer + Steps */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "32px 32px",
            overflowY: "auto",
          }}
        >
          {/* Operation header */}
          <div style={{ textAlign: "center", marginBottom: 24, width: "100%" }}>
            <div
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 48,
                fontWeight: 900,
                color: T.brand,
                lineHeight: 1,
                marginBottom: 8,
              }}
            >
              {op?.opId}
            </div>
            <div
              style={{
                fontFamily: "'Familjen Grotesk', sans-serif",
                fontSize: 22,
                fontWeight: 700,
                color: T.text,
                marginBottom: 4,
              }}
            >
              {op?.opName}
            </div>
            <div style={{ color: T.muted, fontSize: 14 }}>{selectedMachine}</div>
          </div>

          {/* Timer */}
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 72,
              fontWeight: 700,
              color: timerState === "paused" ? T.warning : timerState === "running" ? T.success : T.text,
              lineHeight: 1,
              marginBottom: 24,
              letterSpacing: "-0.02em",
            }}
          >
            {formatTime(elapsed)}
          </div>

          {/* Timer buttons */}
          <div style={{ display: "flex", gap: 12, marginBottom: 36 }}>
            {timerState === "idle" && (
              <button
                onClick={() => setTimerState("running")}
                style={{
                  background: T.success,
                  color: "white",
                  border: "none",
                  borderRadius: 14,
                  padding: "20px 40px",
                  fontSize: 20,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontFamily: "'Familjen Grotesk', sans-serif",
                }}
              >
                <Play size={22} /> START
              </button>
            )}
            {timerState === "running" && (
              <>
                <button
                  onClick={() => setTimerState("paused")}
                  style={{
                    background: T.warningDim,
                    color: T.warning,
                    border: `2px solid ${T.warning}`,
                    borderRadius: 14,
                    padding: "16px 32px",
                    fontSize: 18,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontFamily: "'Familjen Grotesk', sans-serif",
                  }}
                >
                  <Pause size={20} /> PAUSE
                </button>
                <button
                  onClick={() => setTimerState("paused")}
                  style={{
                    background: T.success,
                    color: "white",
                    border: "none",
                    borderRadius: 14,
                    padding: "16px 32px",
                    fontSize: 18,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "'Familjen Grotesk', sans-serif",
                  }}
                >
                  DONE
                </button>
              </>
            )}
            {timerState === "paused" && (
              <>
                <button
                  onClick={() => setTimerState("running")}
                  style={{
                    background: T.brandDim,
                    color: T.brand,
                    border: `2px solid ${T.brand}`,
                    borderRadius: 14,
                    padding: "16px 32px",
                    fontSize: 18,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontFamily: "'Familjen Grotesk', sans-serif",
                  }}
                >
                  <RotateCcw size={20} /> RESUME
                </button>
                <button
                  onClick={() => { /* done */ }}
                  style={{
                    background: T.success,
                    color: "white",
                    border: "none",
                    borderRadius: 14,
                    padding: "16px 32px",
                    fontSize: 18,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "'Familjen Grotesk', sans-serif",
                  }}
                >
                  DONE
                </button>
              </>
            )}
          </div>

          {/* Steps */}
          <div style={{ width: "100%", maxWidth: 640 }}>
            <div style={{ color: T.muted, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>
              Operation Steps — {steps.filter((s) => s.completed).length}/{steps.length} complete
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {steps.map((step, idx) => {
                const isActive = !step.completed && firstIncomplete?.id === step.id;
                const measOk = measurementOk(step);
                return (
                  <div
                    key={step.id}
                    style={{
                      background: step.completed ? T.successDim : T.bg,
                      border: `1px solid ${step.completed ? "#B8DFCA" : isActive ? T.brand : T.border}`,
                      borderLeft: `4px solid ${step.completed ? T.success : isActive ? T.brand : T.border}`,
                      borderRadius: 10,
                      padding: "12px 16px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <input
                        type="checkbox"
                        checked={step.completed}
                        onChange={() => toggleStep(step.id)}
                        style={{ width: 24, height: 24, marginTop: 2, accentColor: T.success, cursor: "pointer", flexShrink: 0 }}
                      />
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: isActive ? 15 : 14,
                            fontWeight: isActive ? 600 : 400,
                            color: step.completed ? T.success : T.text,
                            marginBottom: step.type === "measurement" ? 8 : 0,
                          }}
                        >
                          <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: T.muted, fontSize: 12, marginRight: 8 }}>
                            {String(idx + 1).padStart(2, "0")}
                          </span>
                          {step.text}
                        </div>
                        {step.type === "measurement" && !step.completed && (
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <input
                              type="number"
                              placeholder={`Enter value (${step.unit})`}
                              value={step.recordedValue}
                              onChange={(e) => setStepValue(step.id, e.target.value)}
                              style={{
                                border: `1.5px solid ${measOk === true ? T.success : measOk === false ? T.danger : T.border}`,
                                borderRadius: 6,
                                padding: "6px 10px",
                                fontSize: 14,
                                fontFamily: "'IBM Plex Mono', monospace",
                                width: 140,
                                outline: "none",
                                color: T.text,
                              }}
                            />
                            <span style={{ fontSize: 12, color: T.muted }}>
                              Target: {step.target} ±{step.tolerance} {step.unit}
                            </span>
                            {measOk === true && (
                              <span style={{ color: T.success, fontSize: 12, fontWeight: 600 }}>✓ Within spec</span>
                            )}
                            {measOk === false && (
                              <span style={{ color: T.danger, fontSize: 12, fontWeight: 600 }}>✗ Out of spec — raise NCR</span>
                            )}
                          </div>
                        )}
                        {step.type === "measurement" && step.completed && step.recordedValue && (
                          <div style={{ fontSize: 12, color: T.success, fontFamily: "'IBM Plex Mono', monospace", marginTop: 4 }}>
                            Recorded: {step.recordedValue} {step.unit}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Quality gate + Navigation + Notes */}
        <div
          style={{
            width: 288,
            flexShrink: 0,
            background: T.bg,
            borderLeft: `1px solid ${T.border}`,
            padding: "24px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 20,
            overflowY: "auto",
          }}
        >
          {/* Navigation */}
          <div>
            <div style={{ color: T.muted, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
              Operations
            </div>
            <Link
              href={`/dashboard/workorders/${op?.orderId}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 14px",
                background: T.bgMuted,
                borderRadius: 8,
                fontSize: 13,
                color: T.muted,
                textDecoration: "none",
                marginBottom: 8,
              }}
            >
              <ChevronLeft size={14} />
              <span>OP-020 · CNC Machining</span>
              <span style={{ marginLeft: "auto", fontSize: 11, color: T.success, fontWeight: 600 }}>Complete</span>
            </Link>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 14px",
                background: T.brandDim,
                border: `1px solid ${T.brand}`,
                borderRadius: 8,
                fontSize: 13,
                color: T.brand,
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              <ClipboardList size={14} />
              <span>{op?.opId} · Current</span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 14px",
                background: T.bgMuted,
                borderRadius: 8,
                fontSize: 13,
                color: T.disabled,
              }}
            >
              <span>OP-040 · Welding Assembly</span>
              <ChevronRight size={14} style={{ marginLeft: "auto" }} />
            </div>
          </div>

          {/* Quality gate */}
          {allStepsDone ? (
            <div
              style={{
                background: T.successDim,
                border: `1px solid #B8DFCA`,
                borderRadius: 10,
                padding: "16px 14px",
              }}
            >
              <div style={{ color: T.success, fontWeight: 700, fontSize: 14, marginBottom: 12 }}>
                ✓ All steps done — record output
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 12, color: T.muted, display: "block", marginBottom: 4 }}>
                  Units Produced
                </label>
                <input
                  type="number"
                  value={unitsProduced}
                  onChange={(e) => setUnitsProduced(e.target.value)}
                  placeholder="0"
                  style={{
                    border: `1px solid ${T.border}`,
                    borderRadius: 6,
                    padding: "8px 10px",
                    fontSize: 16,
                    fontFamily: "'IBM Plex Mono', monospace",
                    width: "100%",
                    outline: "none",
                  }}
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: T.muted, display: "block", marginBottom: 4 }}>
                  Rejected Units
                </label>
                <input
                  type="number"
                  value={unitsRejected}
                  onChange={(e) => setUnitsRejected(e.target.value)}
                  placeholder="0"
                  style={{
                    border: `1px solid ${rejCount > 0 ? T.danger : T.border}`,
                    borderRadius: 6,
                    padding: "8px 10px",
                    fontSize: 16,
                    fontFamily: "'IBM Plex Mono', monospace",
                    width: "100%",
                    outline: "none",
                  }}
                />
              </div>
              {rejCount > 0 && (
                <Link
                  href="/dashboard/ncm"
                  style={{
                    display: "block",
                    textAlign: "center",
                    background: T.dangerDim,
                    color: T.danger,
                    border: `1px solid ${T.danger}`,
                    borderRadius: 8,
                    padding: "8px",
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: "none",
                    marginBottom: 10,
                  }}
                >
                  <AlertTriangle size={14} style={{ display: "inline", marginRight: 6 }} />
                  Raise NCR for {rejCount} rejected unit{rejCount !== 1 ? "s" : ""}
                </Link>
              )}
              <button
                onClick={() => setCompleted(true)}
                disabled={!unitsProduced}
                style={{
                  background: unitsProduced ? T.success : T.disabled,
                  color: "white",
                  border: "none",
                  borderRadius: 10,
                  padding: "12px",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: unitsProduced ? "pointer" : "not-allowed",
                  width: "100%",
                  fontFamily: "'Familjen Grotesk', sans-serif",
                }}
              >
                {completed ? "✓ Operation Complete!" : "Confirm & Complete"}
              </button>
            </div>
          ) : (
            <div
              style={{
                background: T.bgMuted,
                borderRadius: 10,
                padding: "14px",
                fontSize: 13,
                color: T.muted,
                textAlign: "center",
              }}
            >
              Complete all {steps.length} steps to record output
            </div>
          )}

          {/* NCR Button */}
          <Link
            href="/dashboard/ncm"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "12px",
              background: T.dangerDim,
              color: T.danger,
              border: `1.5px solid ${T.danger}`,
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            <AlertTriangle size={16} />
            Raise NCR / Non-Conformance
          </Link>

          {/* Notes */}
          <div>
            <div style={{ color: T.muted, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
              Shift Note
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add shift note or observation…"
              rows={4}
              style={{
                border: `1px solid ${T.border}`,
                borderRadius: 8,
                padding: "10px 12px",
                fontSize: 13,
                width: "100%",
                resize: "vertical",
                outline: "none",
                fontFamily: "'IBM Plex Sans', sans-serif",
                color: T.text,
                background: T.bg,
              }}
            />
          </div>

          {/* EWI link */}
          <Link
            href={`/dashboard/workorders/${op?.orderId}`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "10px",
              background: T.bgMuted,
              color: T.muted,
              borderRadius: 8,
              fontSize: 13,
              textDecoration: "none",
            }}
          >
            <ClipboardList size={14} />
            View Full Work Instructions
          </Link>
        </div>
      </div>
    </div>
  );
}
