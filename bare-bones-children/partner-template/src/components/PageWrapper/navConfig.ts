// header/navConfig.ts
import { ROUTES } from "../../routes";

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
    id: "organization",
    label: "Organizations",
    path: ROUTES.ORGANIZATIONS,
  },
  {
    id: "vaults",
    label: "Vaults",
    path: ROUTES.VAULTS
  }
];
