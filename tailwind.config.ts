import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        /* TC Group-inspired palette: orange, charcoal, warm white and soft neutral grey. */
        surface: "#f7f5f2",
        "surface-dim": "#dedbd6",
        "surface-bright": "#ffffff",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#fbfaf8",
        "surface-container": "#f1efec",
        "surface-container-high": "#e8e5e1",
        "surface-container-highest": "#dedbd6",
        "on-surface": "#171717",
        "on-surface-variant": "#5f5a55",
        "inverse-surface": "#171717",
        "inverse-on-surface": "#ffffff",
        outline: "#8f8982",
        "outline-variant": "#d5d0ca",
        primary: "#f15a24",
        "on-primary": "#ffffff",
        "primary-container": "#ffe0d2",
        "on-primary-container": "#6d2108",
        secondary: "#242424",
        "on-secondary": "#ffffff",
        "secondary-container": "#e6e3df",
        error: "#b42318",
        "on-error": "#ffffff",
        "error-container": "#fddad5",
        "on-error-container": "#7a1b13",
        background: "#f7f5f2",
        "on-background": "#171717",
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
