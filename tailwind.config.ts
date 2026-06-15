import type { Config } from "tailwindcss";

/**
 * Tokens are the single source of truth in app/globals.css (:root) — see
 * docs/DESIGN-SYSTEM.md. Tailwind maps semantic names to those CSS variables
 * so utilities like `bg-primary` / `text-navy` / `bg-surface-tint` stay
 * token-driven and themeable.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./features/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "var(--primary)",
          600: "var(--primary-600)",
          700: "var(--primary-700)",
          300: "var(--primary-300)",
          fg: "var(--text-on-fill)",
        },
        navy: {
          DEFAULT: "var(--bb-navy)",
          700: "var(--bb-navy-700)",
          900: "var(--bb-navy-900)",
        },
        sky: "var(--sky)",
        teal: "var(--teal)",
        accent: "var(--accent)",
        silver: "var(--silver)",
        bg: "var(--bg)",
        surface: {
          DEFAULT: "var(--surface)",
          tint: "var(--surface-tint)",
          sunken: "var(--surface-sunken)",
        },
        ink: "var(--text)",
        muted: "var(--text-muted)",
        faint: "var(--text-faint)",
        border: {
          DEFAULT: "var(--border)",
          strong: "var(--border-strong)",
        },
        danger: { fg: "var(--danger-fg)", bg: "var(--danger-bg)" },
        success: { fg: "var(--success-fg)", bg: "var(--success-bg)" },
        warning: { fg: "var(--warning-fg)", bg: "var(--warning-bg)" },
        info: { fg: "var(--info-fg)", bg: "var(--info-bg)" },
      },
      borderRadius: {
        xs: "var(--radius-xs)",
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        pill: "var(--radius-pill)",
      },
      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        pop: "var(--shadow-pop)",
        primary: "var(--shadow-primary)",
        focus: "var(--shadow-focus)",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        display: ["var(--font-display)"],
      },
      transitionTimingFunction: {
        standard: "var(--ease-standard)",
        "out-expo": "var(--ease-out-expo)",
        spring: "var(--ease-spring)",
      },
      maxWidth: {
        content: "var(--content-max)",
      },
      zIndex: {
        sticky: "100",
        bottomnav: "200",
        fab: "250",
        drawer: "300",
        overlay: "400",
        modal: "500",
        toast: "600",
      },
    },
  },
  plugins: [],
};

export default config;
