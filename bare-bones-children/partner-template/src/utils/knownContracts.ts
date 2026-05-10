import { ethers } from "ethers";
import { getBareBonesConfiguration } from "../constants/misc";
import MultiTenantAuthABI from "../abis/auth/MultiTenantAuth.abi.json";
import PayrollManagerABI from "../abis/paymentPipelines/PayrollManager.abi.json";
import PayrollTreasuryABI from "../abis/paymentPipelines/PayrollTreasury.abi.json";

export interface KnownContract {
  key: string;
  name: string;
  address: string;
  abi: any[];
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

/** Build the list of "known" target contracts at this chain id. Restricted
 *  to the contracts that (a) have a deterministic per-chain address — DAO
 *  governors / timelocks are per-org, not per-chain — and (b) are realistic
 *  targets for org-level permissions today. The DAO Governor is not yet
 *  routed through MTA so listing it as a target would be misleading.
 *
 *  Empty / zero-address entries are dropped — those are placeholders before
 *  the chain is actually deployed. */
export function getKnownContracts(chainId: number | null | undefined): KnownContract[] {
  if (chainId == null) return [];
  const cfg = getBareBonesConfiguration(chainId);
  const candidates: KnownContract[] = [
    { key: "mta", name: "Multi-Tenant Authorizer", address: cfg.multiTenantAuthAddress, abi: MultiTenantAuthABI as any[] },
    { key: "payrollManager", name: "Payroll Manager", address: cfg.payrollManagerAddress, abi: PayrollManagerABI as any[] },
    { key: "payrollTreasury", name: "Payroll Treasury", address: cfg.payrollTreasuryAddress, abi: PayrollTreasuryABI as any[] },
  ];
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
