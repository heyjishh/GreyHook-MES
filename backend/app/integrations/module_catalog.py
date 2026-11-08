from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

IndustryId = Literal[
    "automotive", "pharmaceutical", "food_beverage", "electronics",
    "textile", "aerospace", "chemical", "plastics", "generic",
]

ModuleCategory = Literal[
    "core", "quality", "maintenance", "planning", "integration",
    "analytics", "compliance", "labor", "energy", "enterprise",
]


@dataclass
class ModuleDef:
    id: str
    label: str
    description: str
    icon: str
    path: str
    category: ModuleCategory
    industries: list[IndustryId]
    section: str | None = None
    is_core: bool = False


ALL_MODULES: list[ModuleDef] = [
    ModuleDef("overview",         "Overview",          "Factory command center dashboard",                 "LayoutDashboard", "/dashboard",                       "core",        ["automotive","pharmaceutical","food_beverage","electronics","textile","aerospace","chemical","plastics","generic"], section=None,          is_core=True),
    ModuleDef("production",       "Production",        "Live production order tracking",                   "Activity",        "/dashboard/production",             "core",        ["automotive","pharmaceutical","food_beverage","electronics","textile","aerospace","chemical","plastics","generic"], section=None,          is_core=True),
    ModuleDef("oee",              "OEE",               "Overall equipment effectiveness analytics",        "BarChart3",       "/dashboard/oee",                    "core",        ["automotive","pharmaceutical","food_beverage","electronics","textile","aerospace","chemical","plastics","generic"], section=None,          is_core=True),
    ModuleDef("downtime",         "Downtime",          "Downtime events and root cause tracking",          "Timer",           "/dashboard/downtime",               "core",        ["automotive","pharmaceutical","food_beverage","electronics","textile","aerospace","chemical","plastics","generic"], section=None,          is_core=True),
    ModuleDef("ai",               "AI Insight",        "AI-driven manufacturing intelligence",             "Bot",             "/dashboard/ai",                     "analytics",   ["automotive","pharmaceutical","food_beverage","electronics","textile","aerospace","chemical","plastics","generic"], section=None,          is_core=True),
    ModuleDef("analytics",        "Analytics",         "Advanced production analytics and trends",         "TrendingUp",      "/dashboard/analytics",              "analytics",   ["automotive","pharmaceutical","food_beverage","electronics","textile","aerospace","chemical","plastics","generic"]),
    ModuleDef("workorders",       "Work Orders",       "Work order management and scheduling",             "ClipboardList",   "/dashboard/workorders",             "planning",    ["automotive","pharmaceutical","food_beverage","electronics","textile","aerospace","chemical","plastics","generic"]),
    ModuleDef("quality",          "Quality",           "Quality control and inspection management",        "ShieldCheck",     "/dashboard/quality",                "quality",     ["automotive","pharmaceutical","food_beverage","electronics","textile","aerospace","chemical","plastics","generic"]),
    ModuleDef("reports",          "Reports",           "Production and compliance reports",                "FileText",        "/dashboard/reports",                "analytics",   ["automotive","pharmaceutical","food_beverage","electronics","textile","aerospace","chemical","plastics","generic"]),
    ModuleDef("traceability",     "Traceability",      "End-to-end material and batch traceability",       "GitBranch",       "/dashboard/traceability",           "quality",     ["automotive","pharmaceutical","food_beverage","electronics","textile","aerospace","chemical","plastics","generic"]),
    ModuleDef("ncm",              "Non-Conformance",   "Non-conformance management and CAPA linking",      "AlertOctagon",    "/dashboard/ncm",                    "quality",     ["automotive","pharmaceutical","food_beverage","electronics","textile","aerospace","chemical","plastics","generic"]),
    ModuleDef("instructions",     "Instructions",      "Work instructions and SOPs",                       "ListChecks",      "/dashboard/workorders/PO-2026-11-001","planning", ["automotive","pharmaceutical","food_beverage","electronics","textile","aerospace","chemical","plastics","generic"]),
    ModuleDef("maintenance",      "Maintenance",       "Preventive and corrective maintenance",            "Wrench",          "/dashboard/maintenance",            "maintenance", ["automotive","pharmaceutical","food_beverage","electronics","textile","aerospace","chemical","plastics","generic"]),
    ModuleDef("bom",              "BOM",               "Bill of materials management",                     "Layers",          "/dashboard/bom",                    "planning",    ["automotive","pharmaceutical","food_beverage","electronics","textile","aerospace","chemical","plastics","generic"]),
    ModuleDef("operator",         "Operator Board",    "Operator-facing production display",               "Monitor",         "/dashboard/operator",               "core",        ["automotive","pharmaceutical","food_beverage","electronics","textile","aerospace","chemical","plastics","generic"]),
    ModuleDef("spc",              "SPC / Capability",  "Statistical process control charts",               "SigmaSquare",     "/dashboard/spc",                    "quality",     ["automotive","pharmaceutical","food_beverage","electronics","textile","aerospace","chemical","plastics","generic"]),
    ModuleDef("scheduling",       "Scheduling",        "Production scheduling and planning board",         "CalendarDays",    "/dashboard/scheduling",             "planning",    ["automotive","pharmaceutical","food_beverage","electronics","textile","aerospace","chemical","plastics","generic"]),
    ModuleDef("shift_handover",   "Shift Handover",    "Shift handover notes and log",                     "BookOpen",        "/dashboard/shift-handover",         "core",        ["automotive","pharmaceutical","food_beverage","electronics","textile","aerospace","chemical","plastics","generic"]),
    ModuleDef("yield",            "Yield & Loss",      "Yield analysis and loss reporting",                "Droplets",        "/dashboard/yield",                  "analytics",   ["food_beverage","pharmaceutical","chemical","plastics"]),
    ModuleDef("golden_batch",     "Golden Batch",      "Golden batch analysis and comparisons",            "FlaskConical",    "/dashboard/golden-batch",           "quality",     ["pharmaceutical","food_beverage","chemical"]),
    ModuleDef("inspections",      "Inspections",       "In-process and final inspections",                 "ClipboardCheck",  "/dashboard/quality/inspections",    "quality",     ["automotive","pharmaceutical","food_beverage","electronics","textile","aerospace","chemical","plastics","generic"]),
    ModuleDef("labor",            "Labor",             "Labor tracking and workforce management",          "Users",           "/dashboard/labor",                  "labor",       ["automotive","pharmaceutical","food_beverage","electronics","textile","aerospace","chemical","plastics","generic"]),
    ModuleDef("inventory",        "Inventory / WIP",   "Inventory and work-in-progress tracking",         "Boxes",           "/dashboard/inventory",              "planning",    ["automotive","pharmaceutical","food_beverage","electronics","textile","aerospace","chemical","plastics","generic"]),
    ModuleDef("recipes",          "Recipes",           "Recipe and formula management",                    "TestTube2",       "/dashboard/recipes",                "planning",    ["pharmaceutical","food_beverage","chemical"]),
    ModuleDef("ebr",              "Batch Records",     "Electronic batch records (EBR)",                   "ScrollText",      "/dashboard/ebr",                    "compliance",  ["pharmaceutical","food_beverage","chemical"]),
    ModuleDef("capa",             "CAPA",              "Corrective and preventive actions",                "ShieldAlert",     "/dashboard/capa",                   "compliance",  ["pharmaceutical","aerospace","automotive","food_beverage","chemical"]),
    ModuleDef("energy",           "Energy",            "Energy consumption monitoring",                    "Zap",             "/dashboard/energy",                 "analytics",   ["automotive","food_beverage","chemical","plastics","textile"]),
    ModuleDef("documents",        "Documents",         "Document management and version control",          "BookMarked",      "/dashboard/documents",              "compliance",  ["automotive","pharmaceutical","food_beverage","electronics","textile","aerospace","chemical","plastics","generic"]),
    ModuleDef("erp_sync",         "SAP & Oracle",      "ERP connector hub (SAP S/4HANA & Oracle)",        "Cable",           "/dashboard/erp-sync",               "integration", ["automotive","pharmaceutical","food_beverage","electronics","textile","aerospace","chemical","plastics","generic"], section="Integrations"),
    ModuleDef("andon",            "ANDON Board",       "Real-time ANDON alert board",                     "Radio",           "/dashboard/andon",                  "core",        ["automotive","electronics","textile","aerospace","plastics"]),
    ModuleDef("tooling",          "Tooling",           "Tool management and life tracking",                "Hammer",          "/dashboard/tooling",                "maintenance", ["automotive","aerospace","electronics","plastics"]),
    ModuleDef("genealogy",        "Genealogy",         "Component and part genealogy",                     "Network",         "/dashboard/genealogy",              "quality",     ["automotive","aerospace","electronics","pharmaceutical"]),
    ModuleDef("calibration",      "Calibration",       "Instrument calibration management",                "Ruler",           "/dashboard/calibration",            "quality",     ["pharmaceutical","aerospace","automotive","electronics","food_beverage"]),
    ModuleDef("supplier_quality", "Supplier Quality",  "Supplier quality management and scorecards",       "Truck",           "/dashboard/supplier-quality",       "quality",     ["automotive","aerospace","pharmaceutical","electronics"]),
    ModuleDef("line_balance",     "Line Balance",      "Production line balancing analysis",               "SlidersHorizontal", "/dashboard/line-balance",         "analytics",   ["automotive","electronics","textile","plastics"]),
    ModuleDef("enterprise",       "Command Center",    "Multi-plant enterprise command center",            "Globe",           "/dashboard/enterprise",             "enterprise",  ["automotive","pharmaceutical","food_beverage","electronics","textile","aerospace","chemical","plastics","generic"], section="Enterprise"),
    ModuleDef("benchmarking",     "Benchmarking",      "Plant benchmarking and comparisons",               "Award",           "/dashboard/plant-benchmarking",     "enterprise",  ["automotive","pharmaceutical","food_beverage","electronics","textile","aerospace","chemical","plastics","generic"], section="Enterprise"),
    ModuleDef("compliance",       "Compliance",        "Global compliance tracking",                       "LayoutGrid",      "/dashboard/global-compliance",      "compliance",  ["pharmaceutical","food_beverage","aerospace","chemical","automotive"], section="Enterprise"),
    ModuleDef("recipe_library",   "Recipe Library",    "Enterprise recipe library",                        "FlaskConical",    "/dashboard/recipe-library",         "planning",    ["pharmaceutical","food_beverage","chemical"], section="Enterprise"),
    ModuleDef("wip_transfer",     "WIP Transfer",      "Inter-plant WIP transfers",                        "ArrowLeftRight",  "/dashboard/wip-transfer",           "planning",    ["automotive","pharmaceutical","food_beverage","electronics","textile","aerospace","chemical","plastics","generic"], section="Enterprise"),
    ModuleDef("ent_scheduling",   "Ent. Scheduling",   "Enterprise-level scheduling",                      "CalendarRange",   "/dashboard/enterprise-scheduling",  "planning",    ["automotive","pharmaceutical","food_beverage","electronics","textile","aerospace","chemical","plastics","generic"], section="Enterprise"),
    ModuleDef("finance",          "Finance",           "Manufacturing cost and finance tracking",          "IndianRupee",     "/dashboard/finance",                "analytics",   ["automotive","pharmaceutical","food_beverage","electronics","textile","aerospace","chemical","plastics","generic"], section="Finance & Ops"),
    ModuleDef("procurement",      "Procurement",       "Procurement and purchase order management",        "ShoppingCart",    "/dashboard/procurement",            "planning",    ["automotive","pharmaceutical","food_beverage","electronics","textile","aerospace","chemical","plastics","generic"], section="Finance & Ops"),
]

MODULE_BY_ID: dict[str, ModuleDef] = {m.id: m for m in ALL_MODULES}

INDUSTRY_TEMPLATES: dict[IndustryId, list[str]] = {
    "automotive": [
        "overview","production","oee","downtime","ai","analytics","workorders","quality",
        "reports","traceability","ncm","instructions","maintenance","bom","operator","spc",
        "scheduling","shift_handover","labor","inventory","inspections","capa","energy",
        "documents","erp_sync","andon","tooling","genealogy","calibration","supplier_quality",
        "line_balance","enterprise","benchmarking","compliance","wip_transfer","ent_scheduling",
        "finance","procurement",
    ],
    "pharmaceutical": [
        "overview","production","oee","downtime","ai","analytics","workorders","quality",
        "reports","traceability","ncm","instructions","maintenance","bom","operator","spc",
        "scheduling","shift_handover","yield","golden_batch","inspections","labor","inventory",
        "recipes","ebr","capa","documents","erp_sync","genealogy","calibration","supplier_quality",
        "enterprise","benchmarking","compliance","recipe_library","wip_transfer","ent_scheduling",
        "finance","procurement",
    ],
    "food_beverage": [
        "overview","production","oee","downtime","ai","analytics","workorders","quality",
        "reports","traceability","ncm","instructions","maintenance","bom","operator",
        "scheduling","shift_handover","yield","golden_batch","inspections","labor","inventory",
        "recipes","ebr","capa","energy","documents","erp_sync","calibration","supplier_quality",
        "enterprise","benchmarking","compliance","recipe_library","wip_transfer","ent_scheduling",
        "finance","procurement",
    ],
    "electronics": [
        "overview","production","oee","downtime","ai","analytics","workorders","quality",
        "reports","traceability","ncm","instructions","maintenance","bom","operator","spc",
        "scheduling","shift_handover","labor","inventory","inspections","capa","documents",
        "erp_sync","andon","tooling","genealogy","calibration","supplier_quality","line_balance",
        "enterprise","benchmarking","wip_transfer","ent_scheduling","finance","procurement",
    ],
    "textile": [
        "overview","production","oee","downtime","ai","analytics","workorders","quality",
        "reports","traceability","ncm","instructions","maintenance","bom","operator",
        "scheduling","shift_handover","labor","inventory","inspections","energy","documents",
        "erp_sync","andon","line_balance","enterprise","benchmarking","wip_transfer",
        "ent_scheduling","finance","procurement",
    ],
    "aerospace": [
        "overview","production","oee","downtime","ai","analytics","workorders","quality",
        "reports","traceability","ncm","instructions","maintenance","bom","operator","spc",
        "scheduling","shift_handover","labor","inventory","inspections","capa","documents",
        "erp_sync","tooling","genealogy","calibration","supplier_quality",
        "enterprise","benchmarking","compliance","wip_transfer","ent_scheduling","finance","procurement",
    ],
    "chemical": [
        "overview","production","oee","downtime","ai","analytics","workorders","quality",
        "reports","traceability","ncm","instructions","maintenance","bom","operator","spc",
        "scheduling","shift_handover","yield","inspections","labor","inventory","recipes",
        "ebr","capa","energy","documents","erp_sync","calibration",
        "enterprise","benchmarking","compliance","recipe_library","wip_transfer","ent_scheduling",
        "finance","procurement",
    ],
    "plastics": [
        "overview","production","oee","downtime","ai","analytics","workorders","quality",
        "reports","traceability","ncm","instructions","maintenance","bom","operator","spc",
        "scheduling","shift_handover","yield","labor","inventory","inspections","energy",
        "documents","erp_sync","andon","tooling","line_balance",
        "enterprise","benchmarking","wip_transfer","ent_scheduling","finance","procurement",
    ],
    "generic": [
        "overview","production","oee","downtime","ai","analytics","workorders","quality",
        "reports","traceability","ncm","instructions","maintenance","bom","operator",
        "scheduling","shift_handover","labor","inventory","inspections","documents","erp_sync",
        "enterprise","benchmarking","wip_transfer","ent_scheduling","finance","procurement",
    ],
}


def get_template_modules(industry: IndustryId) -> list[str]:
    return INDUSTRY_TEMPLATES.get(industry, INDUSTRY_TEMPLATES["generic"])


def modules_as_dict() -> list[dict]:
    return [
        {
            "id": m.id,
            "label": m.label,
            "description": m.description,
            "icon": m.icon,
            "path": m.path,
            "category": m.category,
            "section": m.section,
            "is_core": m.is_core,
            "industries": m.industries,
        }
        for m in ALL_MODULES
    ]
