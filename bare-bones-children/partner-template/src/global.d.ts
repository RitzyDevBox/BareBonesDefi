import { ExternalProvider } from "@ethersproject/providers";

type EthereumEvent = "connect" | "accountsChanged" | "chainChanged";

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
  request?: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export {};
