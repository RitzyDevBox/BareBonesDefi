// header/navConfig.ts
import { ROUTES } from "../../routes";
import { FEATURE_FLAGS } from "../../constants/featureFlags";

const ORGANIZATION_ID = "organization";
export interface NavItem {
  id: string;
  label: string;
  path: string;
}

export const NAV_ITEMS: NavItem[] = [
  {
    id: "home",
    label: "Home",
    path: ROUTES.ROOT,
  },
  {
    id: "wallet",
    label: "Wallet",
    path: ROUTES.BASIC_WALLET,
  },
  {
    id: "browser",
    label: "Browser",
    path: ROUTES.DAPP_BROWSER,
  },
  {
    id: ORGANIZATION_ID,
    label: "Organizations",
    path: ROUTES.ORGANIZATIONS,
  },  
  {
    id: "Payments",
    label: "Payments",
    path: ROUTES.PAYMENTS,
  },
  {
    id: "vaults",
    label: "Vaults",
    path: ROUTES.VAULTS
  }
].filter((item) => {
  if (item.id === ORGANIZATION_ID) return FEATURE_FLAGS.showOrganizationsInMainNav;
  return true;
});
