import { useEffect, useState } from "react";
import { ThemeMode } from "./theme";
import { ThemeModeContext } from "./useThemeMode";

const STORAGE_KEY = "theme-mode";

export function ThemeModeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === ThemeMode.LIGHT || stored === ThemeMode.DARK) return stored;
    return ThemeMode.DARK;
  });

  const toggle = () => {
    setMode((m) =>
      m === ThemeMode.DARK ? ThemeMode.LIGHT : ThemeMode.DARK
    );
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  return (
    <ThemeModeContext.Provider value={{ mode, toggle }}>
      {children}
    </ThemeModeContext.Provider>
  );
}
