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
export const DEFAULT_CHAIN_ID = 137;
export const TEMPLATE_PROVIDER_OWNER_ADDRESS = '0xfDeDE21f16138e407649eA37Ff166ff910E4a988';
export const TEMPLATE_PROVIDER_NAMESPACES = {
  //OOPS our deployment forgot to include the version but normally it should
  SVR_TEMPLATE_PROVIDER_V1: 'SVR_TEMPLATE_PROVIDER',
  //Started Using custom verisoning for the provides so we dont need to redeploy
  SVR_TEMPLATE_PROVIDER_C1: 'SVR_TEMPLATE_PROVIDER_C1',
  SVR_TEMPLATE_PROVIDER_C2: 'SVR_TEMPLATE_PROVIDER_C2',
}

// Each transaction will trigger a state refresh but we add a delay since the graph takes some time to update
export const DEFAULT_REFRESH_DELAY = 10000
export const TOAST_ERROR_DISPLAY_DURATION_MS = 5000

export const ACTIVE_SVR_TEMPLATE_PROVIDER = TEMPLATE_PROVIDER_NAMESPACES.SVR_TEMPLATE_PROVIDER_C2

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
  barebones4337Facet: string;
}

export const CHAIN_SVR_SUBGRAPH_URL: Partial<Record<number, string>> = {
  137: POLYGON_SECURE_VALUE_RESERVE_GRAPH_URL,
};


/**

  Deploying: DIAMOND_CUT_FACET_V3 0xd86C9b65f4C29DeBCEe67e2B3894F9b38ee0a816
  Deploying: DIAMOND_LOUPE_FACET_V3 0xc18C54079E092654aD7d942A7847034Ce89262B7
  Deploying: VALIDATION_FACET_V3 0x8A340779F68Ca2d8F72a8FCd179fdec997EAE3d3
  Deploying: HOOK_FACET_V3 0x7Aa2034B8786b499677aF4b9948D5B7be6bBf883
  Deploying: VALIDATION_PRE_HOOK_V3 0x28D784E68A93934aF4539BD018c7f56e60f1882E

  Deploying: DIAMOND_FACTORY_V3 0x040B257d069E388d9b519EeE6D157D17E76514d6
  Deploying: OWNER_AUTHORITY_RESOLVER_V3 0x167C85EBAB5AB3eA18BCCaDacee0188Dad2857C4
  Deploying: NFT_AUTHORITY_RESOLVER_V3 0x7E8578a8ea8a441725c96183493295318A44D6EB
  
  Deploying: CALIBUR_ENTRY_V3 0x104d0Bc6BdAa0980e0e627CdAbc23E8cF2383936
  Deploying: CALIBUR_KERNEL_INITIALIZER_V3 0x33AB24Ae30Fdcc6Ad7Ef794899a993A012DE49c5

  Diamond init code hash: 0x895ddadea89a852657055537968c164fe1178b5b8a6d93e1a2622685a0d2d576
 */
export const DEFAULT_BARE_BONES_CONFIG: BareBonesConfiguration = {
  diamondFactoryAddress: "0x040B257d069E388d9b519EeE6D157D17E76514d6",
  diamondFactoryInitHash: "0x895ddadea89a852657055537968c164fe1178b5b8a6d93e1a2622685a0d2d576",
  ownerAuthorityResolverAddress: "0x167C85EBAB5AB3eA18BCCaDacee0188Dad2857C4",
  nftAuthorityResolverAddress: "0x7E8578a8ea8a441725c96183493295318A44D6EB",
  diamondKernelInitializer: "0x33AB24Ae30Fdcc6Ad7Ef794899a993A012DE49c5",
  namespacedCreate3Factory: "0x2EF901902fA6993949dbb32f8807fd2bFfB3D8da",
  multicall3Address: "0xca11bde05977b3631167028862be2a173976ca11",
  
  //Bare Bones Kernel
  barebones4337Facet: "0x104d0Bc6BdAa0980e0e627CdAbc23E8cF2383936",
  
  // Organization Configs
  globalOrganizationRegistry: "0xfb4c3957C7638c3Ec8b777AcF8bD65fd40df42b5",
  facetFallbackFailureHook: "0xd69475f2caA270aC738bBC2efd0600fC85ED7ED6",
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
  
  // We don't support hyperliquid since 4337 does support tstore and I didn't fix it for deployment
  // 999: {
  //   chainId: 999,
  //   chainName: "Hyperliquid",
  //   wethAddress: "0x5555555555555555555555555555555555555555",
  //   nativeCurrency: {
  //     name: "HYPE",
  //     symbol: "HYPE",
  //     decimals: 18
  //   },
  //   logoUrl: hyperliquidLogo,
  //   rpcUrls:["https://rpc.hyperliquid.xyz/evm", "https://hyperliquid.drpc.org"],
  //   blockExplorerUrls: ["https://hyperevmscan.io/"],
  //   coinGeckoSlug: "hyperevm",
  //   supportsEip1559: false,
  // }
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
