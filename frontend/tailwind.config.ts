import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        /* ── Brand ── */
        brand: {
          DEFAULT:  "var(--brand)",
          hover:    "var(--brand-hover)",
          subtle:   "var(--brand-subtle)",
          muted:    "var(--brand-muted)",
          fg:       "var(--brand-fg)",
        },

        /* ── Semantic surface ── */
        bg: {
          DEFAULT: "var(--bg)",
          subtle:  "var(--bg-subtle)",
          muted:   "var(--bg-muted)",
        },

        /* ── Borders ── */
        border: {
          DEFAULT: "var(--border)",
          strong:  "var(--border-strong)",
        },

        /* ── Text ── */
        "text-primary":   "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-tertiary":  "var(--text-tertiary)",
        "text-disabled":  "var(--text-disabled)",

        /* ── States ── */
        success: {
          DEFAULT: "var(--success)",
          subtle:  "var(--success-subtle)",
        },
        warning: {
          DEFAULT: "var(--warning)",
          subtle:  "var(--warning-subtle)",
        },
        danger: {
          DEFAULT: "var(--danger)",
          subtle:  "var(--danger-subtle)",
        },

        /* ── Sidebar dark layer ── */
        sidebar: {
          bg:         'var(--sidebar-bg)',
          fg:         'var(--sidebar-fg)',
          'fg-muted': 'var(--sidebar-fg-muted)',
          border:     'var(--sidebar-border)',
          'hover-bg': 'var(--sidebar-hover-bg)',
        },

        /* ── Card surface (overrides bg-white) ── */
        white: "var(--bg-card)",

        /* ── Legacy aliases (keep OEE components working) ── */
        state: {
          running: "var(--success)",
          idle:    "var(--warning)",
          fault:   "var(--danger)",
          offline: "var(--neutral-400)",
        },
        oee: {
          "world-class": "var(--brand)",
          good:          "#E8603A",
          fair:          "var(--warning)",
          poor:          "var(--neutral-400)",
        },
        "accent-primary": "var(--brand)",
        "surface-0":      "var(--bg)",
        "surface-1":      "var(--bg-subtle)",
        "surface-2":      "var(--bg-muted)",
        "surface-border": "var(--border)",
        "text-muted":     "var(--text-tertiary)",
      },

      fontFamily: {
        display: ["Familjen Grotesk", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "Courier New", "monospace"],
        sans: ["IBM Plex Sans", "ui-sans-serif", "system-ui", "sans-serif"],
      },

      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
        xs:   ["0.75rem",   { lineHeight: "1rem" }],
        sm:   ["0.875rem",  { lineHeight: "1.25rem" }],
        base: ["1rem",      { lineHeight: "1.5rem" }],
        lg:   ["1.125rem",  { lineHeight: "1.75rem" }],
        xl:   ["1.25rem",   { lineHeight: "1.75rem" }],
        "2xl":["1.5rem",    { lineHeight: "2rem" }],
        "3xl":["1.875rem",  { lineHeight: "2.25rem" }],
      },

      borderRadius: {
        card: "8px",
      },

      boxShadow: {
        sm:   "0 1px 2px 0 rgb(0 0 0 / 0.04)",
        md:   "0 2px 8px 0 rgb(0 0 0 / 0.06)",
        lg:   "0 4px 16px 0 rgb(0 0 0 / 0.08)",
        ring: "var(--focus-ring)",
        card: "0 0 0 1px rgba(0,28,46,0.09), 0 2px 12px rgba(0,28,46,0.06), 0 1px 3px rgba(0,28,46,0.04)",
        "card-hover": "0 0 0 1px rgba(240,82,48,0.22), 0 8px 32px rgba(0,28,46,0.09), 0 0 28px rgba(240,82,48,0.07)",
      },

      keyframes: {
        "state-pulse": {
          "0%, 100%": { opacity: "0.3", transform: "scale(1)" },
          "50%":       { opacity: "0", transform: "scale(1.5)" },
        },
      },
      animation: {
        "state-pulse": "state-pulse 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
