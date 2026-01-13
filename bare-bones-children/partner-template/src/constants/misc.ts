import { ethers } from "ethers";
import { TokenInfo } from "../components/TokenSelect/types";
import polygonLogo from "../assets/chains/polygon-logo.webp";
import hyperliquidLogo from "../assets/chains/hyperliquid-logo.png";


export const SwapRouter02ExecutorAddress = '0xBe6d02FD9335C2e1e33bBC174ad7ee36764C8EE7'
export const walletAddress_old = "0x6dc2f30d8d2b1683617aaecd98941d7e56ca61a1";
export const walletAddress = "0x2b94f955813532cdcf5bf77c4242fa762c132a79"
export const testTokenAddress = "0x8900e4fcd3c2e6d5400fde29719eb8b5fc811b3c";
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
export const NATIVE_ADDRESS = ZERO_ADDRESS
export const APP_NAME = import.meta.env.VITE_APP_NAME
export const WALLECT_CONNECT_WALLET_NAME = APP_NAME


export const DEFAULT_CHAIN_ID = 999;



export interface BareBonesConfiguration {
  diamondFactoryAddress: string;
  diamondFactoryInitHash: string;
  ownerAuthorityResolverAddress: string;
  nftAuthorityResolverAddress: string;
  multicall3Address: string,
}

/**
  DiamondCutFacet:        0xa023236BB1C1674b3c5F3C35b0e385C396EaFF21
  DiamondLoupeFacet:      0x9C598b8986B4d3b438cB3Dbc618ba9F52a21C527
  ValidationFacet:        0xA70278d5f2BbE5144c704c5166B00E6BAa3fe002
  executeFacet:           0x73F99409be7fc52Cb472e6C408ad38CAC183d616
  walletCallbackFacet:  0x1F7725a8708CAf75125A24e0F4f96e98a637C9B6
  DiamondFactory deployed at: 0x21B5B6032137CFe7d186eE1951F9A76e4ddC27CB

  OwnerAuthorityResolver:  0xEdE0607dF418821847b0380BF97b9f59eAFa1e0f
  NFTAuthorityResolver:  0xf4026fc07Ce667C6caA62F8623c68aD879BCE5c9

  Diamond init code hash: 0x9166f64381eb4cf19dde2cfe26444b234597dcfda8f950b6a375c299d70a87fd
 */
export const DEFAULT_BARE_BONES_CONFIG: BareBonesConfiguration = {
  diamondFactoryAddress: "0x21B5B6032137CFe7d186eE1951F9A76e4ddC27CB",
  diamondFactoryInitHash: "0x9166f64381eb4cf19dde2cfe26444b234597dcfda8f950b6a375c299d70a87fd",
  ownerAuthorityResolverAddress: "0xEdE0607dF418821847b0380BF97b9f59eAFa1e0f",
  nftAuthorityResolverAddress: "0xf4026fc07Ce667C6caA62F8623c68aD879BCE5c9",
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
