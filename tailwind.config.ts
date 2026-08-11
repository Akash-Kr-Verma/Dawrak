import type { Config } from "tailwindcss";

/**
 * Dawrak design system.
 *
 * One palette, used the same way on every screen:
 *
 *   brand    violet   — the product, primary actions, active navigation
 *   mentor   teal     — the mentoring half (share, reviews, ripple tree)
 *   spark    amber    — points, streaks, "your attention is wanted here"
 *   success  green    — completed, correct
 *   danger   red      — incorrect, destructive, scam verdicts
 *   info     blue     — neutral explanation
 *
 * Colour carries meaning here; it is not decoration. A section does not get its
 * own colour just to look different from the section above it. Every value is
 * opaque — no translucent cards, no washed-out gradients — and every `ink`
 * shade clears AA against `surface`.
 */
const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Page and card surfaces.
        canvas: "#F6F5FB",
        surface: {
          DEFAULT: "#FFFFFF",
          sunken: "#F2F1F9",
        },
        // Text. `ink` 16:1 on white, `soft` 9.4:1, `muted` 5.3:1 — all AA.
        // `faint` is 3:1 and is only ever placeholder or disabled text.
        ink: {
          DEFAULT: "#1C1734",
          soft: "#45405F",
          muted: "#6B6688",
          faint: "#9A96AE",
        },
        line: {
          DEFAULT: "#E7E5F0",
          strong: "#D5D2E4",
        },
        brand: {
          50: "#F3F0FE",
          100: "#E7E1FD",
          200: "#CFC3FB",
          300: "#B29FF7",
          400: "#937BF0",
          500: "#7A5DE9",
          600: "#5A3FD6",
          700: "#4830AE",
          800: "#372587",
          900: "#241A57",
          DEFAULT: "#5A3FD6",
          foreground: "#FFFFFF",
        },
        mentor: {
          50: "#E6F6F3",
          100: "#C6EBE4",
          500: "#14907F",
          600: "#0F7668",
          700: "#0B5C51",
          800: "#08463E",
          DEFAULT: "#0F7668",
          foreground: "#FFFFFF",
        },
        spark: {
          50: "#FFF6E5",
          100: "#FDEBC4",
          500: "#E08A0C",
          600: "#C2700A",
          700: "#96530A",
          DEFAULT: "#C2700A",
          foreground: "#FFFFFF",
        },
        success: {
          50: "#E6F7EE",
          100: "#C6EDD8",
          600: "#0F7A47",
          700: "#0B5F37",
          800: "#08472A",
          DEFAULT: "#0F7A47",
          foreground: "#FFFFFF",
        },
        danger: {
          50: "#FDECEE",
          100: "#FAD3D8",
          600: "#C62D3E",
          700: "#9F2231",
          DEFAULT: "#C62D3E",
          foreground: "#FFFFFF",
        },
        info: {
          50: "#E8F0FE",
          100: "#CDDFFC",
          600: "#1D4FD8",
          700: "#1740AE",
          DEFAULT: "#1D4FD8",
          foreground: "#FFFFFF",
        },
      },
      borderRadius: {
        "4xl": "1.75rem",
      },
      boxShadow: {
        // Two elevations, both violet-tinted so shadows belong to the palette
        // rather than muddying it with neutral grey.
        card: "0 1px 2px rgba(28, 23, 52, 0.05), 0 2px 8px rgba(28, 23, 52, 0.04)",
        lift: "0 4px 12px rgba(28, 23, 52, 0.08), 0 12px 28px rgba(28, 23, 52, 0.07)",
        pop: "0 12px 32px rgba(90, 63, 214, 0.18)",
      },
      keyframes: {
        // Used by the interactive call: each line of the conversation arrives
        // rather than appearing. A call where six sentences pop into existence at
        // once reads as a transcript, not a conversation.
        "call-line-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "none" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "none" },
        },
        "pop-in": {
          "0%": { opacity: "0", transform: "scale(0.94)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "grow-in": {
          from: { opacity: "0", transform: "translateY(8px) scale(0.97)" },
          to: { opacity: "1", transform: "none" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "call-line-in": "call-line-in 260ms ease-out both",
        "fade-up": "fade-up 320ms ease-out both",
        "pop-in": "pop-in 220ms ease-out both",
        "grow-in": "grow-in 300ms ease-out both",
        shimmer: "shimmer 1.6s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
