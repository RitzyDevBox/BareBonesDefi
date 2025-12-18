import { useThemeMode } from "../themes/ThemeModeContext";
import { ThemeMode } from "../themes/theme";

export function ThemeToggle() {
  const { mode, toggle } = useThemeMode();

  return (
    <button onClick={toggle}>
      {mode === ThemeMode.DARK ? "Light Mode" : "Dark Mode"}
    </button>
  );
}
