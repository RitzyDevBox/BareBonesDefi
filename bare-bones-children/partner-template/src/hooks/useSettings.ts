import { useEffect, useState } from "react";

const SETTINGS_KEY = "app-settings";

interface Settings {
  showTestnets: boolean;
}

const defaults: Settings = { showTestnets: true };

function load(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) };
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
