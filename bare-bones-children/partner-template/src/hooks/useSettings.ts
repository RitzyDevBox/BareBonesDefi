import { useEffect, useState } from "react";
import { DEPLOYMENT_CONFIG } from "../config/deployment";

const SETTINGS_KEY = "app-settings";

interface Settings {
  showTestnets: boolean;
}

const defaults: Settings = { showTestnets: DEPLOYMENT_CONFIG.showTestnetsByDefault };

function load(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) } as Settings;
  } catch {
    return defaults;
  }
}

function save(s: Settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(load);

  useEffect(() => { save(settings); }, [settings]);

  function toggle<K extends keyof Settings>(key: K) {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return { settings, toggle };
}
