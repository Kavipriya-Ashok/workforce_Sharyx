/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        primary: {
          DEFAULT: "#10b981", // WhatsApp Emerald Green / Emerald Accent
          foreground: "#ffffff",
        },
        accent: {
          DEFAULT: "#6366f1", // Indigo / AI Copilot
          foreground: "#ffffff",
        },
        border: "hsl(var(--border))",
      },
    },
  },
  plugins: [],
}
