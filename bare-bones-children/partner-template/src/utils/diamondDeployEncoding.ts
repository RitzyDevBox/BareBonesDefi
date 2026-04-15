import { ethers } from "ethers";
import { ZERO_ADDRESS } from "../constants/misc";

export interface BuildDiamondInitializerDataArgs {
  authorityResolverAddress: string;
  organizationRegistryAddress?: string;
  organizationId?: string;
}

export function encodeDiamondOwnerOptions(ownerAddress: string): string {
  return ethers.utils.defaultAbiCoder.encode(["address"], [ethers.utils.getAddress(ownerAddress)]);
}

export function encodeDiamondNftWalletOptions(
  nftContractAddress: string,
  tokenId: ethers.BigNumberish
): string {
  return ethers.utils.defaultAbiCoder.encode(
    ["address", "uint256"],
    [ethers.utils.getAddress(nftContractAddress), tokenId]
  );
}

export function buildDiamondInitializerData({
  authorityResolverAddress,
  organizationRegistryAddress,
  organizationId,
}: BuildDiamondInitializerDataArgs): string {
  const resolver = ethers.utils.getAddress(authorityResolverAddress);

  if (organizationId) {
    const orgIdHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(organizationId));
    const registry = ethers.utils.getAddress(organizationRegistryAddress ?? ZERO_ADDRESS);
    return ethers.utils.defaultAbiCoder.encode(["address", "address", "bytes32"], [resolver, registry, orgIdHash]);
  }

  return ethers.utils.defaultAbiCoder.encode(
    ["address", "address", "bytes32"],
    [resolver, ZERO_ADDRESS, ethers.constants.HashZero]
  );
}
