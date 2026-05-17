import { ethers } from "ethers";
import { getBareBonesConfiguration } from "../constants/misc";
import MultiTenantAuthABI from "../abis/auth/MultiTenantAuth.abi.json";
import PayrollManagerABI from "../abis/paymentPipelines/PayrollManager.abi.json";
import PayrollTreasuryABI from "../abis/paymentPipelines/PayrollTreasury.abi.json";
import GovernanceTokenABI from "../abis/dao/GovernanceToken.abi.json";

export interface KnownContract {
  key: string;
  name: string;
  address: string;
  abi: any[];
}

/** Per-DAO contracts that don't live in chain config but are realistic MTA
 *  permission targets. Only the governance token qualifies — governor and
 *  timelock aren't manageable from the MTA, so listing them as targets would
 *  be misleading. Address is resolved on-chain via
 *  `useProposalAddressBook(governorAddress)`. */
export interface DaoKnownAddresses {
  token?: string;
}

export interface AbiFunctionInput {
  name: string;
  type: string;
}

export interface AbiFunction {
  signature: string;
  selector: string;
  name: string;
  inputs: AbiFunctionInput[];
  stateMutability: string;
}

/** Build the list of "known" target contracts at this chain id. Chain-wide
 *  singletons (MTA, Payroll) come from the chain config; the governance
 *  token is per-DAO and is emitted when its address is passed in via `dao`.
 *  Its ABI is standard so we can hardcode it here and decode the target +
 *  function name in permission rows instead of falling back to
 *  "External · 0x…".
 *
 *  Empty / zero-address entries are dropped — those are placeholders before
 *  the chain is actually deployed or before the DAO context has resolved. */
export function getKnownContracts(
  chainId: number | null | undefined,
  dao?: DaoKnownAddresses,
): KnownContract[] {
  if (chainId == null) return [];
  const cfg = getBareBonesConfiguration(chainId);
  const candidates: KnownContract[] = [
    { key: "mta", name: "Multi-Tenant Authorizer", address: cfg.multiTenantAuthAddress, abi: MultiTenantAuthABI as any[] },
    { key: "payrollManager", name: "Payroll Manager", address: cfg.payrollManagerAddress, abi: PayrollManagerABI as any[] },
    { key: "payrollTreasury", name: "Payroll Treasury", address: cfg.payrollTreasuryAddress, abi: PayrollTreasuryABI as any[] },
  ];
  if (dao?.token) {
    candidates.push({ key: "token", name: "Governance Token", address: dao.token, abi: GovernanceTokenABI as any[] });
  }
  const ZERO = "0x0000000000000000000000000000000000000000";
  return candidates.filter((c) => c.address && c.address.toLowerCase() !== ZERO);
}

/** Mutating (write) functions exposed by the contract's ABI. Filters out
 *  view/pure/constructor/event/error entries — these are not callable as
 *  permission targets. */
export function listWriteFunctions(abi: any[]): AbiFunction[] {
  const iface = new ethers.utils.Interface(abi);
  const out: AbiFunction[] = [];
  for (const sig of Object.keys(iface.functions)) {
    const fn = iface.functions[sig];
    if (fn.constant || fn.stateMutability === "view" || fn.stateMutability === "pure") continue;
    out.push({
      signature: fn.format(),
      selector: iface.getSighash(fn),
      name: fn.name,
      inputs: fn.inputs.map((i) => ({ name: i.name, type: i.type })),
      stateMutability: fn.stateMutability ?? "nonpayable",
    });
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}
