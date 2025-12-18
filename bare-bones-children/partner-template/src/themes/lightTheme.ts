import { AppTheme, ThemeMode } from "./theme";

export const lightTheme: AppTheme = {
  mode: ThemeMode.LIGHT,

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

  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  radius: { sm: 6, md: 10, lg: 14 },

  shadows: {
    soft: "0 4px 12px rgba(0,0,0,0.1)",
    medium: "0 8px 24px rgba(0,0,0,0.15)",
  },

  textStyles: {
    title: { fontSize: 20, fontWeight: 600 },
    label: { fontSize: 14, fontWeight: 500 },
    body: { fontSize: 14 },
  },
};
