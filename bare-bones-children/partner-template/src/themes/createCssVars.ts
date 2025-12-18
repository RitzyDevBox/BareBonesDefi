import { AppTheme } from "./theme";

export function themeToCssVars(theme: AppTheme): Record<string, string> {
  const vars: Record<string, string> = {};

  // Flatten nested objects -> CSS vars
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function recurse(obj: any, prefix: string = "") {
    Object.entries(obj).forEach(([key, val]) => {
      const name = prefix ? `${prefix}-${key}` : key;

      if (typeof val === "object" && val !== null) {
        recurse(val, name);
      } else {
        vars[`--${name}`] = String(val);
      }
    });
  }

  recurse(theme);

  return vars;
}

export function applyThemeToDocument(theme: AppTheme) {
  const root = document.documentElement;
  const cssVars = themeToCssVars(theme);

  Object.entries(cssVars).forEach(([key, val]) => {
    root.style.setProperty(key, val);
  });
}
