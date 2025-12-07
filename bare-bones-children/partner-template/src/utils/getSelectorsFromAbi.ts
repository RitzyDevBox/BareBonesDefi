/* eslint-disable @typescript-eslint/no-explicit-any */
import { utils } from "ethers";

export function getSelectorsFromABI(abi: any[]) {
  return abi
    .filter((item) => item.type === "function")
    .map((item) => {
      const signature = `${item.name}(${item.inputs.map((i: any) => i.type).join(",")})`;
      return utils.id(signature).substring(0, 10);
    });
}