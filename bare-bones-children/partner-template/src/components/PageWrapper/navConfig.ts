// header/navConfig.ts
import { ROUTES } from "../../routes";
import { FEATURE_FLAGS } from "../../constants/featureFlags";

const ORGANIZATION_ID = "organization";
const ENTITY_FORMATION_ID = "entity-formation";
const WALLET_ID = "wallet";
const BROWSER_ID = "browser";
const VAULTS_ID = "vaults";

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
  { id: "Payments", label: "Payments", path: ROUTES.PAYMENTS },
  { id: VAULTS_ID, label: "Vaults", path: ROUTES.VAULTS },
];

const VISIBLE: NavItem[] = ALL_NAV_ITEMS.filter((item) => {
  if (item.id === ORGANIZATION_ID) return FEATURE_FLAGS.organizations;
  if (item.id === ENTITY_FORMATION_ID) return FEATURE_FLAGS.entityFormation;
  if (item.id === WALLET_ID) return FEATURE_FLAGS.basicWallet;
  if (item.id === BROWSER_ID) return FEATURE_FLAGS.dappBrowser;
  if (item.id === VAULTS_ID) return FEATURE_FLAGS.vaults;
  return true;
});

/** Static nav list — Members lives inside the DAO detail page's tab bar
 *  (gated by `useDevFeature(DevFeatureKey.Members)` over there), not as its
 *  own header entry. If a future runtime flag needs to flip a top-level link,
 *  switch this back to a `useNavItems()` hook. */
export const NAV_ITEMS: NavItem[] = VISIBLE;

/** Backwards-compat shim for callers that still want the hook. Returns the
 *  same static list — no current runtime gates apply at the top level. */
export function useNavItems(): NavItem[] {
  return NAV_ITEMS;
}
