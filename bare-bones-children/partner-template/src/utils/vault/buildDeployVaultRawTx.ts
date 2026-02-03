// utils/vault/buildDeployVaultRawTx.ts
import { ethers } from "ethers";
import NamespacedCreate3FactoryAbi from "../../abis/diamond/NamespacedCreate3Factory.abi.json";
import {
  TEMPLATE_PROVIDER_NAMESPACES,
  TEMPLATE_PROVIDER_OWNER_ADDRESS,
  getBareBonesConfiguration,
} from "../../constants/misc";

interface BuildDeployVaultArgs {
  chainId: number;
  walletAddress: string;
  constructorParams: string; // bytes
  initData?: string; // bytes
}

export function buildDeployVaultRawTx({
  chainId,
  walletAddress,
  constructorParams,
  initData = "0x",
}: BuildDeployVaultArgs) {
  const config = getBareBonesConfiguration(chainId);
  const factoryAddress = config.namespacedCreate3Factory;

  const factoryInterface = new ethers.utils.Interface(
    NamespacedCreate3FactoryAbi
  );

  return {
    to: factoryAddress,
    data: factoryInterface.encodeFunctionData("deploy", [
      TEMPLATE_PROVIDER_OWNER_ADDRESS,
      TEMPLATE_PROVIDER_NAMESPACES.SVR_TEMPLATE_PROVIDER_V1,
      constructorParams,
      initData,
    ]),
    value: 0,
  };
}


export function encodeVaultConstructorParams(
  walletAddress: string,
  coldWalletAddress: string,
  defaultProposalDelay: number = 0,
  defaultReleaseDelay: number = 0,
  defaultWithdrawAddressChangeDelay: number = 0
): string {
  return ethers.utils.defaultAbiCoder.encode(
    ["address", "address", "uint256", "uint256", "uint256"],
    [
      walletAddress,        // owner
      coldWalletAddress,    // withdrawDestination
      0,                    // defaultProposalDelay
      0,                    // defaultReleaseDelay
      0                     // defaultWithdrawAddressChangeDelay
    ]
  );
}