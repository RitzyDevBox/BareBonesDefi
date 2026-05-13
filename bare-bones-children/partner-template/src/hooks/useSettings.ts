import { useEffect, useSyncExternalStore } from "react";
import { DEPLOYMENT_CONFIG } from "../config/deployment";

const SETTINGS_KEY = "app-settings";

/** Top-level boolean settings the user can toggle from the Settings UI. */
export enum SettingsKey {
  ShowTestnets = "showTestnets",
}

interface Settings {
  [SettingsKey.ShowTestnets]: boolean;
}

const defaults: Settings = {
  [SettingsKey.ShowTestnets]: DEPLOYMENT_CONFIG.showTestnetsByDefault,
};

function load(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
}

function save(s: Settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

// Module-level state so every consumer of useSettings sees the same value and
// re-renders together when any tab toggles a flag (otherwise per-component
// useState copies would silently diverge — Header sees a flag flip but the
// nav config wouldn't, etc.).
let current: Settings = load();
const subscribers = new Set<() => void>();

function setState(next: Settings) {
  current = next;
  subscribers.forEach((fn) => fn());
}

export function useSettings() {
  const settings = useSyncExternalStore(
    (cb) => {
      subscribers.add(cb);
      return () => subscribers.delete(cb);
    },
    () => current,
    () => current,
  );

  useEffect(() => { save(settings); }, [settings]);

  function toggle(key: SettingsKey) {
    setState({ ...current, [key]: !current[key] });
  }

  return { settings, toggle };
}
