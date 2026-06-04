import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#071017",
        night: "#0b1620",
        panel: "#101c26",
        panelSoft: "#162431",
        slateCard: "#1d2a35",
        line: "#263846",
        paper: "#f2ece2",
        muted: "#94a9b8",
        mint: "#00d474",
        lime: "#9ae66e",
        coral: "#ff6b57",
        amber: "#f5c451",
        sky: "#4ca3ff"
      },
      boxShadow: {
        glow: "0 20px 70px rgba(0, 212, 116, 0.16)",
        poster: "0 14px 34px rgba(0, 0, 0, 0.34)"
      }
    }
  },
  plugins: []
};

export default config;
