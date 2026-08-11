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
        // MILPill Design System
        primary: {
          DEFAULT: "#6D5DFB",
          soft: "#EDEBFF",
          foreground: "#FFFFFF",
        },
        success: {
          DEFAULT: "#1F9254",
          bg: "#E7F8ED",
        },
        info: {
          DEFAULT: "#2569D6",
          bg: "#E8F1FF",
        },
        warning: {
          DEFAULT: "#E1503B",
          bg: "#FFEBE9",
        },
        cta: {
          DEFAULT: "#3FCB6B",
        },
        background: "#F5F6FF",
        surface: "#FFFFFF",
        text: {
          heading: "#241B44",
          body: "#6B7280",
        },
        muted: {
          DEFAULT: "#94A3B8", // Kept for any legacy usage
          foreground: "#1E1B4B",
        },
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "press-in": {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(0.95)" },
          "100%": { transform: "scale(1)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        float: "float 3s ease-in-out infinite",
        "float-slow": "float 4.5s ease-in-out infinite",
        "float-delayed": "float 3s ease-in-out 1.5s infinite",
        "press-in": "press-in 0.2s ease-out",
        "fade-up": "fade-up 0.4s ease-out",
        shimmer: "shimmer 2s linear infinite",
      },
      borderRadius: {
        "4xl": "2rem",
      },
    },
  },
  plugins: [],
};
export default config;
