import { createContext, useContext, useState } from "react";
import { ThemeMode } from "./theme";

interface ThemeModeState {
  mode: ThemeMode;
  toggle: () => void;
}

const ThemeModeContext = createContext<ThemeModeState>({
  mode: ThemeMode.DARK,
  toggle: () => {},
});

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

export function useThemeMode() {
  return useContext(ThemeModeContext);
}
