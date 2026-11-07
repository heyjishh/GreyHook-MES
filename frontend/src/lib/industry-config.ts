export type IndustryId =
  | "automotive"
  | "pharmaceutical"
  | "electronics"
  | "textile"
  | "food_beverage"
  | "aerospace"
  | "chemical"
  | "plastics";

export interface IndustryMachine {
  id: string;
  name: string;
  state: "running" | "idle" | "fault" | "setup";
  oee: number;
  currentOp: string;
  partsThisShift: number;
  targetThisShift: number;
  unit: string;
}

export interface IndustryInsight {
  level: "critical" | "warning" | "ok";
  title: string;
  body: string;
}

export interface IndustryKpi {
  label: string;
  value: string;
  sub: string;
  trend: "up" | "down" | "flat";
  trendGood: "up" | "down";
}

export interface IndustryConfig {
  id: IndustryId;
  name: string;
  tagline: string;
  emoji: string;
  color: string;
  colorDim: string;
  factoryName: string;
  standards: string[];
  term: {
    workOrder: string;
    product: string;
    machine: string;
    lot: string;
    shift: string;
    output: string;
    quality: string;
  };
  kpis: IndustryKpi[];
  activeOrder: {
    orderNo: string;
    product: string;
    actual: number;
    planned: number;
    unit: string;
    elapsedPct: number;
    rejectedPct: number;
    estimatedDone: string;
  };
  machines: IndustryMachine[];
  insights: IndustryInsight[];
  oeeTarget: number;
}

export const INDUSTRY_CONFIGS: Record<IndustryId, IndustryConfig> = {
  automotive: {
    id: "automotive",
    name: "Automotive",
    tagline: "Discrete manufacturing · IATF 16949 · OEE-driven",
    emoji: "🚗",
    color: "#F05230",
    colorDim: "#FEF0EB",
    factoryName: "Sunrise Auto Parts Ltd",
    standards: ["IATF 16949", "APQP / PPAP", "MSA", "ISO 14001"],
    oeeTarget: 85,
    term: { workOrder: "Work Order", product: "Part", machine: "Machine", lot: "Lot", shift: "Shift", output: "pcs", quality: "Quality Check" },
    kpis: [
      { label: "Floor OEE",    value: "72.4%", sub: "Target 85%",            trend: "up",   trendGood: "up" },
      { label: "Machines",     value: "3 / 4", sub: "1 in fault",            trend: "flat", trendGood: "up" },
      { label: "Parts Today",  value: "563",   sub: "Target 640 pcs",        trend: "up",   trendGood: "up" },
      { label: "Open Alarms",  value: "1",     sub: "M-02 spindle fault",    trend: "down", trendGood: "down" },
    ],
    activeOrder: { orderNo: "WO-2026-0441", product: "Brake Disc BD-700", actual: 410, planned: 560, unit: "pcs", elapsedPct: 0.73, rejectedPct: 0.012, estimatedDone: "14:40" },
    machines: [
      { id: "m1", name: "CNC Lathe #1",      state: "running", oee: 77, currentOp: "Turning OD ø42", partsThisShift: 142, targetThisShift: 160, unit: "pcs" },
      { id: "m2", name: "CNC Lathe #2",      state: "fault",   oee: 0,  currentOp: "Spindle fault",  partsThisShift: 78,  targetThisShift: 160, unit: "pcs" },
      { id: "m3", name: "Boring Centre",     state: "setup",   oee: 0,  currentOp: "Changeover",     partsThisShift: 50,  targetThisShift: 100, unit: "pcs" },
      { id: "m4", name: "50T Hydraulic Press",state: "running", oee: 87, currentOp: "Pressing Hub",   partsThisShift: 310, targetThisShift: 320, unit: "pcs" },
    ],
    insights: [
      { level: "critical", title: "CNC Lathe #2 halted — spindle drive fault",        body: "Machine has been down for 14 min. Escalated to L2 maintenance. Estimated recovery: 45 min. Reroute remaining 82 pcs to CNC Lathe #1 or schedule overtime." },
      { level: "warning",  title: "Shift pace behind — 150 pcs deficit",              body: "At 77 pcs/hr, the shift closes at 563 vs 640 target. Recommend authorising 1h overtime or rescheduling 100 pcs to Shift 3." },
      { level: "ok",       title: "50T Press running above target",                   body: "87% OEE, 310 pcs produced. Capacity available to absorb 60 extra assemblies from rescheduled lot." },
    ],
  },

  pharmaceutical: {
    id: "pharmaceutical",
    name: "Pharmaceutical",
    tagline: "Batch manufacturing · GMP · 21 CFR Part 11",
    emoji: "💊",
    color: "#1A7A40",
    colorDim: "#E8F5EC",
    factoryName: "MedCore Pharma Pvt Ltd",
    standards: ["GMP/GxP", "21 CFR Part 11", "EU GMP Annex 11", "ICH Q10", "WHO TRS"],
    oeeTarget: 90,
    term: { workOrder: "Batch Order", product: "Drug Product", machine: "Equipment", lot: "Batch", shift: "Campaign", output: "Units", quality: "In-Process Control" },
    kpis: [
      { label: "Batch Yield",    value: "98.3%",  sub: "Target ≥ 97.5%",         trend: "up",   trendGood: "up" },
      { label: "Lines",          value: "2 / 3",  sub: "1 in cleaning",           trend: "flat", trendGood: "up" },
      { label: "Tablets Today",  value: "1.2 M",  sub: "Target 1.3 M",           trend: "up",   trendGood: "up" },
      { label: "Deviations",     value: "0",      sub: "No open deviations",     trend: "up",   trendGood: "down" },
    ],
    activeOrder: { orderNo: "BATCH-2026-BN-1142", product: "Paracetamol 500 mg Tablets", actual: 1200000, planned: 1300000, unit: "tablets", elapsedPct: 0.82, rejectedPct: 0.002, estimatedDone: "16:20" },
    machines: [
      { id: "g1", name: "High-Shear Granulator G-01", state: "running", oee: 92, currentOp: "Wet granulation — API blend", partsThisShift: 480, targetThisShift: 500, unit: "kg" },
      { id: "g2", name: "Rotary Tablet Press TP-02",  state: "running", oee: 94, currentOp: "Compression BN-1142",         partsThisShift: 1200000, targetThisShift: 1300000, unit: "tabs" },
      { id: "g3", name: "Film Coating Pan FC-01",     state: "setup",   oee: 0,  currentOp: "Spray system setup",          partsThisShift: 0, targetThisShift: 800000, unit: "tabs" },
    ],
    insights: [
      { level: "ok",      title: "Batch BN-1142 on track for release",                body: "98.3% yield, 0 deviations, all IPC checks passed. Projected for QA review by 17:00. EBR auto-signed." },
      { level: "warning", title: "Film coating FC-01 behind schedule by 40 min",      body: "Spray system calibration took longer than planned. Batch will miss the AM dispatch window. QA lead notified." },
      { level: "ok",      title: "Granulator moisture within spec",                   body: "LOD 2.1% within NMT 2.5% specification. No corrective action required." },
    ],
  },

  electronics: {
    id: "electronics",
    name: "Electronics",
    tagline: "SMT assembly · IPC-A-610 · Zero-defect",
    emoji: "⚡",
    color: "#0057CC",
    colorDim: "#EBF2FF",
    factoryName: "Precision Electronics Pvt Ltd",
    standards: ["IPC-A-610", "IPC-J-STD-001", "ISO 9001", "RoHS", "REACH", "ISO/TS 16949"],
    oeeTarget: 90,
    term: { workOrder: "Work Order", product: "PCB Assembly", machine: "Line", lot: "Lot", shift: "Shift", output: "Boards", quality: "AOI / AXI Inspection" },
    kpis: [
      { label: "First Pass Yield",  value: "97.1%", sub: "Target 98%",             trend: "up",   trendGood: "up" },
      { label: "Lines",             value: "2 / 2", sub: "All running",             trend: "up",   trendGood: "up" },
      { label: "Boards Today",      value: "1,840", sub: "Target 2,000",            trend: "up",   trendGood: "up" },
      { label: "Open NCMs",         value: "2",     sub: "Tombstoning (C47, R12)", trend: "down", trendGood: "down" },
    ],
    activeOrder: { orderNo: "WO-2026-SMT-0882", product: "ESP32 Motor Controller v3.2", actual: 1840, planned: 2000, unit: "boards", elapsedPct: 0.88, rejectedPct: 0.029, estimatedDone: "15:50" },
    machines: [
      { id: "e1", name: "SMT Line 1 — Panasonic NPM",  state: "running", oee: 94, currentOp: "ESP32 MCU placement",         partsThisShift: 940, targetThisShift: 1000, unit: "boards" },
      { id: "e2", name: "SMT Line 2 — ASM Siplace",    state: "running", oee: 91, currentOp: "Power stage assembly",        partsThisShift: 900, targetThisShift: 1000, unit: "boards" },
      { id: "e3", name: "AOI — Koh Young Zenith",      state: "running", oee: 100, currentOp: "Post-reflow inspection",     partsThisShift: 1810, targetThisShift: 1840, unit: "boards" },
      { id: "e4", name: "Reflow Oven — Heller 1707MK", state: "running", oee: 99, currentOp: "Profile: SAC305 Pb-free",    partsThisShift: 1840, targetThisShift: 1840, unit: "boards" },
    ],
    insights: [
      { level: "warning",  title: "Tombstoning defects on C47/R12 — 2 NCMs open",   body: "29 boards failed AOI at capacitor C47 and resistor R12. Likely solder paste volume variation. Check stencil aperture and squeegee pressure on Line 2." },
      { level: "ok",       title: "SMT Line 1 FPY 97.1% — above target",             body: "Line 1 performing well. Tombstoning is isolated to Line 2 stencil printer. No action needed on Line 1." },
      { level: "warning",  title: "Reel C47-10µF (LOT-2026-TDK-0421) — suspect",    body: "16 of 29 NCM boards share the same TDK capacitor reel. Recommend quarantine and re-inspection of that reel lot." },
    ],
  },

  textile: {
    id: "textile",
    name: "Textile",
    tagline: "Spinning · Weaving · Dyeing · Finishing",
    emoji: "🧵",
    color: "#7C3AED",
    colorDim: "#F3EEFF",
    factoryName: "IndiaWeave Fabrics Ltd",
    standards: ["Oeko-Tex Standard 100", "GOTS", "BCI", "ISO 9001", "REACH"],
    oeeTarget: 80,
    term: { workOrder: "Production Run", product: "Fabric Roll", machine: "Loom", lot: "Roll", shift: "Shift", output: "Meters", quality: "Fabric Inspection" },
    kpis: [
      { label: "Loom Efficiency", value: "83.2%", sub: "Target 80%",          trend: "up",   trendGood: "up" },
      { label: "Looms Running",   value: "18/22",  sub: "4 stopped / repair",  trend: "flat", trendGood: "up" },
      { label: "Fabric Today",    value: "24.5 km", sub: "Target 28 km",        trend: "up",   trendGood: "up" },
      { label: "Yarn Breaks",     value: "7",       sub: "Last 8h — 2h avg 0.9",trend: "down", trendGood: "down" },
    ],
    activeOrder: { orderNo: "RUN-2026-0881", product: "Cotton Twill 2×2 — 200 GSM — 60\" Grey", actual: 24500, planned: 28000, unit: "m", elapsedPct: 0.78, rejectedPct: 0.018, estimatedDone: "17:30" },
    machines: [
      { id: "t1", name: "Air-jet Loom Bay 1 (L01–L06)",   state: "running", oee: 86, currentOp: "Cotton Twill 60\" grey", partsThisShift: 8400, targetThisShift: 9600, unit: "m" },
      { id: "t2", name: "Air-jet Loom Bay 2 (L07–L12)",   state: "running", oee: 84, currentOp: "Cotton Twill 60\" grey", partsThisShift: 8100, targetThisShift: 9600, unit: "m" },
      { id: "t3", name: "Ring Spinning Frame R-01",        state: "running", oee: 79, currentOp: "30s / 2 ply",           partsThisShift: 420, targetThisShift: 500, unit: "kg" },
      { id: "t4", name: "Warping Machine W-01",            state: "idle",    oee: 0,  currentOp: "Awaiting yarn lot",     partsThisShift: 0, targetThisShift: 2000, unit: "m" },
    ],
    insights: [
      { level: "warning",  title: "Warping W-01 starved — yarn lot delayed",          body: "Lot YARN-2026-0441 not yet received from store. W-01 has been idle 55 min. 4 looms in Bay 2 will run out of warp by 15:30." },
      { level: "ok",       title: "Loom efficiency 83.2% — above 80% target",         body: "7 warp breaks this shift, well below the 15/8h control limit. Fabric quality inspection passing at 98.2% acceptance." },
      { level: "warning",  title: "Loom L09 weft detector tripping frequently",       body: "12 stops in last 2h on L09, avg 4 min each = 48 min lost. Check weft feeler sensitivity and yarn quality on the active bobbin." },
    ],
  },

  food_beverage: {
    id: "food_beverage",
    name: "Food & Beverage",
    tagline: "HACCP · FSSC 22000 · Allergen management",
    emoji: "🍅",
    color: "#D97706",
    colorDim: "#FFFBEB",
    factoryName: "GoldenCrop Foods Pvt Ltd",
    standards: ["HACCP", "FSSC 22000", "ISO 22000", "FSSAI", "BRC Grade A"],
    oeeTarget: 85,
    term: { workOrder: "Production Run", product: "SKU", machine: "Line", lot: "Lot", shift: "Shift", output: "Cases", quality: "CCP Monitoring" },
    kpis: [
      { label: "Line Efficiency",   value: "89.4%", sub: "Target 85%",         trend: "up",   trendGood: "up" },
      { label: "Lines Running",     value: "3 / 4", sub: "1 CIP in progress",  trend: "flat", trendGood: "up" },
      { label: "Cases Today",       value: "4,200", sub: "Target 4,800",       trend: "up",   trendGood: "up" },
      { label: "Allergen Alerts",   value: "0",     sub: "All CCPs in control",trend: "up",   trendGood: "down" },
    ],
    activeOrder: { orderNo: "RUN-2026-FG-0318", product: "Tomato Ketchup Premium 500 ml — Lot L-2026-318", actual: 4200, planned: 4800, unit: "cases", elapsedPct: 0.82, rejectedPct: 0.008, estimatedDone: "15:00" },
    machines: [
      { id: "f1", name: "Mixing / Cooking Tank MT-01",  state: "running", oee: 92, currentOp: "Ketchup batch #3 — 85°C", partsThisShift: 48, targetThisShift: 56, unit: "batches" },
      { id: "f2", name: "Filling Line A — Krones",     state: "running", oee: 91, currentOp: "500 ml fill — 240 bpm",    partsThisShift: 4200, targetThisShift: 4800, unit: "cases" },
      { id: "f3", name: "Labelling / Packing",         state: "running", oee: 90, currentOp: "Premium label — wrap",     partsThisShift: 4200, targetThisShift: 4800, unit: "cases" },
      { id: "f4", name: "Filling Line B — Bosch",      state: "idle",    oee: 0,  currentOp: "CIP — 2h cycle",           partsThisShift: 0, targetThisShift: 0, unit: "cases" },
    ],
    insights: [
      { level: "ok",       title: "All CCPs in control — no HACCP deviations",         body: "CCP1 (heat treatment 85°C) and CCP2 (metal detection) both passing. Brix at 28.4° within spec. No allergen cross-contact risk." },
      { level: "warning",  title: "Filling Line A speed 2% below target",              body: "Running at 235 bpm vs 240 target due to sealer jaw temperature variation. Maintenance has been notified. No quality impact so far." },
      { level: "ok",       title: "Allergen changeover from Line B completed",         body: "Full CIP cycle validated. ATP swab results ≤10 RLU. Line B cleared for next allergen-free SKU." },
    ],
  },

  aerospace: {
    id: "aerospace",
    name: "Aerospace",
    tagline: "AS9100 · NADCAP · Zero-defect traceability",
    emoji: "✈️",
    color: "#1E40AF",
    colorDim: "#EFF2FF",
    factoryName: "AeroForge Precision Pvt Ltd",
    standards: ["AS9100 Rev D", "NADCAP", "AMS 2750E (Pyrometry)", "EN 9102 (FAIR)", "ISO 9001"],
    oeeTarget: 75,
    term: { workOrder: "Shop Order", product: "Component", machine: "Machine", lot: "Serial No.", shift: "Shift", output: "pcs", quality: "NDT / CMM Inspection" },
    kpis: [
      { label: "Shop OEE",        value: "68.9%", sub: "Target 75%",           trend: "flat", trendGood: "up" },
      { label: "Machines",        value: "2 / 3", sub: "1 on NDT hold",        trend: "flat", trendGood: "up" },
      { label: "Parts Today",     value: "24",    sub: "Target 30 pcs",        trend: "up",   trendGood: "up" },
      { label: "Open NCRs",       value: "0",     sub: "Zero non-conformances",trend: "up",   trendGood: "down" },
    ],
    activeOrder: { orderNo: "SO-2026-AF-0119", product: "Turbine Blade Cluster — Ti-6Al-4V", actual: 24, planned: 30, unit: "pcs", elapsedPct: 0.80, rejectedPct: 0.0, estimatedDone: "16:45" },
    machines: [
      { id: "a1", name: "5-Axis CNC — Makino D500",   state: "running", oee: 69, currentOp: "Profile milling — Ti-6Al-4V", partsThisShift: 14, targetThisShift: 18, unit: "pcs" },
      { id: "a2", name: "CMM — Renishaw Equator 500", state: "running", oee: 100, currentOp: "FAIR dimensional check",       partsThisShift: 24, targetThisShift: 24, unit: "pcs" },
      { id: "a3", name: "Wire EDM — Sodick AQ900L",   state: "idle",    oee: 0,  currentOp: "Awaiting NDT clearance",       partsThisShift: 0, targetThisShift: 12, unit: "pcs" },
    ],
    insights: [
      { level: "warning",  title: "5-axis CNC tool life at 85% — plan replacement",   body: "Ball end-mill BEM-10R showing flank wear 0.21 mm. Replace before next shift to avoid surface finish deviation on Ti-6Al-4V." },
      { level: "warning",  title: "Wire EDM on NDT hold pending FPI clearance",       body: "12 blades await fluorescent penetrant inspection. FPI Lab ETA: 14:30. EDM idle 2h so far — recovery possible if FPI clears by 15:00." },
      { level: "ok",       title: "All 24 blades cleared FAIR — no NCRs",             body: "CMM dimensional report within tolerance. All critical characteristics (wall thickness, chord length) within AS9102 requirements. Paperwork submitted to customer." },
    ],
  },

  chemical: {
    id: "chemical",
    name: "Chemical",
    tagline: "Continuous process · ATEX · ISO 14001",
    emoji: "⚗️",
    color: "#0D9488",
    colorDim: "#F0FDFB",
    factoryName: "ChemSynth Industries Ltd",
    standards: ["ATEX / IECEx", "ISO 14001", "REACH", "OSHA PSM", "ISO 45001", "ISO 9001"],
    oeeTarget: 90,
    term: { workOrder: "Campaign", product: "Chemical Product", machine: "Reactor", lot: "Batch", shift: "Shift", output: "MT", quality: "In-Process Sampling" },
    kpis: [
      { label: "Plant Yield",     value: "94.7%", sub: "Target ≥ 93%",          trend: "up",   trendGood: "up" },
      { label: "Reactors Online", value: "2 / 3", sub: "R-103 on turnaround",   trend: "flat", trendGood: "up" },
      { label: "Output Today",    value: "48 MT",  sub: "Target 50 MT",          trend: "up",   trendGood: "up" },
      { label: "Safety Events",   value: "0",      sub: "TRIR: 0 YTD",           trend: "up",   trendGood: "down" },
    ],
    activeOrder: { orderNo: "CAMP-2026-CH-0082", product: "Acetic Acid — Glacial — Purity ≥ 99.9%", actual: 48, planned: 50, unit: "MT", elapsedPct: 0.88, rejectedPct: 0.005, estimatedDone: "18:00" },
    machines: [
      { id: "c1", name: "Reactor R-101 — 10 kL",        state: "running", oee: 95, currentOp: "Acetic acid campaign — 118°C", partsThisShift: 28, targetThisShift: 30, unit: "MT" },
      { id: "c2", name: "Reactor R-102 — 10 kL",        state: "running", oee: 94, currentOp: "Acetic acid campaign — 118°C", partsThisShift: 20, targetThisShift: 20, unit: "MT" },
      { id: "c3", name: "Distillation Column D-01",     state: "running", oee: 92, currentOp: "Glacial grade purification",    partsThisShift: 46, targetThisShift: 48, unit: "MT" },
      { id: "c4", name: "Reactor R-103 — 10 kL",        state: "idle",    oee: 0,  currentOp: "Scheduled turnaround",          partsThisShift: 0, targetThisShift: 0, unit: "MT" },
    ],
    insights: [
      { level: "warning",  title: "R-102 temperature trending high — +2°C drift",    body: "Jacket cooling water flow reduced from 15 to 12 m³/h in last 2h. Yield impact projected if temperature exceeds 122°C. Check cooling water supply valve CV-204." },
      { level: "ok",       title: "Distillation D-01 purity 99.91% — within spec",   body: "Inline refractometer reading 99.91% purity. All process safety interlocks active. No safety events this shift." },
      { level: "ok",       title: "R-103 turnaround on schedule",                     body: "Catalyst replacement 60% complete. Estimated return to service: 2026-11-08 06:00. No campaign impact." },
    ],
  },

  plastics: {
    id: "plastics",
    name: "Plastics & Rubber",
    tagline: "Injection moulding · Extrusion · IATF 16949",
    emoji: "🔷",
    color: "#475569",
    colorDim: "#F1F5F9",
    factoryName: "PolyForm Moulders Pvt Ltd",
    standards: ["IATF 16949", "ISO 9001", "RoHS", "REACH", "ISO 14001"],
    oeeTarget: 80,
    term: { workOrder: "Work Order", product: "Moulded Part", machine: "Press", lot: "Lot", shift: "Shift", output: "pcs", quality: "Visual / CMM Inspection" },
    kpis: [
      { label: "Shop OEE",         value: "76.3%", sub: "Target 80%",         trend: "flat", trendGood: "up" },
      { label: "Presses Running",  value: "5 / 6", sub: "1 in fault",         trend: "flat", trendGood: "up" },
      { label: "Parts Today",      value: "8,420", sub: "Target 9,600 pcs",   trend: "up",   trendGood: "up" },
      { label: "Scrap Rate",       value: "2.1%",  sub: "Target <2%",         trend: "down", trendGood: "down" },
    ],
    activeOrder: { orderNo: "WO-2026-PF-0441", product: "Dashboard Trim Panel — PP+EPDM Black Textured", actual: 8420, planned: 9600, unit: "pcs", elapsedPct: 0.84, rejectedPct: 0.021, estimatedDone: "16:00" },
    machines: [
      { id: "p1", name: "Injection Press 500T — Engel",   state: "running", oee: 76, currentOp: "Dashboard Trim — 60s cycle", partsThisShift: 3600, targetThisShift: 4000, unit: "pcs" },
      { id: "p2", name: "Injection Press 350T — KraussMaffei", state: "running", oee: 82, currentOp: "Door Liner Panel",          partsThisShift: 2800, targetThisShift: 3200, unit: "pcs" },
      { id: "p3", name: "Injection Press 200T — Haitian",  state: "fault",   oee: 0,  currentOp: "Mould coolant leak",         partsThisShift: 480, targetThisShift: 1600, unit: "pcs" },
      { id: "p4", name: "Extrusion Line E-01",             state: "running", oee: 88, currentOp: "EPDM Weatherstrip — 40 m/min",partsThisShift: 1200, targetThisShift: 1400, unit: "m" },
    ],
    insights: [
      { level: "critical", title: "Press 200T halted — coolant line leak on mould",   body: "Mould coolant leaking at manifold fitting on Mould #48. 1,120 pcs lost opportunity. Maintenance ETA: 60 min. Redirect 400 pcs to Press 350T on overtime." },
      { level: "warning",  title: "Scrap rate 2.1% — above 2% target",               body: "Short shots (38 pcs) and sink marks (19 pcs) on Press 500T. Melt temperature at 215°C is 5°C below recommendation. Increase barrel zones 2–4 by 5°C." },
      { level: "ok",       title: "Extrusion E-01 running at 88% OEE",               body: "EPDM weatherstrip on spec. Cross-section within ±0.15 mm. No customer complaints outstanding on this product code." },
    ],
  },
};
