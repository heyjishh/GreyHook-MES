export interface PlantConfig {
  id:          string;
  name:        string;
  location:    string;
  industry:    string;
  industryEmoji: string;
  industryColor: string;
  oee:         number;
  oeeTarget:   number;
  availability:number;
  performance: number;
  quality:     number;
  outputToday: number;
  outputTarget:number;
  unit:        string;
  machines:    number;
  machinesOnline: number;
  openAlerts:  number;
  shift:       string;
  status:      "running" | "partial" | "stopped";
  certifications: string[];
  revenueAtRisk: string;
  oeeWeekTrend: number[];
}

export const PLANTS: PlantConfig[] = [
  {
    id: "plant-chennai",
    name: "Sunrise Chennai",
    location: "Chennai, TN",
    industry: "Automotive",
    industryEmoji: "🏎",
    industryColor: "#F05230",
    oee: 72.4,
    oeeTarget: 85,
    availability: 92,
    performance: 87,
    quality: 97.2,
    outputToday: 621,
    outputTarget: 1040,
    unit: "parts",
    machines: 4,
    machinesOnline: 3,
    openAlerts: 2,
    shift: "Shift 2",
    status: "partial",
    certifications: ["IATF 16949", "ISO 14001", "MSIL Q1"],
    revenueAtRisk: "₹2.4L",
    oeeWeekTrend: [74.1, 71.8, 76.3, 73.9, 75.2, 72.4],
  },
  {
    id: "plant-hyderabad",
    name: "Sunrise Pharma Hyd",
    location: "Hyderabad, TS",
    industry: "Pharmaceutical",
    industryEmoji: "💊",
    industryColor: "#1A7A40",
    oee: 88.1,
    oeeTarget: 90,
    availability: 95,
    performance: 94,
    quality: 99.1,
    outputToday: 1197600,
    outputTarget: 1200000,
    unit: "tablets",
    machines: 6,
    machinesOnline: 6,
    openAlerts: 1,
    shift: "Shift A",
    status: "running",
    certifications: ["FDA 21 CFR Part 11", "GMP", "WHO-GMP", "ISO 9001"],
    revenueAtRisk: "₹0.4L",
    oeeWeekTrend: [86.2, 87.5, 88.0, 87.8, 88.4, 88.1],
  },
  {
    id: "plant-bangalore",
    name: "Sunrise Electronics BLR",
    location: "Bangalore, KA",
    industry: "Electronics",
    industryEmoji: "⚡",
    industryColor: "#0057CC",
    oee: 79.6,
    oeeTarget: 82,
    availability: 88,
    performance: 92,
    quality: 98.4,
    outputToday: 4820,
    outputTarget: 5500,
    unit: "PCBs",
    machines: 8,
    machinesOnline: 7,
    openAlerts: 3,
    shift: "Night Shift",
    status: "partial",
    certifications: ["IPC-A-610", "ISO 9001", "RoHS", "UL"],
    revenueAtRisk: "₹1.1L",
    oeeWeekTrend: [77.4, 80.1, 78.9, 81.2, 79.0, 79.6],
  },
  {
    id: "plant-pune",
    name: "Sunrise Textiles Pune",
    location: "Pune, MH",
    industry: "Textile",
    industryEmoji: "🧵",
    industryColor: "#7C3AED",
    oee: 65.8,
    oeeTarget: 75,
    availability: 78,
    performance: 85,
    quality: 99.2,
    outputToday: 12400,
    outputTarget: 18000,
    unit: "metres",
    machines: 12,
    machinesOnline: 9,
    openAlerts: 5,
    shift: "Morning",
    status: "partial",
    certifications: ["OEKO-TEX", "GOTS", "ISO 9001"],
    revenueAtRisk: "₹3.8L",
    oeeWeekTrend: [68.2, 66.5, 67.1, 64.9, 66.3, 65.8],
  },
];

export const ENTERPRISE_SUMMARY = {
  companyName: "Sunrise Industries Ltd",
  plants: PLANTS.length,
  avgOEE: +(PLANTS.reduce((s, p) => s + p.oee, 0) / PLANTS.length).toFixed(1),
  totalMachines: PLANTS.reduce((s, p) => s + p.machines, 0),
  machinesOnline: PLANTS.reduce((s, p) => s + p.machinesOnline, 0),
  totalAlerts: PLANTS.reduce((s, p) => s + p.openAlerts, 0),
  topPlant: "plant-hyderabad",
  bottomPlant: "plant-pune",
};
