"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Circle, Clock, ChevronLeft, ChevronRight, AlertTriangle, Camera, Ruler, ThumbsUp, ThumbsDown, Play, Pause, RotateCcw } from "lucide-react";

const T = {
  brand:     "#F05230",
  brandDim:  "#FEF0EB",
  success:   "#1A7A40",
  successDim:"#E8F5EC",
  warning:   "#A85E00",
  warningDim:"#FEF0D6",
  danger:    "#CC1800",
  dangerDim: "#FDE8E4",
  neutral:   "#6A8A9A",
  neutralDim:"#F0ECE8",
  border:    "#E8E4DF",
  text:      "#001C2E",
  muted:     "#6A8A9A",
  disabled:  "#B0C4CE",
  bg:        "#FFFFFF",
  bgSubtle:  "#FAFAF8",
  bgMuted:   "#F4F0EC",
  grid:      "#F0ECE8",
  axis:      "#B0C4CE",
};

type StepStatus = "not_started" | "in_progress" | "complete" | "failed";
type ParamType = "number" | "text" | "pass_fail";

interface StepParam {
  id: string;
  label: string;
  type: ParamType;
  unit?: string;
  min?: number;
  max?: number;
  nominal?: number;
  value?: string | number;
  result?: "pass" | "fail";
}

interface SubStep {
  id: string;
  text: string;
  checked: boolean;
  critical?: boolean;
}

interface WorkStep {
  id: string;
  stepNo: number;
  operationName: string;
  machine: string;
  description: string;
  estimatedMinutes: number;
  status: StepStatus;
  subSteps: SubStep[];
  params: StepParam[];
  toolsRequired?: string[];
  safetyNotes?: string[];
  actualMinutes?: number;
  startedAt?: string;
  completedAt?: string;
}

const MOCK_ORDERS: Record<string, { orderNo: string; product: string; plannedQty: number; operations: WorkStep[] }> = {
  "PO-2026-11-001": {
    orderNo: "PO-2026-11-001",
    product: "AP-ENGINE-MOUNT-V2",
    plannedQty: 500,
    operations: [
      {
        id: "op-001",
        stepNo: 1,
        operationName: "Raw Material Incoming Inspection",
        machine: "QC Station #1",
        description: "Verify incoming aluminium billets and steel sheets against COC and specification. Reject any non-conforming material.",
        estimatedMinutes: 15,
        status: "complete",
        completedAt: "2026-11-06T07:30:00Z",
        actualMinutes: 13,
        subSteps: [
          { id: "ss-001-1", text: "Check COC document matches PO number", checked: true, critical: true },
          { id: "ss-001-2", text: "Measure billet diameter — accept 80±0.5mm", checked: true },
          { id: "ss-001-3", text: "Verify hardness with portable Rockwell tester", checked: true, critical: true },
          { id: "ss-001-4", text: "Visual inspection — no visible cracks or seams", checked: true },
          { id: "ss-001-5", text: "Record lot number in traceability log", checked: true, critical: true },
        ],
        params: [
          { id: "p-001-1", label: "Billet Diameter", type: "number", unit: "mm", min: 79.5, max: 80.5, nominal: 80, value: 80.1, result: "pass" },
          { id: "p-001-2", label: "Hardness", type: "number", unit: "HRC", min: 52, max: 56, nominal: 54, value: 53, result: "pass" },
          { id: "p-001-3", label: "COC Verified", type: "pass_fail", result: "pass" },
        ],
        toolsRequired: ["Portable Rockwell tester", "Vernier calliper 0–150mm", "COC checklist form"],
        safetyNotes: ["Wear cut-resistant gloves when handling billets", "Sharp edges on steel sheet — use handling hooks"],
      },
      {
        id: "op-002",
        stepNo: 2,
        operationName: "CNC Rough Turn + Bore",
        machine: "CNC Lathe #1",
        description: "Load billet, run NC program ENG-V2-ROUGH-01. Achieve rough bore to 40.5mm with 0.5mm finishing allowance. First-off inspection mandatory.",
        estimatedMinutes: 25,
        status: "complete",
        completedAt: "2026-11-06T09:20:00Z",
        actualMinutes: 24,
        subSteps: [
          { id: "ss-002-1", text: "Mount billet in 3-jaw chuck — check runout < 0.05mm", checked: true, critical: true },
          { id: "ss-002-2", text: "Load NC program ENG-V2-ROUGH-01 from tool crib", checked: true, critical: true },
          { id: "ss-002-3", text: "Set tool offsets T01, T02, T03", checked: true },
          { id: "ss-002-4", text: "Run dry cycle — confirm no interference", checked: true, critical: true },
          { id: "ss-002-5", text: "Machine first-off — STOP for first-off inspection before batch", checked: true, critical: true },
          { id: "ss-002-6", text: "First-off passed — run remaining batch quantity", checked: true },
        ],
        params: [
          { id: "p-002-1", label: "Rough Bore Dia (target 40.5mm)", type: "number", unit: "mm", min: 40.3, max: 40.7, nominal: 40.5, value: 40.5, result: "pass" },
          { id: "p-002-2", label: "Face Length (target 65mm)", type: "number", unit: "mm", min: 64.8, max: 65.2, nominal: 65, value: 65.0, result: "pass" },
          { id: "p-002-3", label: "Runout check", type: "pass_fail", result: "pass" },
        ],
        toolsRequired: ["T01 CNMG insert rough turn", "T02 boring bar", "Internal bore gauge 40–50mm", "Dial test indicator"],
        safetyNotes: ["Machine guard must be fully closed before cycle start", "No chips to be cleared by hand — use hook"],
      },
      {
        id: "op-003",
        stepNo: 3,
        operationName: "CNC Finish Turn + Final Bore",
        machine: "CNC Lathe #1",
        description: "Finish bore to 41.5±0.02mm. Surface finish Ra ≤ 0.8μm on bore surface. First-off inspection mandatory. Report any out-of-spec immediately.",
        estimatedMinutes: 20,
        status: "in_progress",
        startedAt: "2026-11-06T09:30:00Z",
        subSteps: [
          { id: "ss-003-1", text: "Load NC program ENG-V2-FINISH-01", checked: true, critical: true },
          { id: "ss-003-2", text: "Replace finish boring insert T04 (check tool life — max 50 pcs)", checked: true, critical: true },
          { id: "ss-003-3", text: "Machine first-off", checked: true },
          { id: "ss-003-4", text: "Measure bore with air gauge — 41.5±0.02mm", checked: false, critical: true },
          { id: "ss-003-5", text: "Measure Ra with profilometer — target ≤ 0.8μm", checked: false },
          { id: "ss-003-6", text: "Complete batch after first-off approval", checked: false },
        ],
        params: [
          { id: "p-003-1", label: "Finish Bore Dia (target 41.5mm)", type: "number", unit: "mm", min: 41.48, max: 41.52, nominal: 41.5 },
          { id: "p-003-2", label: "Surface Roughness Ra", type: "number", unit: "μm", min: 0, max: 0.8, nominal: 0.6 },
          { id: "p-003-3", label: "Roundness", type: "number", unit: "μm", min: 0, max: 5, nominal: 2 },
        ],
        toolsRequired: ["T04 PCD finish boring insert", "Air gauge bore measuring set 41–42mm", "Surface roughness profilometer"],
        safetyNotes: ["PCD insert is sharp — handle with care", "Coolant must be on during finish cut"],
      },
      {
        id: "op-004",
        stepNo: 4,
        operationName: "Weld Subframe Assembly",
        machine: "Welding Robot #1",
        description: "MIG weld steel subframe halves per drawing ENG-MNT-V2-WD-04. Preheat to 80°C. Post-weld visual and dimensional inspection.",
        estimatedMinutes: 35,
        status: "not_started",
        subSteps: [
          { id: "ss-004-1", text: "Preheat subframe halves to 80°C minimum", checked: false, critical: true },
          { id: "ss-004-2", text: "Load weld program WELD-ENG-V2-04 and verify wire feed rate", checked: false, critical: true },
          { id: "ss-004-3", text: "Clamp in fixture — check squareness < 0.5mm", checked: false, critical: true },
          { id: "ss-004-4", text: "Execute weld sequence — 4 passes", checked: false },
          { id: "ss-004-5", text: "Post-weld cooldown 5 min — do not force cool", checked: false },
          { id: "ss-004-6", text: "Visual inspection — no porosity, undercut, or cracking", checked: false, critical: true },
          { id: "ss-004-7", text: "Measure squareness — accept < 0.8mm", checked: false, critical: true },
        ],
        params: [
          { id: "p-004-1", label: "Preheat Temp", type: "number", unit: "°C", min: 80, max: 120, nominal: 90 },
          { id: "p-004-2", label: "Post-weld Squareness", type: "number", unit: "mm", min: 0, max: 0.8, nominal: 0.4 },
          { id: "p-004-3", label: "Visual Inspection", type: "pass_fail" },
        ],
        toolsRequired: ["Pyrometer temperature gun", "Squareness fixture gauge", "Weld inspection mirror"],
        safetyNotes: ["Full PPE required — welding helmet, leather gloves, apron", "Fume extraction must be on", "HOT PARTS — do not touch without heat-resistant gloves after welding"],
      },
      {
        id: "op-005",
        stepNo: 5,
        operationName: "Final Assembly & Inspection",
        machine: "QC Station #1",
        description: "Press-fit machined housing into welded subframe. Final CMM inspection. Stamp serial number. Pack per work instruction ENG-V2-PKG-01.",
        estimatedMinutes: 20,
        status: "not_started",
        subSteps: [
          { id: "ss-005-1", text: "Press-fit housing — force 2.5–4.0 kN", checked: false, critical: true },
          { id: "ss-005-2", text: "Verify flush height 0±0.3mm", checked: false, critical: true },
          { id: "ss-005-3", text: "CMM inspection — 12 critical dimensions", checked: false, critical: true },
          { id: "ss-005-4", text: "Stamp serial number on part (inkjet coder)", checked: false, critical: true },
          { id: "ss-005-5", text: "Apply rust inhibitor coating — spray 2 passes", checked: false },
          { id: "ss-005-6", text: "Pack per ENG-V2-PKG-01 — 1 part per bag, label with PO#", checked: false },
        ],
        params: [
          { id: "p-005-1", label: "Press-fit Force", type: "number", unit: "kN", min: 2.5, max: 4.0, nominal: 3.2 },
          { id: "p-005-2", label: "Flush Height", type: "number", unit: "mm", min: -0.3, max: 0.3, nominal: 0 },
          { id: "p-005-3", label: "CMM Inspection", type: "pass_fail" },
          { id: "p-005-4", label: "Serial Number Applied", type: "pass_fail" },
        ],
        toolsRequired: ["Bench press 10kN with load cell", "CMM Hexagon GLOBAL Classic", "Inkjet coder"],
        safetyNotes: ["Press operation — keep hands clear of press area", "CMM — do not enter measuring volume during probe cycle"],
      },
    ],
  },
};

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function WorkInstructionsPage() {
  const params = useParams();
  const orderId = Array.isArray(params.orderId) ? params.orderId[0] : (params.orderId ?? "PO-2026-11-001");
  const orderData = MOCK_ORDERS[orderId] ?? MOCK_ORDERS["PO-2026-11-001"];

  const [operations, setOperations] = useState<WorkStep[]>(orderData.operations);
  const [activeOpIndex, setActiveOpIndex] = useState(() => {
    const inProg = orderData.operations.findIndex(o => o.status === "in_progress");
    return inProg >= 0 ? inProg : orderData.operations.findIndex(o => o.status === "not_started");
  });
  const [paramValues, setParamValues] = useState<Record<string, string | number>>({});
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => setTimerSeconds(s => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerRunning]);

  const activeOp = operations[activeOpIndex];

  function toggleSubStep(opIdx: number, ssId: string) {
    setOperations(prev => prev.map((op, i) => {
      if (i !== opIdx) return op;
      return { ...op, subSteps: op.subSteps.map(ss => ss.id === ssId ? { ...ss, checked: !ss.checked } : ss) };
    }));
  }

  function setParamResult(opIdx: number, paramId: string, result: "pass" | "fail") {
    setOperations(prev => prev.map((op, i) => {
      if (i !== opIdx) return op;
      return { ...op, params: op.params.map(p => p.id === paramId ? { ...p, result } : p) };
    }));
  }

  function completeStep(opIdx: number) {
    setOperations(prev => prev.map((op, i) => {
      if (i !== opIdx) return op;
      return { ...op, status: "complete", completedAt: new Date().toISOString(), actualMinutes: Math.ceil(timerSeconds / 60) || op.estimatedMinutes };
    }));
    setTimerRunning(false);
    setTimerSeconds(0);
    if (opIdx + 1 < operations.length) {
      setActiveOpIndex(opIdx + 1);
    }
  }

  function startStep(opIdx: number) {
    setOperations(prev => prev.map((op, i) => {
      if (i !== opIdx) return op;
      return { ...op, status: "in_progress", startedAt: new Date().toISOString() };
    }));
    setTimerRunning(true);
    setTimerSeconds(0);
  }

  const completedCount = operations.filter(o => o.status === "complete").length;
  const totalOps = operations.length;
  const progressPct = Math.round((completedCount / totalOps) * 100);

  const checkedCount = activeOp?.subSteps.filter(s => s.checked).length ?? 0;
  const totalSubSteps = activeOp?.subSteps.length ?? 0;
  const criticalUnchecked = activeOp?.subSteps.filter(s => s.critical && !s.checked) ?? [];
  const canComplete = criticalUnchecked.length === 0 && activeOp?.status !== "complete";

  return (
    <div style={{ background: T.bgSubtle, minHeight: "100vh" }} className="p-6 font-sans">

      <div className="flex items-start gap-4 mb-5">
        <Link href="/dashboard/workorders" style={{ color: T.muted, display: "flex", alignItems: "center", gap: 4, fontSize: 12, textDecoration: "none", paddingTop: 4 }}>
          <ChevronLeft size={14} /> Work Orders
        </Link>
        <div style={{ flex: 1 }}>
          <h1 style={{ color: T.text, fontFamily: "Familjen Grotesk, sans-serif", fontSize: 22 }} className="font-bold">Electronic Work Instructions</h1>
          <p style={{ color: T.muted, fontSize: 13 }} className="mt-0.5">
            <span style={{ fontFamily: "IBM Plex Mono", color: T.text, fontWeight: 600 }}>{orderData.orderNo}</span>
            {" · "}{orderData.product}{" · "}{orderData.plannedQty} pcs
          </p>
        </div>
        <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 14px", textAlign: "center", minWidth: 90 }}>
          <p style={{ color: T.muted, fontSize: 10, letterSpacing: "0.06em" }} className="uppercase font-medium">Progress</p>
          <p style={{ color: T.brand, fontSize: 20 }} className="font-mono font-black">{progressPct}%</p>
          <p style={{ color: T.muted, fontSize: 10 }}>{completedCount}/{totalOps} ops</p>
        </div>
      </div>

      <div style={{ background: T.bg, borderRadius: 6, height: 6, overflow: "hidden", border: `1px solid ${T.border}`, marginBottom: 20 }}>
        <div style={{ width: `${progressPct}%`, height: "100%", background: progressPct === 100 ? T.success : T.brand, transition: "width 0.4s ease", borderRadius: 6 }} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">

        <div className="lg:col-span-1">
          <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12 }} className="shadow-sm overflow-hidden">
            <div style={{ padding: "12px 14px", borderBottom: `1px solid ${T.border}` }}>
              <p style={{ color: T.muted, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}>Operations</p>
            </div>
            {operations.map((op, i) => {
              const isActive = i === activeOpIndex;
              const statusIcon = op.status === "complete" ? <CheckCircle2 size={14} style={{ color: T.success, flexShrink: 0 }} /> :
                op.status === "in_progress" ? <div style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${T.brand}`, flexShrink: 0 }} /> :
                <Circle size={14} style={{ color: T.disabled, flexShrink: 0 }} />;
              return (
                <button key={op.id} onClick={() => setActiveOpIndex(i)}
                  style={{ width: "100%", textAlign: "left", padding: "10px 14px", borderBottom: `1px solid ${T.grid}`, background: isActive ? T.bgMuted : "transparent", border: "none", borderBottomStyle: "solid", display: "flex", alignItems: "center", gap: 8 }}>
                  {statusIcon}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: isActive ? T.text : T.muted, fontSize: 11, fontWeight: isActive ? 700 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {op.stepNo}. {op.operationName}
                    </p>
                    <p style={{ color: T.disabled, fontSize: 10 }}>{op.machine} · {op.estimatedMinutes}min</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-3 space-y-4">

          {activeOp && (
            <>
              <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12 }} className="p-5 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span style={{ background: T.bgMuted, color: T.text, borderRadius: 4, padding: "2px 7px", fontSize: 11, fontFamily: "IBM Plex Mono", fontWeight: 600 }}>Step {activeOp.stepNo}</span>
                      <span style={{ background: activeOp.status === "complete" ? T.successDim : activeOp.status === "in_progress" ? T.warningDim : T.neutralDim, color: activeOp.status === "complete" ? T.success : activeOp.status === "in_progress" ? T.warning : T.neutral, borderRadius: 4, padding: "2px 7px", fontSize: 10, fontWeight: 600, textTransform: "uppercase" }}>
                        {activeOp.status.replace("_", " ")}
                      </span>
                    </div>
                    <h2 style={{ color: T.text, fontSize: 18, fontFamily: "Familjen Grotesk, sans-serif", fontWeight: 700, marginBottom: 2 }}>{activeOp.operationName}</h2>
                    <p style={{ color: T.muted, fontSize: 12 }}>{activeOp.machine} · Est. {activeOp.estimatedMinutes} min</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontFamily: "IBM Plex Mono", fontSize: 28, fontWeight: 900, color: timerRunning ? T.brand : T.text, letterSpacing: "0.05em" }}>{formatDuration(timerSeconds)}</p>
                    <div className="flex gap-2 justify-end mt-1">
                      {activeOp.status === "not_started" && (
                        <button onClick={() => startStep(activeOpIndex)}
                          style={{ background: T.brand, color: "#fff", borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 600, border: "none", display: "flex", alignItems: "center", gap: 4 }}>
                          <Play size={12} /> Start
                        </button>
                      )}
                      {activeOp.status === "in_progress" && (
                        <button onClick={() => setTimerRunning(r => !r)}
                          style={{ background: timerRunning ? T.warningDim : T.successDim, color: timerRunning ? T.warning : T.success, borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 600, border: "none", display: "flex", alignItems: "center", gap: 4 }}>
                          {timerRunning ? <><Pause size={12} /> Pause</> : <><Play size={12} /> Resume</>}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <p style={{ color: T.text, fontSize: 13, lineHeight: 1.6, background: T.bgMuted, borderRadius: 8, padding: "10px 14px", marginBottom: 16 }}>{activeOp.description}</p>

                {activeOp.safetyNotes && activeOp.safetyNotes.length > 0 && (
                  <div style={{ background: T.warningDim, border: `1px solid ${T.warning}30`, borderRadius: 8, padding: "10px 14px", marginBottom: 16 }}>
                    <p style={{ color: T.warning, fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", marginBottom: 4 }}>⚠ SAFETY</p>
                    {activeOp.safetyNotes.map((note, i) => (
                      <p key={i} style={{ color: T.warning, fontSize: 12, marginBottom: 2 }}>• {note}</p>
                    ))}
                  </div>
                )}

                {activeOp.toolsRequired && activeOp.toolsRequired.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span style={{ color: T.muted, fontSize: 11, fontWeight: 600, marginRight: 2 }}>Tools:</span>
                    {activeOp.toolsRequired.map(t => (
                      <span key={t} style={{ background: T.bgMuted, color: T.text, border: `1px solid ${T.border}`, borderRadius: 4, padding: "2px 8px", fontSize: 11 }}>{t}</span>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12 }} className="p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <p style={{ color: T.text, fontSize: 14, fontWeight: 600, fontFamily: "Familjen Grotesk, sans-serif" }}>Step Checklist</p>
                  <span style={{ color: checkedCount === totalSubSteps ? T.success : T.muted, fontSize: 12, fontFamily: "IBM Plex Mono" }}>{checkedCount}/{totalSubSteps}</span>
                </div>
                <div className="space-y-2">
                  {activeOp.subSteps.map((ss, si) => (
                    <label key={ss.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: activeOp.status === "complete" ? "default" : "pointer", padding: "8px 10px", borderRadius: 7, background: ss.checked ? T.successDim : T.bgSubtle, border: `1px solid ${ss.checked ? T.success + "30" : T.border}`, transition: "all 0.15s" }}>
                      <input type="checkbox" checked={ss.checked} onChange={() => activeOp.status !== "complete" && toggleSubStep(activeOpIndex, ss.id)} style={{ marginTop: 1, accentColor: T.success, width: 15, height: 15, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <span style={{ color: ss.checked ? T.success : T.text, fontSize: 13, textDecoration: ss.checked ? "line-through" : "none" }}>{ss.text}</span>
                        {ss.critical && <span style={{ background: T.dangerDim, color: T.danger, borderRadius: 3, padding: "1px 5px", fontSize: 9, fontWeight: 700, marginLeft: 6, verticalAlign: "middle" }}>CRITICAL</span>}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12 }} className="p-5 shadow-sm">
                <p style={{ color: T.text, fontSize: 14, fontWeight: 600, fontFamily: "Familjen Grotesk, sans-serif", marginBottom: 12 }}>Parameter Collection</p>
                <div className="space-y-3">
                  {activeOp.params.map(param => (
                    <div key={param.id} style={{ background: T.bgSubtle, borderRadius: 8, padding: "10px 14px", border: `1px solid ${param.result === "pass" ? T.success + "30" : param.result === "fail" ? T.danger + "30" : T.border}` }}>
                      <div className="flex items-center justify-between gap-3">
                        <div style={{ flex: 1 }}>
                          <p style={{ color: T.text, fontSize: 13, fontWeight: 600 }}>{param.label}</p>
                          {param.type === "number" && param.min !== undefined && (
                            <p style={{ color: T.muted, fontSize: 10 }}>Spec: {param.min} – {param.max} {param.unit ?? ""}{param.nominal !== undefined ? ` (nominal ${param.nominal})` : ""}</p>
                          )}
                        </div>
                        {param.type === "pass_fail" ? (
                          <div className="flex gap-2">
                            <button onClick={() => setParamResult(activeOpIndex, param.id, "pass")}
                              style={{ background: param.result === "pass" ? T.successDim : T.bgMuted, color: param.result === "pass" ? T.success : T.muted, border: `1px solid ${param.result === "pass" ? T.success : T.border}`, borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                              <ThumbsUp size={12} /> PASS
                            </button>
                            <button onClick={() => setParamResult(activeOpIndex, param.id, "fail")}
                              style={{ background: param.result === "fail" ? T.dangerDim : T.bgMuted, color: param.result === "fail" ? T.danger : T.muted, border: `1px solid ${param.result === "fail" ? T.danger : T.border}`, borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                              <ThumbsDown size={12} /> FAIL
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              defaultValue={param.value as number ?? ""}
                              placeholder="Enter value"
                              style={{ width: 90, border: `1px solid ${T.border}`, borderRadius: 6, padding: "5px 8px", fontSize: 13, fontFamily: "IBM Plex Mono", textAlign: "right", color: T.text, background: T.bg }}
                            />
                            <span style={{ color: T.muted, fontSize: 11 }}>{param.unit ?? ""}</span>
                            {param.result && (
                              <span style={{ background: param.result === "pass" ? T.successDim : T.dangerDim, color: param.result === "pass" ? T.success : T.danger, borderRadius: 4, padding: "2px 7px", fontSize: 10, fontWeight: 700 }}>{param.result.toUpperCase()}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {criticalUnchecked.length > 0 && activeOp.status === "in_progress" && (
                <div style={{ background: T.dangerDim, border: `1px solid ${T.danger}30`, borderRadius: 8, padding: "10px 14px" }}>
                  <p style={{ color: T.danger, fontSize: 12, fontWeight: 600 }}>⚠ {criticalUnchecked.length} critical step{criticalUnchecked.length > 1 ? "s" : ""} not checked — cannot complete operation</p>
                </div>
              )}

              {activeOp.status !== "complete" && (
                <div className="flex gap-3 justify-end">
                  {activeOpIndex > 0 && (
                    <button onClick={() => setActiveOpIndex(i => i - 1)}
                      style={{ background: T.bgMuted, color: T.text, border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 600 }}>
                      ← Previous
                    </button>
                  )}
                  <button onClick={() => canComplete && completeStep(activeOpIndex)}
                    disabled={!canComplete}
                    style={{ background: canComplete ? T.success : T.disabled, color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 600, cursor: canComplete ? "pointer" : "not-allowed" }}>
                    Complete Step ✓
                  </button>
                </div>
              )}

              {activeOp.status === "complete" && (
                <div style={{ background: T.successDim, border: `1px solid ${T.success}30`, borderRadius: 10, padding: "14px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                  <CheckCircle2 size={18} style={{ color: T.success }} />
                  <div>
                    <p style={{ color: T.success, fontSize: 13, fontWeight: 700 }}>Step Complete</p>
                    {activeOp.completedAt && <p style={{ color: T.success, fontSize: 11 }}>Completed at {new Date(activeOp.completedAt).toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit" })} · Actual: {activeOp.actualMinutes}min</p>}
                  </div>
                  {activeOpIndex < operations.length - 1 && (
                    <button onClick={() => setActiveOpIndex(i => i + 1)}
                      style={{ marginLeft: "auto", background: T.brand, color: "#fff", border: "none", borderRadius: 6, padding: "7px 14px", fontSize: 12, fontWeight: 600 }}>
                      Next Step →
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
