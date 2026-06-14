import { useEffect, useSyncExternalStore } from "react";
import { DEPLOYMENT_CONFIG } from "../config/deployment";
import { FEATURE_FLAGS } from "../constants/featureFlags";

const SETTINGS_KEY = "app-settings";

/** Top-level boolean settings the user can toggle from the Settings UI. */
export enum SettingsKey {
  ShowTestnets = "showTestnets",
  // Feature toggles — each surfaces a whole product area (its nav tab + all of
  // its routes) in the UI. Persisted per-browser like every other setting; the
  // default comes from the build-time FEATURE_FLAGS so a build can ship a
  // feature pre-enabled while the user can still flip it locally.
  BasicWallet = "basicWallet",
  Vaults = "vaults",
  Payments = "payments",
  CapTable = "capTable",
}

interface Settings {
  [SettingsKey.ShowTestnets]: boolean;
  [SettingsKey.BasicWallet]: boolean;
  [SettingsKey.Vaults]: boolean;
  [SettingsKey.Payments]: boolean;
  [SettingsKey.CapTable]: boolean;
}

const defaults: Settings = {
  [SettingsKey.ShowTestnets]: DEPLOYMENT_CONFIG.showTestnetsByDefault,
  [SettingsKey.BasicWallet]: FEATURE_FLAGS.basicWallet,
  [SettingsKey.Vaults]: FEATURE_FLAGS.vaults,
  [SettingsKey.Payments]: FEATURE_FLAGS.payments,
  [SettingsKey.CapTable]: FEATURE_FLAGS.capTable,
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
