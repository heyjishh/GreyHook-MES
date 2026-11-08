"use client";

import { useState } from "react";
import { Globe, Save, RefreshCw, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const LANGUAGES = [
  { code: "en", label: "English (US)" },
  { code: "en-GB", label: "English (UK)" },
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "ja", label: "日本語" },
  { code: "zh-CN", label: "中文（简体）" },
  { code: "pt-BR", label: "Português (Brasil)" },
];

const DATE_FORMATS = ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD", "DD.MM.YYYY"];
const TIME_FORMATS = ["12h (AM/PM)", "24h"];
const UNIT_SYSTEMS = ["Metric (°C, kg, mm)", "Imperial (°F, lb, in)"];
const CURRENCIES = ["USD — US Dollar", "EUR — Euro", "GBP — British Pound", "JPY — Japanese Yen", "INR — Indian Rupee", "CNY — Chinese Yuan"];
const FIRST_DAYS = ["Monday", "Sunday", "Saturday"];
const NUMBER_FORMATS = ["1,234.56 (US)", "1.234,56 (EU)", "1 234,56 (FR)"];

interface LocaleConfig {
  language: string;
  dateFormat: string;
  timeFormat: string;
  unitSystem: string;
  currency: string;
  firstDayOfWeek: string;
  numberFormat: string;
  timezone: string;
}

const INIT: LocaleConfig = {
  language: "en",
  dateFormat: "MM/DD/YYYY",
  timeFormat: "24h",
  unitSystem: "Metric (°C, kg, mm)",
  currency: "USD — US Dollar",
  firstDayOfWeek: "Monday",
  numberFormat: "1,234.56 (US)",
  timezone: "UTC",
};

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#001C2E] mb-1.5">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-[#E8E4DF] text-sm text-[#001C2E] bg-white focus:outline-none focus:ring-2 focus:ring-[#F05230]/20 focus:border-[#F05230]"
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

export default function LocalizationPage() {
  const [config, setConfig] = useState<LocaleConfig>(INIT);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (key: keyof LocaleConfig) => (val: string) => setConfig((c) => ({ ...c, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-[#001C2E] font-mono tracking-tight flex items-center gap-2">
          <Globe size={20} className="text-[#F05230]" />
          Localisation
        </h1>
        <p className="text-sm text-[#6A8A9A] mt-1">Set language, date/time format, units, and regional preferences for your organization.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="block text-xs font-semibold text-[#001C2E] mb-1.5">Interface Language</label>
          <select
            value={config.language}
            onChange={(e) => set("language")(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[#E8E4DF] text-sm text-[#001C2E] bg-white focus:outline-none focus:ring-2 focus:ring-[#F05230]/20 focus:border-[#F05230]"
          >
            {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#001C2E] mb-1.5">Timezone</label>
          <input
            type="text"
            value={config.timezone}
            onChange={(e) => set("timezone")(e.target.value)}
            placeholder="UTC, America/New_York, Europe/Berlin…"
            className="w-full px-3 py-2 rounded-lg border border-[#E8E4DF] text-sm text-[#001C2E] bg-white focus:outline-none focus:ring-2 focus:ring-[#F05230]/20 focus:border-[#F05230]"
          />
          <p className="text-2xs text-[#6A8A9A] mt-1">All timestamps in MES UI use this zone. Edge devices always use UTC internally.</p>
        </div>

        <Select label="Date Format"      value={config.dateFormat}    options={DATE_FORMATS}   onChange={set("dateFormat")} />
        <Select label="Time Format"      value={config.timeFormat}    options={TIME_FORMATS}   onChange={set("timeFormat")} />
        <Select label="Unit System"      value={config.unitSystem}    options={UNIT_SYSTEMS}   onChange={set("unitSystem")} />
        <Select label="Currency"         value={config.currency}      options={CURRENCIES}     onChange={set("currency")} />
        <Select label="First Day of Week" value={config.firstDayOfWeek} options={FIRST_DAYS}  onChange={set("firstDayOfWeek")} />
        <Select label="Number Format"    value={config.numberFormat}  options={NUMBER_FORMATS} onChange={set("numberFormat")} />
      </div>

      {/* Preview */}
      <div className="p-5 rounded-xl border border-[#E8E4DF] bg-[#FAFAF8]">
        <div className="text-xs font-mono font-bold text-[#001C2E] uppercase tracking-widest mb-3">Preview</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Date", value: config.dateFormat === "MM/DD/YYYY" ? "11/08/2026" : config.dateFormat === "DD/MM/YYYY" ? "08/11/2026" : config.dateFormat === "YYYY-MM-DD" ? "2026-11-08" : "08.11.2026" },
            { label: "Time", value: config.timeFormat === "12h (AM/PM)" ? "2:34 PM" : "14:34" },
            { label: "Number", value: config.numberFormat === "1,234.56 (US)" ? "12,345.67" : config.numberFormat === "1.234,56 (EU)" ? "12.345,67" : "12 345,67" },
            { label: "Temperature", value: config.unitSystem.includes("Metric") ? "95.3 °C" : "203.5 °F" },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <div className="text-xs text-[#6A8A9A] mb-0.5">{label}</div>
              <div className="font-mono font-semibold text-sm text-[#001C2E]">{value}</div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F05230] text-white text-sm font-semibold hover:bg-[#d94720] disabled:opacity-50 transition-colors"
      >
        {saving ? <RefreshCw size={14} className="animate-spin" /> :
         saved  ? <CheckCircle2 size={14} /> : <Save size={14} />}
        {saved ? "Saved!" : "Save Localisation"}
      </button>
    </div>
  );
}
