import { baseTheme } from "./baseTheme";
import { AppTheme, ThemeMode } from "./theme";
import fullImg from "../assets/background/bear-bone-full-dark.png";

export const lightTheme: AppTheme = {
  mode: ThemeMode.LIGHT,
  ...baseTheme,
  colors: {
    // Soft bone / parchment background
    background: "#f4f5f3",
    surface: "#f8f9fa",
    surfaceHover: "rgba(0, 0, 0, 0.035)",

    // Borders softened (less contrast than before)
    border: "#d6d9de",
    borderHover: "#b6bcc6",

    // Match dark theme blue family
    primary: "#3b82f6",
    primaryHover: "#2563eb",

    // Neutral slate secondary
    secondary: "#64748b",
    secondaryHover: "#475569",

    // Status colors — darkened from neon/mid to readable on light bg
    success: "#16a34a",   // green-700
    warn: "#d97706",      // amber-600
    error: "#dc2626",     // red-600

    text: {
      main: "#111827",
      muted: "#6b7280",
      label: "#4b5563",
    },
  },

  appBackground: {
    ...baseTheme.appBackground,
    fullImage: fullImg,
    honeycomb: {
      enabled: true,
      hexSize: 40,
      opacity: 0.06,            // lighter than before
      animationSpeed: 0.8,
      backgroundColor: "#faf7f2", // parchment
      hue: 38,                   // warm honey
      saturation: 42,
      lightness: 52,
    },
  },
};
