import { baseTheme } from "./baseTheme";
import { AppTheme, ThemeMode } from "./theme";

export const darkTheme: AppTheme = {
  mode: ThemeMode.DARK,
  ...baseTheme,
  colors: {
    background: "#0f121a",
    surface: "#1a1e29",
    border: "#2d323f",
    primary: "#2563eb",
    primaryHover: "#1d4ed8",
    secondary: "#475569",
    secondaryHover: "#364152",
    success: "#6ee7b7",
    error: "#ef4444",
    text: {
      main: "#e5e7eb",
      muted: "#9ca3af",
      label: "#94a3b8",
    },
  },
};
