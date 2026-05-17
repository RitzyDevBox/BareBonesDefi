import { useMemo } from "react";
import { ethers } from "ethers";
import { useWalletProvider } from "../../hooks/useWalletProvider";
import {
  useProposalAddressBook,
  type LabeledAddress,
} from "../../hooks/dao/useProposalAddressBook";
import { useContactsStore, type ContactsStore } from "./contactsStore";
import type { AddressBookEntry, AddressKind } from "./types";

interface UseAddressBookArgs {
  governorAddress: string;
}

interface UseAddressBookResult {
  entries: AddressBookEntry[];
  /** Loading flags for the slow sources, so the UI can show pending state. */
  loadingTimelockWallets: boolean;
  loadingVaults: boolean;
  /** Surface the same config-address list the wallet-deploy form needs. */
  configAddresses: LabeledAddress[];
  /** DAO contract addresses (so the wizard can identify which entry is which). */
  daoAddresses: {
    governor: string;
    timelock: string;
    token: string;
  };
  /** Underlying contact store — exposed so callers can add/remove from outside. */
  contactsStore: ContactsStore;
}

const ADDR = (a: string): string => {
  try {
    return ethers.utils.getAddress(a);
  } catch {
    return a;
  }
};

/**
 * Maps a config address's human label (from `useProposalAddressBook`) onto the
 * `AddressKind` taxonomy used by the wizard's function picker. Keeps the picker
 * shorter for filtered config selections (e.g. authorizer-only) without leaking
 * label-string-matching into the picker itself.
 */
function configKindFromLabel(label: string): AddressKind {
  const l = label.toLowerCase();
  if (l.includes("authority resolver")) return "authority-resolver";
  if (l.includes("initializer")) return "kernel-initializer";
  if (l.includes("diamond factory")) return "factory";
  if (l.includes("multi-tenant auth")) return "mta";
  return "config";
}

/**
 * Aggregates every address source the proposal wizard knows about into a flat,
 * tab-grouped list. The composition is fixed (sources can't be added at runtime),
 * but each source is independently loaded so the UI can show partial data.
 */
export function useAddressBook({ governorAddress }: UseAddressBookArgs): UseAddressBookResult {
  const { account } = useWalletProvider();
  const {
    userWalletAddresses,
    timelockWalletAddresses,
    vaultAddresses,
    timelockAddress,
    tokenAddress,
    loadingTimelockWallets,
    loadingVaults,
    configAddresses,
  } = useProposalAddressBook(governorAddress);
  const contactsStore = useContactsStore();

  const entries = useMemo<AddressBookEntry[]>(() => {
    const out: AddressBookEntry[] = [];

    if (account) {
      out.push({
        id: `connected:${account.toLowerCase()}`,
        name: "Connected wallet",
        sub: "Your account",
        address: ADDR(account),
        category: "connected",
        kind: "eoa",
      });
    }

    if (governorAddress) {
      out.push({
        id: `core:gov:${governorAddress.toLowerCase()}`,
        name: "Governor",
        sub: "DAO governor contract",
        address: ADDR(governorAddress),
        category: "core",
        kind: "governor",
      });
    }
    if (timelockAddress) {
      out.push({
        id: `core:tl:${timelockAddress.toLowerCase()}`,
        name: "Timelock",
        sub: "DAO timelock (role grants)",
        address: ADDR(timelockAddress),
        category: "core",
        kind: "timelock",
      });
    }
    if (tokenAddress) {
      out.push({
        id: `core:tk:${tokenAddress.toLowerCase()}`,
        name: "Governance token",
        sub: "ERC20Votes · mint/burn/delegate",
        address: ADDR(tokenAddress),
        category: "core",
        kind: "token",
      });
    }

    userWalletAddresses.forEach((address, index) => {
      out.push({
        id: `wallet:user:${address.toLowerCase()}`,
        name: `My wallet #${index}`,
        sub: "Smart wallet (you own)",
        address: ADDR(address),
        category: "wallet",
        kind: "wallet",
      });
    });
    timelockWalletAddresses.forEach((address, index) => {
      out.push({
        id: `wallet:tl:${address.toLowerCase()}`,
        name: `Timelock wallet #${index}`,
        sub: "Smart wallet (timelock owns)",
        address: ADDR(address),
        category: "wallet",
        kind: "wallet",
      });
    });

    vaultAddresses.forEach((address, index) => {
      out.push({
        id: `vault:${address.toLowerCase()}`,
        name: `Vault #${index}`,
        sub: "Secure Value Reserve",
        address: ADDR(address),
        category: "vault",
        kind: "vault",
      });
    });

    configAddresses.forEach((cfg) => {
      if (!cfg.address || cfg.address === ethers.constants.AddressZero) return;
      const kind = configKindFromLabel(cfg.label);
      // MTA lives alongside governor/timelock/token under Core — it's the
      // only system contract that's a meaningful proposal target. The rest
      // (resolvers, kernel initializer, factory, etc.) stay under "config"
      // so per-field pickers (WalletDeployForm) can still locate them via
      // kindFilter, but they're hidden from the default view by being in an
      // empty tab.
      const isCore = kind === "mta";
      out.push({
        id: `${isCore ? "core" : "config"}:${cfg.address.toLowerCase()}`,
        name: cfg.label,
        sub: isCore ? "Multi-tenant authorizer" : "System config",
        address: ADDR(cfg.address),
        category: isCore ? "core" : "config",
        kind,
      });
    });

    // Dedup user saved contacts that shadow a built-in entry (use built-in's metadata).
    const seen = new Set(out.map((e) => e.address.toLowerCase()));
    for (const c of contactsStore.contacts) {
      if (seen.has(c.address.toLowerCase())) continue;
      out.push({
        id: `saved:${c.address.toLowerCase()}`,
        name: c.name,
        sub: c.note || "Saved contact",
        address: ADDR(c.address),
        category: "saved",
        kind: "custom",
        removable: true,
      });
    }

    return out;
  }, [
    account,
    governorAddress,
    timelockAddress,
    tokenAddress,
    userWalletAddresses,
    timelockWalletAddresses,
    vaultAddresses,
    configAddresses,
    contactsStore.contacts,
  ]);

  return {
    entries,
    loadingTimelockWallets,
    loadingVaults,
    configAddresses,
    daoAddresses: {
      governor: governorAddress,
      timelock: timelockAddress,
      token: tokenAddress,
    },
    contactsStore,
  };
}
