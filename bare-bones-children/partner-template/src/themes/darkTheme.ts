import { AppTheme, ThemeMode } from "./theme";

export const darkTheme: AppTheme = {
  mode: ThemeMode.DARK,

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

  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  radius: { sm: 6, md: 10, lg: 14 },

  shadows: {
    soft: "0 4px 12px rgba(0,0,0,0.25)",
    medium: "0 8px 24px rgba(0,0,0,0.35)",
  },

  textStyles: {
    title: { fontSize: 20, fontWeight: 600 },
    label: { fontSize: 14, fontWeight: 500 },
    body: { fontSize: 14 },
  },
};
