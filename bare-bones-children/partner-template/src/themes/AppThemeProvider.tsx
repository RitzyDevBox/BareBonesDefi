import { createContext, useContext, useEffect } from "react";
import { AppTheme } from "../themes/theme";
import { ThemeMode } from "../themes/theme";
import { lightTheme } from "../themes/lightTheme";
import { darkTheme } from "../themes/darkTheme";
import { applyThemeToDocument } from "../themes/createCssVars";
import { useThemeMode } from "../themes/ThemeModeContext";

const ThemeContext = createContext<AppTheme>(darkTheme);

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const { mode } = useThemeMode();

  const theme = mode === ThemeMode.LIGHT ? lightTheme : darkTheme;

  useEffect(() => applyThemeToDocument(theme), [theme]);

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
