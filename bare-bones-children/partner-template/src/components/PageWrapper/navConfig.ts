// header/navConfig.ts
import { ROUTES } from "../../routes";
import { FEATURE_FLAGS } from "../../constants/featureFlags";
import { useSettings, SettingsKey } from "../../hooks/useSettings";

const ORGANIZATION_ID = "organization";
const ENTITY_FORMATION_ID = "entity-formation";
const WALLET_ID = "wallet";
const BROWSER_ID = "browser";
const VAULTS_ID = "vaults";
const PAYMENTS_ID = "Payments";

export interface NavItem {
  id: string;
  label: string;
  path: string;
}

const ALL_NAV_ITEMS: NavItem[] = [
  { id: "home", label: "Home", path: ROUTES.ROOT },
  { id: WALLET_ID, label: "Wallet", path: ROUTES.BASIC_WALLET },
  { id: BROWSER_ID, label: "Browser", path: ROUTES.DAPP_BROWSER },
  { id: "daos", label: "DAOs", path: ROUTES.DAOS },
  { id: ORGANIZATION_ID, label: "Organizations", path: ROUTES.ORGANIZATIONS },
  { id: ENTITY_FORMATION_ID, label: "Formation", path: ROUTES.ENTITIES_FORMATION },
  { id: PAYMENTS_ID, label: "Payments", path: ROUTES.PAYMENTS },
  { id: VAULTS_ID, label: "Vaults", path: ROUTES.VAULTS },
];

/** Header nav list. Wallet / Vaults / Payments are user-toggleable at runtime
 *  from Settings (see `SettingsKey`), so this is a hook — `useSettings()`
 *  re-renders every consumer the moment a flag flips. The remaining gates
 *  (Organizations, Formation, Browser) are still build-time `FEATURE_FLAGS`.
 *  Members lives inside the DAO detail page's own tab bar, not as a header
 *  entry, so it isn't listed here. */
export function useNavItems(): NavItem[] {
  const { settings } = useSettings();
  return ALL_NAV_ITEMS.filter((item) => {
    if (item.id === ORGANIZATION_ID) return FEATURE_FLAGS.organizations;
    if (item.id === ENTITY_FORMATION_ID) return FEATURE_FLAGS.entityFormation;
    if (item.id === BROWSER_ID) return FEATURE_FLAGS.dappBrowser;
    if (item.id === WALLET_ID) return settings[SettingsKey.BasicWallet];
    if (item.id === VAULTS_ID) return settings[SettingsKey.Vaults];
    if (item.id === PAYMENTS_ID) return settings[SettingsKey.Payments];
    return true;
  });
}
