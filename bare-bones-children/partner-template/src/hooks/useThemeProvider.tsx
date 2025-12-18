import { createContext, useContext, useEffect } from "react";
import { AppTheme, ThemeMode } from "../themes/theme";
import { lightTheme } from "../themes/lightTheme";
import { darkTheme } from "../themes/darkTheme";
import { applyThemeToDocument } from "../themes/createCssVars";

const ThemeContext = createContext<AppTheme>(darkTheme);

export function AppThemeProvider({
  mode = ThemeMode.DARK,
  children,
}: {
  mode?: ThemeMode;
  children: React.ReactNode;
}) {
  const theme = mode === ThemeMode.LIGHT ? lightTheme : darkTheme;

  useEffect(() => applyThemeToDocument(theme), [theme]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
