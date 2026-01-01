import { baseTheme } from "./baseTheme";
import { AppTheme, ThemeMode } from "./theme";
import fullImg from "../assets/background/bear-bone-full-dark.png";

export const darkTheme: AppTheme = {
  mode: ThemeMode.DARK,
  ...baseTheme,
  colors: {
    background: "#0f121a",
    surface: "#1a1e29",
    surfaceHover: "rgba(255, 255, 255, 0.04)",

    border: "#2d323f",
    borderHover: "rgba(255, 255, 255, 0.2)",

    primary: "#2563eb",
    primaryHover: "#1d4ed8",

    secondary: "#475569",
    secondaryHover: "#364152",

    success: "#6ee7b7",
    warn: "#fbbf24",
    error: "#ef4444",

    text: {
      main: "#e5e7eb",
      muted: "#9ca3af",
      label: "#94a3b8",
    },
  },
  appBackground: {
    ...baseTheme.appBackground,
    fullImage: fullImg,
    honeycomb: {
      enabled: true,
      hexSize: 40,
      opacity: 0.12,
      animationSpeed: 0.8,
      backgroundColor: "#1a1410",  // Deep brown/black
      hue: 35,         // Warm golden honey
      saturation: 70,
      lightness: 60
    }
  },
};
