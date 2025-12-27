import { ethers } from "ethers";
import { DIAMOND_FACTORY_ADDRESS, DIAMOND_INIT_HASH } from "../constants/misc";

export function computeDiamondAddress(
    user: string,
    index: number,
    factory: string = DIAMOND_FACTORY_ADDRESS,
    initCodeHash: string = DIAMOND_INIT_HASH) {
        
  const salt = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ["address", "uint256"],
      [user, index]
    )
  );

  return ethers.utils.getCreate2Address(
    factory,
    salt,
    initCodeHash
  );
}


export function getUserDiamondAddresses(
    user: string,
    count: number,
    factory: string = DIAMOND_FACTORY_ADDRESS,
    initCodeHash: string = DIAMOND_INIT_HASH) {

  const addrs: string[] = [];
  for (let i = 0; i < count; i++) {
    addrs.push(computeDiamondAddress(user, i, factory, initCodeHash));
  }

  return addrs;
}
