import { ExternalProvider } from "@ethersproject/providers";

type EthereumEvent = "connect" | "accountsChanged" | "chainChanged";

type EthereumEventMap = {
  connect: { chainId: string };
  accountsChanged: string[];
  chainChanged: string;
};


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

  on?<E extends keyof EthereumEventMap>(
    event: E,
    handler: (data: EthereumEventMap[E]) => void
  ): void;

  removeListener?<E extends keyof EthereumEventMap>(
    event: E,
    handler: (data: EthereumEventMap[E]) => void
  ): void;

  request?: (args: EthereumRequest) => Promise<unknown>;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export {};


