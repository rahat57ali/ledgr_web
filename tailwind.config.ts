import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  darkMode: ["class"],
  theme: {
    extend: {
      boxShadow: {
        ledgr: "0 16px 50px rgba(0, 0, 0, 0.18)",
        soft: "0 8px 28px rgba(17, 24, 39, 0.08)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      colors: {
        ledgr: {
          cyan: "#00F0FF",
          purple: "#8A2BE2",
          danger: "#EF4444",
          success: "#10B981",
          dark: "#0A0A0A",
          card: "#141414",
          elevated: "#1A1A1A",
        },
      },
      backgroundImage: {
        "ledgr-glow":
          "radial-gradient(circle at top left, rgba(0,240,255,0.18), transparent 34%), radial-gradient(circle at bottom right, rgba(138,43,226,0.16), transparent 30%)",
      },
    },
  },
  plugins: [],
};

export default config;
