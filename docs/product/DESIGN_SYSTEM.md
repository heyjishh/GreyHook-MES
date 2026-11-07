# GreyHook MES Design System

**Version**: 0.1  
**Status**: IN_REVIEW  
**Date**: 2026-11-04  
**Owner**: Agent 3 — Frontend & AI Engineer

---

## Brand identity and design rationale

GreyHook MES is a factory floor intelligence tool — it lives on monitors mounted above production lines and on tablets held by supervisors walking the shop floor. The visual language is built for high-contrast legibility in noisy, brightly lit industrial environments: a near-black control room aesthetic, monospace numerics for machine-readable precision, and unambiguous color signals for machine states that must be interpretable in under two seconds. The design avoids decorative softness — no gradients, no rounded brand illustrations, no pastel palettes. Every element earns its presence: color means state, weight means priority, space means hierarchy.

---

## Typography

### Font families

| Role | Font | Fallback | Use |
|------|------|----------|-----|
| Primary | IBM Plex Mono | Courier New, monospace | Machine IDs, counts, percentages, timestamps, state labels, code |
| Secondary | IBM Plex Sans | ui-sans-serif, system-ui, sans-serif | Labels, body copy, navigation items, descriptions |

**Why IBM Plex Mono over Inter**: Inter reads as a generic SaaS UI font. IBM Plex Mono carries technical, industrial character — it was designed for developer and engineering contexts. Its consistent character widths make numeric data columns align naturally without tabular-nums hacks. Combined with IBM Plex Sans for prose, the two fonts form a visually coherent typographic system grounded in IBM's engineering heritage.

### Type scale

| Token | Size (rem) | Line height | Typical use |
|-------|-----------|-------------|-------------|
| `text-xs` | 0.75rem | 1rem | Labels, badges, secondary metadata |
| `text-sm` | 0.875rem | 1.25rem | Body text, table rows, descriptions |
| `text-base` | 1rem | 1.5rem | Card headings, standard prose |
| `text-lg` | 1.125rem | 1.75rem | Section headings |
| `text-xl` | 1.25rem | 1.75rem | Page sub-headings |
| `text-2xl` | 1.5rem | 2rem | Page titles |
| `text-3xl` | 1.875rem | 2.25rem | Hero metrics (OEE percentage, production count) |

---

## Color system

The palette is defined as Tailwind CSS custom tokens in `tailwind.config.ts`.

### Background system (dark-first)

| Token | Hex | Use |
|-------|-----|-----|
| `surface-0` | `#0D0F0F` | Page background — the control room floor |
| `surface-1` | `#141818` | Card surfaces |
| `surface-2` | `#1C2121` | Elevated panels, inputs, table row hover |
| `surface-border` | `#2A3030` | Card borders, dividers, input outlines |

### Machine state colors

These colors carry critical operational meaning and are the most important colors in the system. They are never used decoratively.

| Token | Hex | Tailwind reference | Machine state |
|-------|-----|--------------------|---------------|
| `state-running` | `#22C55E` | green-500 | Machine is producing |
| `state-idle` | `#EAB308` | yellow-500 | Machine ready, not producing |
| `state-fault` | `#EF4444` | red-500 | Machine faulted |
| `state-offline` | `#6B7280` | gray-500 | No telemetry received |

**Usage rule**: state colors appear on `MachineStateChip`, timeline bars, and alert banners. They must never appear on structural UI elements (borders, backgrounds, icons) where they could be confused with machine state.

### OEE performance bands

| Token | Hex | Band | Threshold |
|-------|-----|------|-----------|
| `oee-world-class` | `#22C55E` | World-class | ≥ 85% |
| `oee-good` | `#84CC16` | Good | 65–84% |
| `oee-fair` | `#EAB308` | Fair | 50–64% |
| `oee-poor` | `#EF4444` | Poor | < 50% |

### Accent and interactive

| Token | Hex | Use |
|-------|-----|-----|
| `accent-primary` | `#38BDF8` | Primary buttons, focus rings, active nav border, links |
| `accent-secondary` | `#64748B` | Secondary/muted interactive elements |

Industrial cyan (`sky-400`) is chosen over purple (the common SaaS AI aesthetic) because it reads as precision instrumentation — think oscilloscope readouts and industrial HMI screens.

### Text

| Token | Hex | Use |
|-------|-----|-----|
| `text-primary` | `#F1F5F9` | Primary body text, headings |
| `text-secondary` | `#94A3B8` | Descriptions, labels, secondary info |
| `text-muted` | `#475569` | Timestamps, metadata, placeholder text |

---

## Component inventory

### Use from shadcn/ui (configure to match dark palette)

| Component | Use |
|-----------|-----|
| Button | Form submissions, primary and secondary actions |
| Input | Text fields, search |
| Select | Dropdown menus, filter controls |
| Dialog | Downtime categorization modal, confirmation dialogs |
| Dropdown | Context menus, action menus |
| Badge | Role labels, order status tags |
| Tabs | Machine detail view tabs (State / Events / Downtime) |
| Table | Machine list, user list, shift list |
| Skeleton | Loading placeholders |
| Toast | Success/error feedback for mutations |

### Build custom

| Component | File | Description |
|-----------|------|-------------|
| `MachineStateChip` | `src/components/ui/MachineStateChip.tsx` | Colored state pill using `state-*` tokens; `running` state has pulse ring animation via `animate-state-pulse`; shows lucide icon + label; supports `sm / md / lg` sizes |
| `OEEGauge` | `src/components/ui/OEEGauge.tsx` | ECharts ring chart showing OEE percentage; colored by OEE band; percentage displayed in center in IBM Plex Mono |
| `ProductionProgressBar` | `src/components/ui/ProductionProgress.tsx` | Actual vs planned progress bar; color transitions by completion rate vs elapsed time; shows `312 / 500` count |
| `DowntimeParetoChart` | `src/components/ui/DowntimeParetoChart.tsx` | ECharts horizontal bar chart; bars ordered by duration descending; labels show category code, duration, and percentage |
| `ShiftTimeline` | `src/components/ui/ShiftTimeline.tsx` | ECharts time-axis chart; segments colored by machine state; labeled with duration |
| `LoadingCard` | `src/components/ui/LoadingCard.tsx` | Pulse skeleton card; `rows` prop controls skeleton row count |

---

## Layout system

### Sidebar navigation

- Width: `240px` (expanded), `56px` (icon-only collapsed)
- Background: `surface-1`
- Right border: `surface-border`
- Active item: left border `2px` `accent-primary`, background `surface-2`, icon `accent-primary`
- Collapse toggle: chevron button at bottom
- Logo: "GreyHook" in IBM Plex Mono `text-base font-bold` with `Factory` lucide icon

### Main content area

- Fills remaining width after sidebar
- Padding: `24px` on all sides
- Max-width: unconstrained on dashboard pages; `max-w-6xl` on admin pages

### Dashboard grid

- CSS grid: 12 columns
- Gap: `24px`
- Cards use `col-span-*` to define width

### Card

| Property | Value |
|----------|-------|
| Background | `surface-1` |
| Border | `1px solid surface-border` |
| Border radius | `12px` |
| Padding | `20px` |
| Section heading | IBM Plex Mono, `text-xs`, `uppercase`, `tracking-widest`, `text-secondary` |

### Mobile breakpoint

- `768px`: sidebar collapses to bottom navigation bar (4 primary icons)
- Below `768px`: single-column grid; cards stack vertically

---

## Motion and animation

| Element | Animation | Duration | Purpose |
|---------|-----------|----------|---------|
| `MachineStateChip` running ring | `animate-state-pulse` (custom keyframe: scale 1→1.5, opacity 0.3→0) | 2s infinite | Indicates active production at a glance |
| State transition | CSS `transition-colors` | 300ms ease-in-out | Smooth state color changes on SSE updates |
| Data refresh fade | `opacity-0 → opacity-100` on data arrival | 200ms | Prevents flicker when query data loads |
| Loading skeleton | Tailwind `animate-pulse` | 1.5s cubic-bezier | Indicates loading; matches card dimensions |

**Rule**: every animation carries information or provides loading feedback. No decorative animations. The `animate-state-pulse` ring is the only self-looping animation in the system.

---

## Iconography

Library: `lucide-react` at `0.460.0`.

### Machine state icons

| State | Icon | Size |
|-------|------|------|
| running | `Zap` | 13–18px depending on context |
| idle | `Pause` | 13–18px |
| fault | `AlertTriangle` | 13–18px |
| offline | `WifiOff` | 13–18px |

### Navigation icons

| Page | Icon |
|------|------|
| Factory overview | `LayoutDashboard` |
| Machine detail | `Activity` |
| OEE dashboard | `BarChart3` |
| Downtime | `Timer` |
| AI investigations | `Bot` |
| Admin | `Settings` |

**Icon usage rule**: icons are always paired with a label except in collapsed sidebar mode. Icon color inherits from the parent element's text color. State icons in `MachineStateChip` take the state color directly.

---

## Accessibility

- Color is never the sole differentiator for machine states — icon + color together
- Focus rings: `2px solid accent-primary` with `2px offset`
- Contrast: all text on `surface-1`/`surface-2` backgrounds meets WCAG AA
- Interactive elements have `aria-label` when label is not visible (collapsed sidebar)
- OEE gauges include screen-reader text with the numeric value
- Production progress bar uses `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`

---

## Environment context

This UI is used in:
- **Control room monitors**: 1920×1080 or larger, strong ambient lighting, viewed from 1–3 meters
- **Supervisor tablets**: 10–13" screens, used while walking the floor
- **Manager laptops/phones**: standard desk environment

The dark-first palette reduces eye strain under ambient fluorescent lighting. High-contrast state colors are legible at viewing distance. Touch targets on tablet views are minimum `44px` tall.
