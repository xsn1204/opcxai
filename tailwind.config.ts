import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Design tokens
        brand: {
          DEFAULT: "#6366f1",
          dark: "#4f46e5",
          light: "#818cf8",
        },
        // Talent side (dark theme)
        talent: {
          bg: "#0f172a",
          surface: "#1e293b",
          border: "#334155",
          text: "#f8fafc",
          muted: "#94a3b8",
        },
        // Corp side (light theme)
        corp: {
          bg: "#f8fafc",
          surface: "#ffffff",
          border: "#e2e8f0",
          text: "#1e293b",
          muted: "#64748b",
        },
      },
      fontFamily: {
        mono: ["'Fira Code'", "monospace"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "blink": "blink 1s infinite",
        "fade-in": "fadeIn 0.5s ease",
        "slide-up": "slideUp 0.3s ease",
      },
      keyframes: {
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideUp: {
          from: { transform: "translateY(10px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
      },
      boxShadow: {
        "glow-indigo": "0 0 20px rgba(99, 102, 241, 0.2)",
        "glow-sm": "0 0 10px rgba(99, 102, 241, 0.15)",
      },
    },
  },
  plugins: [],
};

export default config;
