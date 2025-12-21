import { ExternalProvider } from "@ethersproject/providers";

type EthereumEvent = "connect" | "accountsChanged" | "chainChanged";

type EthereumRequest =
  | {
      method: "wallet_watchAsset";
      params: {
        type: "ERC20";
        options: {
          address: string;
          symbol: string;
          decimals: number;
          image?: string;
        };
      };
    }
  | {
      method: string;
      params?: unknown;
    };

interface EthereumProvider extends ExternalProvider {
  isMetaMask?: boolean;
  selectedAddress?: string;
  chainId?: string;

  on?: (
    event: EthereumEvent,
    handler: (data: unknown) => void
  ) => void;

  removeListener?: (
    event: EthereumEvent,
    handler: (data: unknown) => void
  ) => void;

  request?: (args: EthereumRequest) => Promise<unknown>;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export {};


