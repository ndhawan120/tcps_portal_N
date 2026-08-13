import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        /* TC Professional Services / Kinetic Professional palette. */
        surface: "#f9f9f9",
        "surface-dim": "#dadada",
        "surface-bright": "#f9f9f9",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f3f3f3",
        "surface-container": "#eeeeee",
        "surface-container-high": "#e8e8e8",
        "surface-container-highest": "#e2e2e2",
        "on-surface": "#1a1c1c",
        "on-surface-variant": "#5d4038",
        "inverse-surface": "#2f3131",
        "inverse-on-surface": "#f1f1f1",
        outline: "#926f66",
        "outline-variant": "#e7bdb2",
        primary: "#ad2c00",
        "on-primary": "#ffffff",
        "primary-container": "#d83900",
        "on-primary-container": "#fffbff",
        secondary: "#242424",
        "on-secondary": "#ffffff",
        "secondary-container": "#e2e2e2",
        error: "#ba1a1a",
        "on-error": "#ffffff",
        "error-container": "#ffdad6",
        "on-error-container": "#93000a",
        background: "#f9f9f9",
        "on-background": "#1a1c1c",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      borderRadius: {
        sm: "0.125rem",
        DEFAULT: "0.25rem",
        md: "0.375rem",
        lg: "0.5rem",
        xl: "0.75rem",
      },
    },
  },
  plugins: [],
};
export default config;
