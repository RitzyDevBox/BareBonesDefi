// utils/vault/buildDeployVaultRawTx.ts
import { ethers } from "ethers";
import NamespacedCreate3FactoryAbi from "../../abis/diamond/NamespacedCreate3Factory.abi.json";
import {
  getSvrTemplateDeploymentConfig,
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
  constructorParams,
  initData = "0x",
}: BuildDeployVaultArgs) {
  const config = getBareBonesConfiguration(chainId);
  const templateConfig = getSvrTemplateDeploymentConfig(chainId);
  const factoryAddress = config.namespacedCreate3Factory;

  const factoryInterface = new ethers.utils.Interface(
    NamespacedCreate3FactoryAbi
  );

  return {
    to: factoryAddress,
    data: factoryInterface.encodeFunctionData("deploy", [
      templateConfig.templateOwnerAddress,
      templateConfig.svrTemplateName,
      constructorParams,
      initData,
    ]),
    value: 0,
  };
}


export function encodeVaultConstructorParams(
  walletAddress: string,
  coldWalletAddress: string,
  _defaultProposalDelay: number = 0,
  _defaultReleaseDelay: number = 0,
  _defaultWithdrawAddressChangeDelay: number = 0
): string {
  return ethers.utils.defaultAbiCoder.encode(
    ["address", "address", "uint32", "uint32", "uint32"],
    [
      walletAddress,        // owner
      coldWalletAddress,    // withdrawDestination
      0,                    // defaultProposalDelay
      0,                    // defaultReleaseDelay
      0                     // defaultWithdrawAddressChangeDelay
    ]
  );
}