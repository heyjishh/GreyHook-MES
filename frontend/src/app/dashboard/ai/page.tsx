"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useFactoryMachines } from "@/hooks/api";
import { aiApi } from "@/lib/api";
import type {
  AIInvestigationSchema,
  AIInvestigationStatus,
  HypothesisSchema,
  ObservationSchema,
  RecommendationSchema,
} from "@/types/api";

const IS_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

const T = {
  brand:      "#F05230",
  brandDim:   "#FEF0EB",
  success:    "#1A7A40",
  successDim: "#E8F5EC",
  warning:    "#A85E00",
  warningDim: "#FEF0D6",
  danger:     "#CC1800",
  dangerDim:  "#FDE8E4",
  neutral:    "#6A8A9A",
  neutralDim: "#F0ECE8",
  border:     "#E8E4DF",
  text:       "#001C2E",
  muted:      "#6A8A9A",
  disabled:   "#B0C4CE",
  bg:         "#FFFFFF",
  bgSubtle:   "#FAFAF8",
  bgMuted:    "#F4F0EC",
};

const MOCK_BASE: AIInvestigationSchema = {
  id: "inv-mock-001",
  question: "Why did Welding Robot #1 lose production during the morning shift?",
  status: "completed",
  model_provider: "anthropic",
  model_id: "claude-sonnet-4-6",
  result: {
    summary:
      "Welding Robot #1 lost 48 minutes of production due to two sequential failures: a wire feed jam at 06:20 (15 min) and a bearing seizure in the torch actuator at 10:02 (open — ongoing). The bearing failure is the primary root cause and requires immediate maintenance intervention.",
    observations: [
      { claim: "Wire feed jam at 06:20 — resolved in 15 min", evidence: [{ source: "Downtime Log DT-010", timestamp: "2026-11-04T06:20:00Z", value: 900 }] },
      { claim: "Bearing seizure detected at 10:02 — still open", evidence: [{ source: "Downtime Log DT-001", timestamp: "2026-11-04T10:02:00Z", value: null }] },
      { claim: "Machine OEE at 44% — lowest on floor", evidence: [{ source: "OEE Monitor", timestamp: "2026-11-04T10:28:00Z", value: 0.44 }] },
      { claim: "Availability loss is primary OEE driver (61%)", evidence: [{ source: "OEE Breakdown", timestamp: "2026-11-04T10:28:00Z", value: 0.61 }] },
    ],
    hypotheses: [
      { text: "Bearing failure likely caused by insufficient lubrication — correlates with skipped PM at 09:00 yesterday", confidence: "high", supporting_evidence: [{ source: "PM Log", timestamp: "2026-11-03T09:00:00Z", value: "skipped" }] },
      { text: "Wire feed jam may be symptomatic of worn feed rollers — 3 jams in past 2 weeks", confidence: "medium", supporting_evidence: [{ source: "Downtime History", timestamp: "2026-11-04T06:20:00Z", value: 3 }] },
      { text: "Heat buildup from extended production run may have accelerated bearing wear", confidence: "low", supporting_evidence: [] },
    ],
    recommendations: [
      { action: "Immediate: Replace torch actuator bearing — machine currently offline", rationale: "Open downtime event since 10:02. Machine needs manual intervention before it can resume." },
      { action: "Schedule feed roller inspection during next planned stop", rationale: "Repeated wire feed jams suggest worn rollers. 10-min inspection can prevent 30+ min unplanned stops." },
      { action: "Review PM schedule for Welding Robot #1 — increase lubrication frequency", rationale: "Bearing failure correlates with missed PM. Consider reducing PM interval from 7 days to 4 days." },
    ],
  },
  created_at: "2026-11-04T10:30:00Z",
  completed_at: "2026-11-04T10:30:12Z",
};

const MOCK_HISTORY: AIInvestigationSchema[] = [
  {
    id: "inv-mock-h1", question: "What is the top downtime category this shift?", status: "completed",
    model_provider: "anthropic", model_id: "claude-sonnet-4-6",
    result: {
      summary: "Mechanical failure accounts for 61% of downtime this shift (82 min), driven entirely by Welding Robot #1. Changeover is second at 24% (32 min).",
      observations: [
        { claim: "Mechanical failure: 82 min (3 events)", evidence: [{ source: "Downtime Log", timestamp: "2026-11-04T10:28:00Z", value: 4920 }] },
        { claim: "Changeover: 32 min (2 events)", evidence: [{ source: "Downtime Log", timestamp: "2026-11-04T10:28:00Z", value: 1920 }] },
      ],
      hypotheses: [{ text: "Welding Robot #1 is the single point of failure for mechanical downtime", confidence: "high", supporting_evidence: [] }],
      recommendations: [{ action: "Prioritize Welding Robot #1 maintenance to recover lost shift time", rationale: "Single machine driving majority of downtime." }],
    },
    created_at: "2026-11-04T08:15:00Z", completed_at: "2026-11-04T08:15:22Z",
  },
  {
    id: "inv-mock-h2", question: "Compare OEE across all machines today", status: "completed",
    model_provider: "anthropic", model_id: "claude-sonnet-4-6",
    result: {
      summary: "CNC Lathe #1 leads at 78% OEE. QC Station #1 at 71%. Press Machine #1 at 62%. Welding Robot #1 lowest at 44%.",
      observations: [
        { claim: "CNC Lathe #1: OEE 78%", evidence: [{ source: "OEE Monitor", timestamp: "2026-11-04T10:28:00Z", value: 0.78 }] },
        { claim: "Welding Robot #1: OEE 44% — fault state", evidence: [{ source: "OEE Monitor", timestamp: "2026-11-04T10:28:00Z", value: 0.44 }] },
      ],
      hypotheses: [{ text: "Floor average OEE drag is caused by Welding Robot #1's open fault", confidence: "high", supporting_evidence: [] }],
      recommendations: [{ action: "Fix Welding Robot #1 fault to bring floor OEE above 70%", rationale: "One repair would raise floor average by ~8 OEE points." }],
    },
    created_at: "2026-11-04T07:00:00Z", completed_at: "2026-11-04T07:00:19Z",
  },
  {
    id: "inv-mock-h3", question: "Identify the floor bottleneck and recommend action", status: "completed",
    model_provider: "anthropic", model_id: "claude-sonnet-4-6",
    result: {
      summary: "The floor bottleneck is the Welding Robot #1 station in fault state since 10:02, blocking downstream QC throughput.",
      observations: [
        { claim: "Welding Robot #1: fault state since 10:02", evidence: [{ source: "Machine Status", timestamp: "2026-11-04T10:02:00Z", value: "fault" }] },
        { claim: "QC Station #1 utilization dropped 40% after weld station fault", evidence: [{ source: "Throughput Monitor", timestamp: "2026-11-04T10:10:00Z", value: 0.40 }] },
      ],
      hypotheses: [{ text: "QC throughput is constrained by upstream weld station outage", confidence: "high", supporting_evidence: [] }],
      recommendations: [{ action: "Dispatch maintenance to Welding Robot #1 immediately", rationale: "Blocking downstream throughput. Every minute of fault = downstream idle time." }],
    },
    created_at: "2026-11-04T06:00:00Z", completed_at: "2026-11-04T06:00:28Z",
  },
];

const EXAMPLE_QUESTIONS = [
  "Why did Welding Robot #1 lose production?",
  "What is the top downtime category this shift?",
  "Compare OEE across all machines today",
  "Why is M-03 below target?",
  "Identify the floor bottleneck and recommend action",
];

const LOADING_STEPS = [
  "Loading OEE data",
  "Scanning downtime events",
  "Running hypothesis engine",
  "Generating recommendations",
];

const CONFIDENCE_COLOR: Record<HypothesisSchema["confidence"], { bg: string; text: string; label: string }> = {
  high:   { bg: T.dangerDim,  text: T.danger,  label: "High" },
  medium: { bg: T.warningDim, text: T.warning, label: "Medium" },
  low:    { bg: T.neutralDim, text: T.neutral, label: "Low" },
};

const STATUS_CFG: Record<AIInvestigationStatus, { label: string; color: string }> = {
  pending:   { label: "Waiting",   color: T.neutral },
  running:   { label: "Analysing", color: T.warning },
  completed: { label: "Complete",  color: T.success },
  failed:    { label: "Failed",    color: T.danger },
};

function StatusPip({ status }: { status: AIInvestigationStatus }) {
  const cfg = STATUS_CFG[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-xs font-semibold shrink-0"
      style={{ background: `${cfg.color}18`, color: cfg.color }}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${status === "running" ? "animate-pulse" : ""}`}
        style={{ background: cfg.color }}
      />
      {cfg.label}
    </span>
  );
}

function ObservationCard({ obs, index }: { obs: ObservationSchema; index: number }) {
  return (
    <div className="flex gap-3 items-start p-4 rounded-xl border" style={{ borderColor: T.border, background: T.bgSubtle }}>
      <span className="font-mono text-sm font-bold shrink-0 mt-0.5" style={{ color: T.muted }}>
        {String(index + 1).padStart(2, "0")}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-sans text-sm font-medium" style={{ color: T.text }}>{obs.claim}</p>
        {obs.evidence.length > 0 && (
          <ul className="mt-1.5 space-y-0.5">
            {obs.evidence.map((ev, i) => (
              <li key={i} className="flex items-center gap-2 font-mono text-xs" style={{ color: T.muted }}>
                <span style={{ color: T.brand }}>↳</span>
                <span>{ev.source}</span>
                {ev.timestamp && (
                  <span style={{ color: T.disabled }}>
                    {new Date(ev.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
                {ev.value !== null && ev.value !== undefined && (
                  <span className="font-semibold" style={{ color: T.brand }}>
                    {typeof ev.value === "number"
                      ? ev.value < 2
                        ? `${(ev.value * 100).toFixed(0)}%`
                        : ev.value.toLocaleString()
                      : String(ev.value)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function HypothesisCard({ hyp }: { hyp: HypothesisSchema }) {
  const cfg = CONFIDENCE_COLOR[hyp.confidence];
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl border" style={{ borderColor: T.border, background: T.bgSubtle }}>
      <div className="flex-1">
        <p className="font-sans text-sm font-medium" style={{ color: T.text }}>{hyp.text}</p>
      </div>
      <span
        className="shrink-0 font-mono text-xs font-semibold px-2 py-0.5 rounded-full"
        style={{ background: cfg.bg, color: cfg.text }}
      >
        {cfg.label}
      </span>
    </div>
  );
}

function RecommendationCard({ rec, index }: { rec: RecommendationSchema; index: number }) {
  return (
    <div className="flex gap-3 items-start p-4 rounded-xl border" style={{ borderColor: T.border, background: T.bgSubtle }}>
      <span
        className="font-mono text-xs font-black shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
        style={{ background: T.brand, color: "#fff" }}
      >
        {index + 1}
      </span>
      <div>
        <p className="font-sans text-sm font-semibold" style={{ color: T.text }}>{rec.action}</p>
        <p className="font-sans text-xs mt-0.5" style={{ color: T.muted }}>{rec.rationale}</p>
      </div>
    </div>
  );
}

function SkeletonBlock({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: T.bgMuted, opacity: 1 - i * 0.2 }} />
      ))}
    </div>
  );
}

function LoadingSteps({ completedCount }: { completedCount: number }) {
  return (
    <div className="p-5 rounded-xl border space-y-2" style={{ borderColor: T.border, background: T.bgSubtle }}>
      <p className="font-sans text-sm font-semibold mb-3" style={{ color: T.text }}>Analyzing production data…</p>
      {LOADING_STEPS.map((step, i) => (
        <div key={step} className="flex items-center gap-2.5">
          <span
            className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-all duration-300"
            style={{ background: i < completedCount ? T.success : T.border }}
          >
            {i < completedCount && (
              <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                <path d="M1 3L3 5L7 1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
          <span className="font-sans text-sm transition-colors" style={{ color: i < completedCount ? T.text : T.muted }}>
            {step}
          </span>
        </div>
      ))}
    </div>
  );
}

function ResultPanel({
  investigation,
  onFeedback,
  feedbackSent,
}: {
  investigation: AIInvestigationSchema;
  onFeedback: (type: "positive" | "negative") => void;
  feedbackSent: boolean;
}) {
  const [feedbackType, setFeedbackType] = useState<"positive" | "negative" | null>(null);
  const isLoading = investigation.status === "pending" || investigation.status === "running";
  const result = investigation.result;

  function handleFeedback(type: "positive" | "negative") {
    if (feedbackSent) return;
    setFeedbackType(type);
    onFeedback(type);
  }

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: T.border, background: T.bg }}>
      <div className="px-5 py-4 border-b flex items-start justify-between gap-4" style={{ borderColor: T.border }}>
        <div className="flex-1 min-w-0">
          <p className="font-sans text-xs uppercase tracking-widest font-semibold mb-1" style={{ color: T.muted }}>Investigation</p>
          <p className="font-sans text-sm font-semibold line-clamp-2" style={{ color: T.text }}>{investigation.question}</p>
          <p className="font-mono text-xs mt-1" style={{ color: T.disabled }}>
            {investigation.model_provider} · {investigation.model_id}
          </p>
        </div>
        <StatusPip status={investigation.status} />
      </div>

      <div className="p-5 space-y-6">
        <section>
          <p className="font-mono text-xs uppercase tracking-widest mb-3" style={{ color: T.muted }}>Summary</p>
          {isLoading ? (
            <div className="h-12 rounded-xl animate-pulse" style={{ background: T.bgMuted }} />
          ) : result?.summary ? (
            <p className="font-sans text-sm leading-relaxed" style={{ color: T.text }}>{result.summary}</p>
          ) : investigation.status === "failed" ? (
            <p className="font-sans text-sm" style={{ color: T.danger }}>Investigation failed. Please try again.</p>
          ) : null}
        </section>

        <section>
          <p className="font-mono text-xs uppercase tracking-widest mb-3" style={{ color: T.muted }}>
            Observations{result?.observations?.length ? ` (${result.observations.length})` : ""}
          </p>
          {isLoading ? (
            <SkeletonBlock lines={2} />
          ) : result?.observations?.length ? (
            <div className="space-y-2">
              {result.observations.map((obs, i) => <ObservationCard key={i} obs={obs} index={i} />)}
            </div>
          ) : result ? (
            <p className="font-sans text-sm" style={{ color: T.muted }}>No observations recorded.</p>
          ) : null}
        </section>

        <section>
          <p className="font-mono text-xs uppercase tracking-widest mb-3" style={{ color: T.muted }}>
            Hypotheses{result?.hypotheses?.length ? ` (${result.hypotheses.length})` : ""}
          </p>
          {isLoading ? (
            <SkeletonBlock lines={2} />
          ) : result?.hypotheses?.length ? (
            <div className="space-y-2">
              {result.hypotheses.map((hyp, i) => <HypothesisCard key={i} hyp={hyp} />)}
            </div>
          ) : result ? (
            <p className="font-sans text-sm" style={{ color: T.muted }}>No hypotheses generated.</p>
          ) : null}
        </section>

        <section>
          <p className="font-mono text-xs uppercase tracking-widest mb-3" style={{ color: T.muted }}>
            Recommendations{result?.recommendations?.length ? ` (${result.recommendations.length})` : ""}
          </p>
          {isLoading ? (
            <SkeletonBlock lines={2} />
          ) : result?.recommendations?.length ? (
            <div className="space-y-2">
              {result.recommendations.map((rec, i) => <RecommendationCard key={i} rec={rec} index={i} />)}
            </div>
          ) : result ? (
            <p className="font-sans text-sm" style={{ color: T.muted }}>No recommendations generated.</p>
          ) : null}
        </section>

        {investigation.status === "completed" && result && (
          <div className="pt-4 border-t flex items-center gap-3" style={{ borderColor: T.border }}>
            <p className="font-mono text-xs uppercase tracking-widest" style={{ color: T.muted }}>Useful?</p>
            {feedbackSent ? (
              <span className="font-mono text-xs font-semibold" style={{ color: T.success }}>Thanks for your feedback</span>
            ) : (
              <>
                <button
                  onClick={() => handleFeedback("positive")}
                  className="px-3 py-1 rounded-lg border font-mono text-xs transition-colors"
                  style={{
                    borderColor: feedbackType === "positive" ? T.success : T.border,
                    background: feedbackType === "positive" ? T.successDim : "transparent",
                    color: feedbackType === "positive" ? T.success : T.muted,
                  }}
                >
                  👍 Yes
                </button>
                <button
                  onClick={() => handleFeedback("negative")}
                  className="px-3 py-1 rounded-lg border font-mono text-xs transition-colors"
                  style={{
                    borderColor: feedbackType === "negative" ? T.danger : T.border,
                    background: feedbackType === "negative" ? T.dangerDim : "transparent",
                    color: feedbackType === "negative" ? T.danger : T.muted,
                  }}
                >
                  👎 No
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AIPage() {
  const { data: machines } = useFactoryMachines();

  const [query, setQuery] = useState("");
  const [machineId, setMachineId] = useState("");
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setHours(6, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 16));

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mockLoadStep, setMockLoadStep] = useState(0);
  const [investigation, setInvestigation] = useState<AIInvestigationSchema | null>(null);
  const [history, setHistory] = useState<AIInvestigationSchema[]>(IS_MOCK ? MOCK_HISTORY : []);
  const [error, setError] = useState<string | null>(null);
  const [feedbackSent, setFeedbackSent] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => () => {
    stopPolling();
    timersRef.current.forEach(clearTimeout);
  }, [stopPolling]);

  async function handleSubmit() {
    if (!query.trim()) return;
    setIsSubmitting(true);
    setInvestigation(null);
    setError(null);
    setFeedbackSent(false);

    if (IS_MOCK) {
      setMockLoadStep(0);
      const fake: AIInvestigationSchema = {
        ...MOCK_BASE,
        id: `inv-mock-${Date.now()}`,
        question: query.trim(),
        status: "running",
        result: null,
        created_at: new Date().toISOString(),
        completed_at: null,
      };
      setInvestigation(fake);

      timersRef.current = LOADING_STEPS.map((_, i) =>
        setTimeout(() => setMockLoadStep(i + 1), i * 400 + 100)
      );

      const finalTimer = setTimeout(() => {
        timersRef.current.forEach(clearTimeout);
        const done: AIInvestigationSchema = {
          ...MOCK_BASE,
          id: fake.id,
          question: query.trim(),
          created_at: fake.created_at,
          completed_at: new Date().toISOString(),
        };
        setInvestigation(done);
        setHistory((prev) => [done, ...prev].slice(0, 10));
        setIsSubmitting(false);
        setMockLoadStep(0);
      }, 1700);
      timersRef.current.push(finalTimer);
      return;
    }

    try {
      const { investigation_id } = await aiApi.createInvestigation({
        question: query.trim(),
        context: {
          ...(machineId ? { machine_id: machineId } : {}),
          from: new Date(fromDate).toISOString(),
          to: new Date(toDate).toISOString(),
        },
      });

      const initial = await aiApi.getInvestigation(investigation_id);
      setInvestigation(initial);

      if (initial.status !== "completed" && initial.status !== "failed") {
        stopPolling();
        pollRef.current = setInterval(async () => {
          try {
            const updated = await aiApi.getInvestigation(investigation_id);
            setInvestigation(updated);
            if (updated.status === "completed" || updated.status === "failed") {
              stopPolling();
              setHistory((prev) => [updated, ...prev].slice(0, 10));
            }
          } catch {
            stopPolling();
          }
        }, 2500);
      } else {
        setHistory((prev) => [initial, ...prev].slice(0, 10));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to start investigation");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleFeedback(type: "positive" | "negative") {
    if (!investigation || feedbackSent) return;
    try {
      await aiApi.submitFeedback(investigation.id, { feedback: type });
    } catch {
    }
    setFeedbackSent(true);
  }

  const isMockLoading = IS_MOCK && isSubmitting && mockLoadStep < LOADING_STEPS.length;

  return (
    <div className="space-y-6 max-w-4xl">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: T.text, fontFamily: "'Familjen Grotesk', sans-serif" }}>
            AI Investigations
          </h1>
          <p className="font-sans text-sm mt-1" style={{ color: T.muted }}>
            Evidence-backed production intelligence · Read-only
          </p>
        </div>
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono"
          style={{ borderColor: T.border, background: T.bgMuted, color: T.muted }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: T.success }} />
          Read-only · AI cannot issue machine control
        </div>
      </header>

      <div
        className="rounded-xl border p-4 flex items-start gap-3"
        style={{ borderColor: "#93C5FD50", background: "#EFF6FF" }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-0.5">
          <circle cx="8" cy="8" r="7" stroke="#3B82F6" strokeWidth="1.5" />
          <path d="M8 7v4M8 5.5v.5" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <p className="font-sans text-xs" style={{ color: "#1E40AF" }}>
          AI reads production data only. It cannot control machines or modify records. All queries use parameterized tool functions — no raw SQL is executed.
        </p>
      </div>

      <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: T.border, background: T.bg }}>
        <h2 className="font-sans text-sm font-semibold" style={{ color: T.text }}>Ask a Question</h2>

        <div className="flex flex-wrap gap-1.5">
          {EXAMPLE_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => setQuery(q)}
              className="font-mono text-xs rounded-lg border px-2.5 py-1 transition-colors"
              style={{
                borderColor: query === q ? T.brand : T.border,
                background: query === q ? T.brandDim : T.bgMuted,
                color: query === q ? T.brand : T.muted,
              }}
            >
              {q}
            </button>
          ))}
        </div>

        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-xl px-4 py-3 font-sans text-sm transition-colors resize-none focus:outline-none"
          style={{
            border: `1.5px solid ${query ? T.brand : T.border}`,
            background: T.bgSubtle,
            color: T.text,
          }}
          rows={3}
          placeholder="e.g. Why did Welding Robot #1 lose production during the morning shift?"
        />

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="font-mono text-xs uppercase tracking-widest" style={{ color: T.muted }}>Machine</label>
            <select
              value={machineId}
              onChange={(e) => setMachineId(e.target.value)}
              className="rounded-lg px-3 py-2 font-sans text-sm focus:outline-none"
              style={{ border: `1px solid ${T.border}`, background: T.bgMuted, color: T.text }}
            >
              <option value="">All machines</option>
              {(machines ?? []).map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-mono text-xs uppercase tracking-widest" style={{ color: T.muted }}>From</label>
            <input
              type="datetime-local"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="rounded-lg px-3 py-2 font-sans text-sm focus:outline-none"
              style={{ border: `1px solid ${T.border}`, background: T.bgMuted, color: T.text }}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-mono text-xs uppercase tracking-widest" style={{ color: T.muted }}>To</label>
            <input
              type="datetime-local"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="rounded-lg px-3 py-2 font-sans text-sm focus:outline-none"
              style={{ border: `1px solid ${T.border}`, background: T.bgMuted, color: T.text }}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !query.trim()}
            className="font-sans text-sm font-semibold px-5 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: T.brand, color: "#fff" }}
          >
            {isSubmitting ? "Analyzing…" : "Investigate"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border px-4 py-3" style={{ borderColor: `${T.danger}30`, background: T.dangerDim }}>
          <p className="font-sans text-sm" style={{ color: T.danger }}>{error}</p>
        </div>
      )}

      {isMockLoading && investigation && <LoadingSteps completedCount={mockLoadStep} />}

      {investigation && !isMockLoading && (
        <ResultPanel investigation={investigation} onFeedback={handleFeedback} feedbackSent={feedbackSent} />
      )}

      {history.length > 0 && (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: T.border }}>
          <div className="px-5 py-3.5 border-b" style={{ borderColor: T.border, background: T.bgSubtle }}>
            <h2 className="font-sans text-sm font-semibold" style={{ color: T.text }}>Investigation History</h2>
          </div>
          <div>
            {history.slice(0, 5).map((inv) => (
              <div
                key={inv.id}
                className="flex items-center gap-3 px-5 py-3 border-b last:border-b-0"
                style={{ borderColor: T.border, background: T.bg }}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-sans text-sm font-medium truncate" style={{ color: T.text }}>{inv.question}</p>
                  <p className="font-mono text-xs mt-0.5" style={{ color: T.muted }}>
                    {new Date(inv.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <StatusPip status={inv.status} />
                <button
                  onClick={() => { setInvestigation(inv); setFeedbackSent(false); }}
                  className="font-mono text-xs px-3 py-1.5 rounded-lg border transition-colors"
                  style={{ borderColor: T.border, background: T.bgMuted, color: T.muted }}
                >
                  View
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
