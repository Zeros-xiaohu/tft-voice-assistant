import type { Config } from "tailwindcss"

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#FFFFFF",
        card: "#FFFFFF",
        textPrimary: "#1D1D1F",
        textSecondary: "#8E8E93",
        accent: "#4F46FF",
        accentLight: "#EEEDFF",
        success: "#34C759",
        divider: "#F2F2F7",
        warmGray: "#F9F9FB",
      },
      borderRadius: {
        card: "20px",
        full: "999px",
      },
      fontFamily: {
        sans: ['"PingFang SC"', '"SF Pro Display"', '"Inter"', "system-ui", "sans-serif"],
      },
      boxShadow: {
        mic: "0 4px 24px rgba(79, 70, 255, 0.15)",
        micActive: "0 4px 32px rgba(79, 70, 255, 0.25)",
        card: "0 1px 3px rgba(0, 0, 0, 0.04)",
      },
      animation: {
        "pulse-ring": "pulseRing 2s ease-out infinite",
        "fade-in": "fadeIn 0.35s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
      },
      keyframes: {
        pulseRing: {
          "0%": { transform: "scale(1)", opacity: "0.4" },
          "100%": { transform: "scale(1.4)", opacity: "0" },
        },
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
}
export default config
