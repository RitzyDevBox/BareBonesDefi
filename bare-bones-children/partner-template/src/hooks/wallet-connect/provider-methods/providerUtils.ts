import { BigNumber } from "ethers";
import { SUPPORTED_CHAIN_IDS } from "../../../constants/misc";

export function validateChainSupported(chainId: unknown) {
  const domainChainId = normalizeChainId(chainId);
  if (!SUPPORTED_CHAIN_IDS.includes(domainChainId)) {
    throw new Error(`Chain ${domainChainId} not supported`);
  }
}

export function normalizeChainId(chainId: unknown): number {
  if (typeof chainId === "number") {
    return chainId;
  }

  if (typeof chainId === "bigint") {
    return Number(chainId);
  }

  if (BigNumber.isBigNumber(chainId)) {
    return chainId.toNumber();
  }

  if (typeof chainId === "string") {
    // hex string (0x…)
    if (chainId.startsWith("0x")) {
      return parseInt(chainId, 16);
    }

    // decimal string
    return parseInt(chainId, 10);
  }

  throw new Error("Invalid or missing chainId in typed data");
}
