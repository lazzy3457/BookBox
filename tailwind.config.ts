import type { Config } from "tailwindcss";

// Les couleurs pointent vers des variables CSS définies par thème dans globals.css
// (`data-theme="cosy"` par défaut, `data-theme="nuit"` pour l'ancienne DA premium).
const themeColor = (name: string) => `rgb(var(--c-${name}) / <alpha-value>)`;

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: themeColor("ink"),
        night: themeColor("night"),
        panel: themeColor("panel"),
        panelSoft: themeColor("panel-soft"),
        slateCard: themeColor("slate-card"),
        line: themeColor("line"),
        paper: themeColor("paper"),
        muted: themeColor("muted"),
        mint: themeColor("mint"),
        lime: themeColor("lime"),
        coral: themeColor("coral"),
        amber: themeColor("amber"),
        sky: themeColor("sky")
      },
      borderRadius: {
        DEFAULT: "var(--radius)"
      },
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        display: ["var(--font-heading)", "Georgia", "serif"]
      },
      boxShadow: {
        glow: "var(--shadow-glow)",
        poster: "var(--shadow-poster)"
      }
    }
  },
  plugins: []
};

export default config;
