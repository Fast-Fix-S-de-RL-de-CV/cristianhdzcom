import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        "bg-2": "var(--bg-2)",
        "bg-3": "var(--bg-3)",
        ink: "var(--ink)",
        "ink-2": "var(--ink-2)",
        muted: "var(--muted)",
        line: "var(--line)",
        "line-2": "var(--line-2)",
        accent: "var(--accent)",
        "accent-soft": "var(--accent-soft)",
        warm: "var(--warm)",
        "warm-soft": "var(--warm-soft)",
        green: "var(--green)",
        red: "var(--red)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Poppins", "sans-serif"],
        serif: ["var(--font-serif)", "Poppins", "serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
      letterSpacing: {
        tightest: "-0.04em",
        tighter: "-0.025em",
        tight2: "-0.015em",
        body: "-0.005em",
        eyebrow: "0.08em",
        eyebrowWide: "0.12em",
      },
      animation: {
        marquee: "marquee 30s linear infinite",
        "ring-pulse": "ring-pulse 2s ease-out infinite",
        "pulse-dot": "pulse-dot 1.8s ease-in-out infinite",
        shine: "shine 3s linear infinite",
        "orb-spin": "orb-spin 60s linear infinite",
        "slide-up": "slide-up 0.3s ease-out",
        shake: "shake 0.4s ease-in-out",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "ring-pulse": {
          "0%": { transform: "scale(1)", opacity: "1" },
          "100%": { transform: "scale(1.35)", opacity: "0" },
        },
        "pulse-dot": {
          "0%,100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.6)", opacity: "0.3" },
        },
        shine: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "orb-spin": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "slide-up": {
          "0%": { transform: "translateY(100%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        shake: {
          "0%,100%": { transform: "translateX(0)" },
          "20%,60%": { transform: "translateX(-8px)" },
          "40%,80%": { transform: "translateX(8px)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
