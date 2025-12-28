import { IconButton } from "../components/IconButton";
import { useThemeMode } from "../themes/ThemeModeContext";
import { ThemeMode } from "../themes/theme";


export function ThemeToggle() {
  const { mode, toggle } = useThemeMode();
  const isDark = mode === ThemeMode.DARK;

  return (
    <IconButton
      onClick={toggle}
      aria-label="Toggle theme"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? "☀️" : "🌙"}
    </IconButton>
  );
}
