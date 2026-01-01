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

let interactionStyleEl: HTMLStyleElement | null = null;

export function applyThemeToDocument(theme: AppTheme) {
  const root = document.documentElement;
  const cssVars = themeToCssVars(theme);

  Object.entries(cssVars).forEach(([key, val]) => {
    root.style.setProperty(key, val);
  });

  // 👇 Inject interaction styles once
  if (!interactionStyleEl) {
    interactionStyleEl = document.createElement("style");
    interactionStyleEl.innerHTML = `
      /* Base surface defaults (ALL surfaces) */
      :root {
        --surface-bg: var(--colors-surface);
        --surface-border: var(--colors-border);
      }

      /* Clickable surfaces override on interaction */
      [data-clickable="true"]:hover {
        --surface-border: var(--colors-borderHover);
      }

      [data-clickable="true"][data-hover-bg="true"]:hover {
        --surface-bg: var(--colors-surfaceHover);
      }

      [data-clickable="true"]:active {
        transform: scale(0.98);
      }
    `;



    document.head.appendChild(interactionStyleEl);
  }
}


