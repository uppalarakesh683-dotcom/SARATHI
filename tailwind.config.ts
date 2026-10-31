import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        sarathi: {
          dark: "#030712",
          navy: "#070d1e",
          card: "rgba(11, 20, 44, 0.7)",
          cardBorder: "rgba(56, 189, 248, 0.2)",
          cyan: "#00f2fe",
          cyanGlow: "#06b6d4",
          blue: "#38bdf8",
          purple: "#a855f7",
          gold: "#fbbf24",
          accent: "#4f46e5",
          danger: "#f43f5e",
          success: "#10b981",
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "glass-gradient": "linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)",
        "sarathi-glow": "radial-gradient(circle at 50% 50%, rgba(6, 182, 212, 0.15), transparent 70%)",
      },
      boxShadow: {
        "neon-cyan": "0 0 20px rgba(6, 182, 212, 0.4), 0 0 40px rgba(6, 182, 212, 0.2)",
        "neon-blue": "0 0 20px rgba(56, 189, 248, 0.4), 0 0 40px rgba(59, 130, 246, 0.2)",
        "neon-purple": "0 0 20px rgba(168, 85, 247, 0.4), 0 0 40px rgba(168, 85, 247, 0.2)",
        "glass": "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
      },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "float": "float 6s ease-in-out infinite",
        "orbit-slow": "spin 25s linear infinite",
        "orbit-reverse": "spin 35s linear infinite reverse",
        "scan-line": "scanline 8s linear infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        scanline: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;

