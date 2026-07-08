import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Acento institucional (granate/rojo del escudo UCuenca). Uso puntual.
        granate: {
          50: "#fef2f3",
          100: "#fde3e5",
          500: "#e11d2b",
          600: "#c8102e",
          700: "#a80d26",
        },
      },
      fontFamily: {
        // Geist se carga en layout.tsx; aquí se hace el mapeo real de font-sans.
        sans: [
          "var(--font-geist-sans)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        // Sombras suaves en capas (estética SaaS moderna).
        card: "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.05)",
        elevated:
          "0 10px 30px -12px rgb(15 23 42 / 0.18), 0 4px 8px -4px rgb(15 23 42 / 0.08)",
        brand: "0 8px 24px -10px rgb(30 58 138 / 0.45)",
      },
    },
  },
  plugins: [],
};
export default config;
