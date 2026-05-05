import { useEffect, useSyncExternalStore } from "react";
import { DEPLOYMENT_CONFIG } from "../config/deployment";

const SETTINGS_KEY = "app-settings";

/** Top-level boolean settings the user can toggle from the Settings UI.
 *  Enum values double as object keys on `Settings` — keeping them in one place
 *  means `toggle(SettingsKey.ShowTestnets)` is the only string the code emits. */
export enum SettingsKey {
  ShowTestnets = "showTestnets",
  FeaturesInDevelopment = "featuresInDevelopment",
}

/** Per-feature toggles that live behind the master `FeaturesInDevelopment`
 *  switch. Add a new flag here AND a UI row in SettingsModal whenever a new
 *  in-development feature lands (see defi-frontend skill). */
export enum DevFeatureKey {
  Members = "members",
}

// Runtime feature toggles. Build-time gates that depend on deployment target
// still live in `src/constants/featureFlags.ts`; this object is for
// in-development features the user can flip on/off from the Settings UI.
export type DevFeatureFlags = Record<DevFeatureKey, boolean>;

interface Settings {
  [SettingsKey.ShowTestnets]: boolean;
  /** Master kill-switch — when false, every flag in `devFlags` is treated as off. */
  [SettingsKey.FeaturesInDevelopment]: boolean;
  devFlags: DevFeatureFlags;
}

const defaults: Settings = {
  [SettingsKey.ShowTestnets]: DEPLOYMENT_CONFIG.showTestnetsByDefault,
  [SettingsKey.FeaturesInDevelopment]: false,
  devFlags: { [DevFeatureKey.Members]: false },
};

function load(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      ...defaults,
      ...parsed,
      devFlags: { ...defaults.devFlags, ...(parsed.devFlags || {}) },
    };
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

  function toggleDevFlag(key: DevFeatureKey) {
    setState({ ...current, devFlags: { ...current.devFlags, [key]: !current.devFlags[key] } });
  }

  return { settings, toggle, toggleDevFlag };
}

/** Read a single dev flag, gated by the master `featuresInDevelopment` switch.
 *  Use this anywhere you need to ask "is this in-development feature visible?"
 *  without having to re-implement the master AND granular check at every call. */
export function useDevFeature(key: DevFeatureKey): boolean {
  const { settings } = useSettings();
  return settings[SettingsKey.FeaturesInDevelopment] && settings.devFlags[key];
}
