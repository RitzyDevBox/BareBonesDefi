import { ethers } from "ethers";
import { TokenInfo } from "../components/TokenSelect/types";
import polygonLogo from "../assets/chains/polygon-logo.webp";
import hyperliquidLogo from "../assets/chains/hyperliquid-logo.png";

export const SwapRouter02ExecutorAddress = '0xBe6d02FD9335C2e1e33bBC174ad7ee36764C8EE7'
export const testTokenAddress = "0x8900e4fcd3c2e6d5400fde29719eb8b5fc811b3c";
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
export const NATIVE_ADDRESS = ZERO_ADDRESS
export const APP_NAME = import.meta.env.VITE_APP_NAME
export const WALLECT_CONNECT_WALLET_NAME = APP_NAME
export const DEFAULT_CHAIN_ID = 999;
export const TEMPLATE_PROVIDER_OWNER_ADDRESS = '0xfDeDE21f16138e407649eA37Ff166ff910E4a988';
export const TEMPLATE_PROVIDER_NAMESPACES = {
  //OOPS our deployment forgot to include the version but normally it should
  SVR_TEMPLATE_PROVIDER_V1: 'SVR_TEMPLATE_PROVIDER',
  //Started Using custom verisoning for the provides so we dont need to redeploy
  SVR_TEMPLATE_PROVIDER_C1: 'SVR_TEMPLATE_PROVIDER_C1',
}

export const POLYGON_SECURE_VALUE_RESERVE_GRAPH_URL = 'https://api.goldsky.com/api/public/project_clze9a4nvee2w01wbaw2y7wzc/subgraphs/secure-value-reserve/1.0.1/gn'

export interface BareBonesConfiguration {
  diamondFactoryAddress: string;
  diamondFactoryInitHash: string;
  ownerAuthorityResolverAddress: string;
  nftAuthorityResolverAddress: string;
  facetFallbackFailureHook: string;
  globalOrganizationRegistry: string;
  diamondKernelInitializer: string;
  namespacedCreate3Factory: string;
  multicall3Address: string,
}

export const CHAIN_SVR_SUBGRAPH_URL: Partial<Record<number, string>> = {
  137: POLYGON_SECURE_VALUE_RESERVE_GRAPH_URL,
};


/**

  Deploying: DIAMOND_CUT_FACET_V1 0x147E325F797d398dF2cC208E440Cafa222A7DCa4
  Deploying: DIAMOND_LOUPE_FACET_V1 0xfC0d8BD9Fe5f585B622AB5d0BBBEB9B07367E152
  Deploying: VALIDATION_FACET_V1 0x1E7bf1Ed509b169fF3FdEa27677d9D87f12dfF45
  Deploying: HOOK_FACET_V1 0x703FaBd3eDeE58AbF58F3d13a586A2F7F6926993
  Deploying: VALIDATION_PRE_HOOK_V1 0x9Dbd8B384EAE1f2Bd0BfBB6c01b8E88F46809582
  Deploying: DIAMOND_FACTORY_V1 0x7C7681dA9eF0c69287376aFCb546ebf176F96232
  Deploying: OWNER_AUTHORITY_RESOLVER_V1 0x275E7fF6B915eEfa554Ea1541D5456Bd7FA623F1
  Deploying: NFT_AUTHORITY_RESOLVER_V1 0x36CF71dC0ddA1cBf6607467e61929ED6E0E2E0C8
  Deploying: EXECUTE_FACET_V1 0x8D76DE865083f12383994A1A6Bb2d26A53836E4E
  Deploying: WALLET_CALLBACK_FACET_V1 0x211541b931787070de1C930dBB5e3aE9DBf6513a
  Deploying: ORG_BEACON_FACET_V1 0xad4A110Fd9D8F1a5Dd99f97eC3f67268BE6BfE1d
  Deploying: FACET_FALLBACK_FAILURE_HOOK_V1 0xd69475f2caA270aC738bBC2efd0600fC85ED7ED6
  Deploying: DIAMOND_KERNEL_INITIALIZER_V1 0xa7fC7504a189338813cA136ae531136F17279f03
  Deploying: GLOBAL_ORG_REGISTRY_V1 0xfb4c3957C7638c3Ec8b777AcF8bD65fd40df42b5

  Diamond init code hash: 0xf4cd4ee9ea36c9fcc258dc3c7772ce9feec4379218fc532e2655de505d0557e9
 */
export const DEFAULT_BARE_BONES_CONFIG: BareBonesConfiguration = {
  diamondFactoryAddress: "0x7C7681dA9eF0c69287376aFCb546ebf176F96232",
  diamondFactoryInitHash: "0xf4cd4ee9ea36c9fcc258dc3c7772ce9feec4379218fc532e2655de505d0557e9",
  ownerAuthorityResolverAddress: "0x275E7fF6B915eEfa554Ea1541D5456Bd7FA623F1",
  nftAuthorityResolverAddress: "0x36CF71dC0ddA1cBf6607467e61929ED6E0E2E0C8",
  facetFallbackFailureHook: "0xd69475f2caA270aC738bBC2efd0600fC85ED7ED6",
  globalOrganizationRegistry: "0xfb4c3957C7638c3Ec8b777AcF8bD65fd40df42b5",
  diamondKernelInitializer: "0xa7fC7504a189338813cA136ae531136F17279f03",
  namespacedCreate3Factory: "0x2EF901902fA6993949dbb32f8807fd2bFfB3D8da",
  multicall3Address: "0xca11bde05977b3631167028862be2a173976ca11",
} as const;

export const BARE_BONES_CHAIN_OVERRIDES: Partial<
  Record<number, Partial<BareBonesConfiguration>>
> = {
};


export interface ChainInfo {
  chainId: number;
  chainName: string,
  wethAddress: string,
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  }
  rpcUrls: string[];
  blockExplorerUrls?: string[];
  logoUrl?: string;
  coinGeckoSlug: string,

  supportsEip1559: boolean;
  minPriorityFeeGwei?: number;
  maxFeeMultiplier?: { numerator: number, denominator: number };
}


export const CHAIN_INFO_MAP: Record<number, ChainInfo> ={
  137: {
    chainId: 137,
    chainName: "Polygon",
    wethAddress: "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
    nativeCurrency: {
      name: "POL",
      symbol: "WPOL",
      decimals: 18
    },
    logoUrl: polygonLogo,
    rpcUrls: ["https://polygon-rpc.com"],
    blockExplorerUrls: ["https://polygonscan.com"],
    coinGeckoSlug: "polygon-pos",
    supportsEip1559: true,
    minPriorityFeeGwei: 30,
    maxFeeMultiplier: {
      numerator: 125,
      denominator: 100,
    },
  },
  
  999: {
    chainId: 999,
    chainName: "Hyperliquid",
    wethAddress: "0x5555555555555555555555555555555555555555",
    nativeCurrency: {
      name: "HYPE",
      symbol: "HYPE",
      decimals: 18
    },
    logoUrl: hyperliquidLogo,
    rpcUrls:["https://rpc.hyperliquid.xyz/evm", "https://hyperliquid.drpc.org"],
    blockExplorerUrls: ["https://hyperevmscan.io/"],
    coinGeckoSlug: "hyperevm",
    supportsEip1559: false,
  }
}

export const SUPPORTED_CHAIN_IDS = Object.freeze(
  Object.keys(CHAIN_INFO_MAP).map(Number)
) as readonly number[];

// Ethereum
export const NATIVE_POLYGON: TokenInfo = {
  chainId: 137,
  address: ethers.constants.AddressZero,
  symbol: "POL",
  name: "Polygon",
  decimals: 18,
  logoURI: polygonLogo,
};

// Hyperliquid / Hype (adjust chainId if needed)
export const NATIVE_HYPE: TokenInfo = {
  chainId: 999, // <-- put the real chainId here
  address: ethers.constants.AddressZero,
  symbol: "HYPE",
  name: "Hype",
  decimals: 18,
  logoURI: hyperliquidLogo,
};

export const NATIVE_TOKENS_BY_CHAIN: Record<number, TokenInfo> = {
  137: NATIVE_POLYGON,
  999: NATIVE_HYPE,
};


export function getBareBonesConfiguration(
  chainId: number,
  overrides?: Partial<BareBonesConfiguration>
): BareBonesConfiguration {
  return {
    ...DEFAULT_BARE_BONES_CONFIG,
    ...BARE_BONES_CHAIN_OVERRIDES[chainId],
    ...overrides,
  };
}
