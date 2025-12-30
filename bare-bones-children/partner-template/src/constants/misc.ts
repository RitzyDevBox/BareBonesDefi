import { ethers } from "ethers";
import { TokenInfo } from "../components/TokenSelect/types";
import ethereumLogo from "../assets/chains/eth-logo.png";
import hyperliquidLogo from "../assets/chains/hyperliquid-logo.png";


export const SwapRouter02ExecutorAddress = '0xBe6d02FD9335C2e1e33bBC174ad7ee36764C8EE7'
export const walletAddress_old = "0x6dc2f30d8d2b1683617aaecd98941d7e56ca61a1";
export const walletAddress = "0x2b94f955813532cdcf5bf77c4242fa762c132a79"
export const testTokenAddress = "0x8900e4fcd3c2e6d5400fde29719eb8b5fc811b3c";
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
export const NATIVE_ADDRESS = ZERO_ADDRESS
export const MULTICALL3_ADDRESS = '0xca11bde05977b3631167028862be2a173976ca11';
export const OWNER_AUTHORITY_RESOLVER = "0x7E2a43DD6b95c518a5248fD5a2A57315D767499b";
export const NFT_AUTHORITY_RESOLVER = "0xFA565823BF266B26F7cA44C2C305BB303C89b63a";
export const DIAMOND_FACTORY_ADDRESS = "0x270EEF348212855eCb43374cEAfE012FA8c12B4e";
export const DIAMOND_INIT_HASH = "0x7f1c1485b422e93d1bde9f6b74e6092d4a69bff10c8ab93283c707f843ec44ff";
export const APP_NAME = "Bare Bones"

export const DEFAULT_CHAIN_ID = 999;

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
}



export const CHAIN_INFO_MAP: Record<number, ChainInfo> ={
  1: {
    chainId: 1,
    chainName: "Ethereum",
    wethAddress: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    nativeCurrency: {
      name: "ETHER",
      symbol: "ETH",
      decimals: 18
    },
    logoUrl: ethereumLogo,
    rpcUrls: ["https://eth.llamarpc.com"],
    blockExplorerUrls: ["https://etherscan.io"],
    coinGeckoSlug: "ethereum",
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
  }
}

// Ethereum
export const NATIVE_ETH: TokenInfo = {
  chainId: 1,
  address: ethers.constants.AddressZero,
  symbol: "ETH",
  name: "Ether",
  decimals: 18,
  logoURI: ethereumLogo,
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
  1: NATIVE_ETH,
  999: NATIVE_HYPE,
};
