/**
 * The "kind" of an address — drives which writable functions show up after it
 * is picked in the proposal wizard. Each kind maps to a function set in
 * `ProposalBuilder.tsx` (FUNCTIONS_BY_KIND).
 *
 * - `governor`        — DAO Governor contract (tune voting params).
 * - `timelock`        — DAO Timelock (grant/revoke proposer/canceller/executor).
 * - `token`           — DAO governance token (full mint/burn/transfer/delegate).
 * - `erc20`           — Generic ERC-20 (transfer/approve only — no mint).
 * - `wallet`          — Smart wallet / Diamond (Calibur entry + diamondCut).
 * - `vault`           — Secure Value Reserve vault.
 * - `factory`         — Diamond factory (deploy wallet).
 * - `mta`             — Multi-Tenant Authorizer (role grants across tenants).
 * - `authority-resolver` — Owner / NFT authority resolver (config address).
 * - `kernel-initializer` — Wallet kernel initializer (config address).
 * - `config`          — Other system config addresses we don't yet wire to a
 *                       function set; selectable but treated like custom.
 * - `eoa`             — Connected wallet / external account. Native transfer only.
 * - `custom`          — User-pasted address with user-supplied ABI.
 */
export type AddressKind =
  | "governor"
  | "timelock"
  | "token"
  | "erc20"
  | "wallet"
  | "vault"
  | "factory"
  | "mta"
  | "authority-resolver"
  | "kernel-initializer"
  | "config"
  | "eoa"
  | "custom";

/**
 * Tabs the address-book modal groups entries into. Maps loosely to `kind` but
 * coarser — e.g. governor + timelock + token all live under `core`.
 */
export type AddressCategory =
  | "connected"
  | "core"
  | "wallet"
  | "vault"
  | "config"
  | "saved";

export interface AddressBookEntry {
  /** Stable id for React keys — usually `${category}:${address}` plus a discriminator. */
  id: string;
  /** Display name (e.g. "Governor", "Wallet #0", user-supplied name). */
  name: string;
  /** Short context line under the name. */
  sub?: string;
  /** Checksummed 0x-prefixed address. */
  address: string;
  category: AddressCategory;
  kind: AddressKind;
  /** True for user-saved contacts that can be edited/removed. */
  removable?: boolean;
}
