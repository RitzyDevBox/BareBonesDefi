import { baseTheme } from "./baseTheme";
import { AppTheme, ThemeMode } from "./theme";
import leftImg from "../assets/background/bear-bone-left-light.png"
import rightImg from "../assets/background/bear-bone-right-light.png"

export const lightTheme: AppTheme = {
  mode: ThemeMode.LIGHT,
  ...baseTheme,
  colors: {
    background: "#f7f9fb",
    surface: "#ffffff",
    border: "#d1d5db",
    primary: "#2563eb",
    primaryHover: "#1d4ed8",
    secondary: "#6b7280",
    secondaryHover: "#4b5563",
    success: "#10b981",
    error: "#ef4444",
    text: {
      main: "#111827",
      muted: "#6b7280",
      label: "#374151",
    },
  },
  appBackground: {
    ...baseTheme.appBackground,
     leftImage: leftImg,
     rightImage: rightImg
  }
};
