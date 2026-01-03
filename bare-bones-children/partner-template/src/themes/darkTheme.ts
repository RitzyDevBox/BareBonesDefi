import { baseTheme } from "./baseTheme";
import { AppTheme, ThemeMode } from "./theme";
import fullImg from "../assets/background/bear-bone-full-dark.png";

export const darkTheme: AppTheme = {
  mode: ThemeMode.DARK,
  ...baseTheme,
  colors: {
    background: "#121826", // Slightly darker background for more contrast
    surface: "#1e2634",    // Slightly more refined surface color
    surfaceHover: "rgba(255, 255, 255, 0.06)", // Slightly more visible hover

    border: "#303a4a",     // Darker border for subtlety
    borderHover: "rgba(255, 255, 255, 0.3)",  // More visible border on hover

    primary: "#3b82f6",    // Softer, pleasant blue (keeping the same tone)
    primaryHover: "#2563eb", // Hover remains a bit more intense

    secondary: "#4b5d6a",  // Slightly muted secondary for a natural contrast
    secondaryHover: "#3a4b59", // Slightly darker secondary on hover

    success: "#34d399",     // Slightly more neutral green for success
    warn: "#fbbf24",        // Keeps a nice yellow, no change
    error: "#ef4444",       // Red remains vivid

    text: {
      main: "#e5e7eb",      // Light text still fine
      muted: "#a1b3c2",     // Muted text a bit lighter
      label: "#94a3b8",     // Keeps the same for consistency
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
      backgroundColor: "#1e1712", // Slightly deeper brown
      hue: 35,         // Warm golden honey remains
      saturation: 70,
      lightness: 58,   // Slightly brighter honeycomb
    }
  },
};
