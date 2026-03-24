import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17181c",
        sand: "#efe7db",
        clay: "#b9653b",
        moss: "#556451",
        fog: "#d5ccc0",
        paper: "#f8f4ed",
        charcoal: "#15171b",
        ember: "#c97345",
        line: "#c8bcad"
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "ui-serif", "Georgia", "serif"]
      }
    }
  },
  plugins: []
};

export default config;
