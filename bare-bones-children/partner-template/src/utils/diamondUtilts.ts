import { ethers } from "ethers";
import DIAMOND_FACTORY_ABI from "../abis/diamond/DiamondFactory.abi.json";
import { getBareBonesConfiguration } from "../constants/misc";
import { RawTx } from "./basicWalletUtils";

export interface DeployDiamondArgs {
  owner: string;
  chainId: number | null;
  organizationId?: string; // organization slug e.g bare-bones
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
  if (args.chainId == null) {
    throw new Error("chainId is required to deploy Diamond");
  }

  const config = getBareBonesConfiguration(args.chainId);
  const iface = new ethers.utils.Interface(DIAMOND_FACTORY_ABI);
  const ownerOptions = ethers.utils.defaultAbiCoder.encode(["address"],[args.owner]);

  // Optional initializer data
  let initData = "0x";

  if (args.organizationId) {
    const orgId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(args.organizationId));
    initData = ethers.utils.defaultAbiCoder.encode(["address", "bytes32"],[config.globalOrganizationRegistry,orgId]);
  }

  return {
    to: config.diamondFactoryAddress,
    value: 0,
    data: iface.encodeFunctionData("deployDiamond", [
      config.ownerAuthorityResolverAddress, // resolver
      ownerOptions,                         // abi.encode(user)
      config.diamondKernelInitializer,      // initializer
      initData,                             // optional org install
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
