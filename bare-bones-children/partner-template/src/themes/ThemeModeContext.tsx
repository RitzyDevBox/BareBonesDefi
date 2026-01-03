import { useState } from "react";
import { ThemeMode } from "./theme";
import { ThemeModeContext } from "./useThemeMode";

export function ThemeModeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mode, setMode] = useState<ThemeMode>(ThemeMode.DARK);

  const toggle = () => {
    setMode((m) =>
      m === ThemeMode.DARK ? ThemeMode.LIGHT : ThemeMode.DARK
    );
  };

  return (
    <ThemeModeContext.Provider value={{ mode, toggle }}>
      {children}
    </ThemeModeContext.Provider>
  );
}