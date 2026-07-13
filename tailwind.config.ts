import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pastel: {
          pink: "#FFD1DC",
          blue: "#BFD7FF",
          cream: "#FFF8F0",
          gold: "#E6B800",
          pinkDeep: "#FF9CB6",
          blueDeep: "#8FB8FF",
          green: "#A5D6A7",
          greenDeep: "#66BB6A",
        },
      },
      keyframes: {
        "reel-spin": {
          "0%": { transform: "translateY(0)" },
          "100%": { transform: "translateY(-66.6%)" },
        },
      },
      animation: {
        "reel-spin": "reel-spin 0.1s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
