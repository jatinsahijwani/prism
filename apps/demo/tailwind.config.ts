import type { Config } from "tailwindcss";

// Prism brand: black background, white prism, a single white ray refracting into a VIBGYOR
// spectrum used as the per-step accent system.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#050507", // near-black canvas
        panel: "#0b0c11", // raised surface
        panel2: "#101118",
        hair: "#1c1d26", // hairline borders
        mute: "#8a8d9b", // secondary text
        spectrum: {
          violet: "#8b5cf6",
          indigo: "#6366f1",
          blue: "#38bdf8",
          green: "#34d399",
          yellow: "#fbbf24",
          orange: "#fb923c",
          red: "#f87171",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      maxWidth: { content: "1080px" },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: { "100%": { transform: "translateX(100%)" } },
        "ray-pan": {
          "0%,100%": { opacity: "0.7" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.16,1,0.3,1) both",
        shimmer: "shimmer 1.5s infinite",
        "ray-pan": "ray-pan 4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
