import { createContext, useContext } from "react";
import { ThemeMode } from "./theme";

interface ThemeModeState {
  mode: ThemeMode;
  toggle: () => void;
}


export const ThemeModeContext = createContext<ThemeModeState>({
  mode: ThemeMode.DARK,
  toggle: () => {},
});

export function useThemeMode() {
  return useContext(ThemeModeContext);
}
