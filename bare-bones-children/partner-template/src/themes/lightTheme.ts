import { baseTheme } from "./baseTheme";
import { AppTheme, ThemeMode } from "./theme";
import fullImg from "../assets/background/bear-bone-full-dark.png";

export const lightTheme: AppTheme = {
  mode: ThemeMode.LIGHT,
  ...baseTheme,
  colors: {
    background: "#f7f9fb",
    surface: "#ffffff",
    surfaceHover: "rgba(0, 0, 0, 0.03)",

    border: "#d1d5db",
    borderHover: "#9ca3af",

    primary: "#2563eb",
    primaryHover: "#1d4ed8",

    secondary: "#6b7280",
    secondaryHover: "#4b5563",

    success: "#10b981",
    warn: "#f59e0b",
    error: "#ef4444",

    text: {
      main: "#111827",
      muted: "#6b7280",
      label: "#374151",
    },
  },
  appBackground: {
    ...baseTheme.appBackground,
    fullImage: fullImg,
    honeycomb: {
      enabled: true,
      hexSize: 40,
      opacity: 0.08,
      animationSpeed: 0.8,
      backgroundColor: "#faf7f2",
      hue: 38,
      saturation: 45,
      lightness: 50
    }
  },
};
