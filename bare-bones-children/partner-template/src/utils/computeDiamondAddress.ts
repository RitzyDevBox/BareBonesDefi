import { ethers } from "ethers";
import { getBareBonesConfiguration } from "../constants/misc";

export function computeDiamondAddress(
  user: string,
  index: number,
  chainId: number | null
): string {
  if (chainId == null) {
    throw new Error("chainId is required to compute Diamond address");
  }

  const config = getBareBonesConfiguration(chainId);

  const salt = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ["address", "uint256"],
      [user, index]
    )
  );

  return ethers.utils.getCreate2Address(
    config.diamondFactoryAddress,
    salt,
    config.diamondFactoryInitHash
  );
}

export function getUserDiamondAddresses(
  user: string,
  count: number,
  chainId: number | null
): string[] {
  if (chainId == null) {
    throw new Error("chainId is required to compute Diamond addresses");
  }

  const addresses: string[] = [];
  for (let i = 0; i < count; i++) {
    addresses.push(
      computeDiamondAddress(user, i, chainId)
    );
  }

  return addresses;
}
