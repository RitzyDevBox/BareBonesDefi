import { IconButton } from "../components/Button/IconButton";
import { ThemeMode } from "../themes/theme";
import { useThemeMode } from "./useThemeMode";


export function ThemeToggle() {
  const { mode, toggle } = useThemeMode();
  const isDark = mode === ThemeMode.DARK;

  return (
    <IconButton
      onClick={toggle}
      shape='rounded'
      aria-label="Toggle theme"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      style={{
        background: "transparent",
        border: "none",
      }}
    >
      {isDark ? "☀️" : "🌙"}
    </IconButton>
  );
}
