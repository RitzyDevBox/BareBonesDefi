import { baseTheme } from "./baseTheme";
import { AppTheme, ThemeMode } from "./theme";
import fullImg from "../assets/background/bear-bone-full-dark.png";

export const lightTheme: AppTheme = {
  mode: ThemeMode.LIGHT,
  ...baseTheme,
  colors: {
    background: "#f7f6f2",
    surface: "#ffffff",
    surfaceHover: "rgba(0,0,0,0.03)",

    border: "#e4e2dc",
    borderHover: "#cfccc3",

    primary: "oklch(0.56 0.14 225)",
    primaryHover: "oklch(0.50 0.14 225)",

    secondary: "#e4e2dc",
    secondaryHover: "#cfccc3",

    success: "oklch(0.62 0.14 148)",
    warn: "oklch(0.72 0.14 78)",
    error: "oklch(0.58 0.17 25)",

    text: {
      main: "#111112",
      muted: "#5a5a60",
      label: "#8a8a92",
    },
  },

  appBackground: {
    ...baseTheme.appBackground,
    fullImage: fullImg,
    honeycomb: {
      enabled: true,
      hexSize: 40,
      opacity: 0.05,
      animationSpeed: 0.8,
      backgroundColor: "#f7f6f2",
      hue: 225,
      saturation: 30,
      lightness: 55,
    },
  },
};
