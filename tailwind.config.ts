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
        // Play Your Part custom accessible color palette
        primary: {
          DEFAULT: "#0F172A", // Deep Navy Blue
          foreground: "#F8FAFC",
        },
        secondary: {
          DEFAULT: "#0F766E", // Slate Teal
          foreground: "#F8FAFC",
        },
        accent: {
          DEFAULT: "#EA580C", // Warm Amber
          foreground: "#F8FAFC",
        },
        background: "#F8FAFC", // Warm Light Gray
        foreground: "#0F172A",
        muted: {
          DEFAULT: "#64748B", // Slate Gray for inactive/secondary items
          foreground: "#0F172A",
        },
      },
    },
  },
  plugins: [],
};
export default config;
