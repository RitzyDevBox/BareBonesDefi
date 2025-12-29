import { ethers } from "ethers";
import DIAMOND_FACTORY_ABI from "../abis/diamond/DiamondFactory.abi.json";
import {
  DIAMOND_FACTORY_ADDRESS,
  OWNER_AUTHORITY_RESOLVER,
} from "../constants/misc";
import { RawTx } from "./basicWalletUtils";

export interface DeployDiamondArgs {
  owner: string;
}

export interface DiamondDeployedResult {
  diamondAddress: string;
  index: number;
}


/**
 * Builds a raw tx for deploying a Diamond wallet via the factory.
 * Pure function — no provider, no signer.
 */
export function buildDeployEOAOwnerBasedDiamondRawTx(
  args: DeployDiamondArgs
): RawTx {
  const iface = new ethers.utils.Interface(DIAMOND_FACTORY_ABI);
  const options = ethers.utils.defaultAbiCoder.encode(["address"],[args.owner]);

  return {
    to: DIAMOND_FACTORY_ADDRESS,
    value: 0,
    data: iface.encodeFunctionData("deployDiamond", [
      OWNER_AUTHORITY_RESOLVER,
      options,
    ]),
  };
}

/**
 * Parses a DiamondDeployed event from a tx receipt.
 * Throws if not found.
 */
export function parseDiamondDeployedFromReceipt(
  receipt: ethers.providers.TransactionReceipt
): DiamondDeployedResult {
  const iface = new ethers.utils.Interface(DIAMOND_FACTORY_ABI);

  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed.name === "DiamondDeployed") {
        return {
          diamondAddress: parsed.args.diamond,
          index: Number(parsed.args.seed),
        };
      }
    } catch {
      // ignore non-matching logs
    }
  }

  throw new Error("DiamondDeployed event not found in receipt");
}
