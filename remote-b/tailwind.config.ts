import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        void: "#030304",
        surface: "#0F1115",
        stardust: "#94A3B8",
        boundary: "#1E293B",
        btc: {
          orange: "#F7931A",
          burnt: "#EA580C",
          gold: "#FFD600",
        },
      },
      fontFamily: {
        heading: [
          "'Space Grotesk'",
          "'Inter'",
          "system-ui",
          "sans-serif",
        ],
        body: ["'Inter'", "'Helvetica Neue'", "system-ui", "sans-serif"],
        sans: ["'Inter'", "'Helvetica Neue'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "'Courier New'", "monospace"],
      },
      boxShadow: {
        "glow-orange": "0 0 20px -5px rgba(234, 88, 12, 0.5)",
        "glow-orange-lg": "0 0 30px -5px rgba(247, 147, 26, 0.6)",
        "card-ambient": "0 0 50px -10px rgba(247, 147, 26, 0.12)",
        "card-hover": "0 0 30px -10px rgba(247, 147, 26, 0.22)",
      },
      backgroundImage: {
        "gradient-btc": "linear-gradient(to right, #EA580C, #F7931A)",
        "gradient-value": "linear-gradient(to right, #F7931A, #FFD600)",
      },
    },
  },
  plugins: [],
} satisfies Config;
