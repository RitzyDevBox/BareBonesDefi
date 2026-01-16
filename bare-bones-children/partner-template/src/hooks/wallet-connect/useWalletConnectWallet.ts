import { useEffect, useRef, useState } from "react";
import { TransactionRequest } from "@ethersproject/providers";
import { useWalletProvider } from "../useWalletProvider";
import { useWalletConnectClient } from "../../components/WalletConnect/WalletConnectContext";
import {
  Eip1193Method,
  SessionProposalEvent,
  SessionRequestEvent,
  TypedDataPayload,
} from "./types";

export type UseWalletConnectWalletOptions = {
  projectId: string;
  chains: readonly number[];
  accounts: readonly string[];
  onBlockNumber: () => Promise<number>;
  onEthCall: (tx: TransactionRequest) => Promise<string>;
  onEstimateGas: (tx: TransactionRequest) => Promise<string>;
  onSendTransaction: (tx: TransactionRequest) => Promise<string>;
  onSignMessage: (msg: string) => Promise<string>;
  onSignTypedData: (
    user: string,
    typedData: TypedDataPayload
  ) => Promise<string>;
  onSwitchChain: (chainId: number) => Promise<void>;
};

export function useWalletConnectWallet(
  options: UseWalletConnectWalletOptions
) {
  const walletKit = useWalletConnectClient();  // WalletKit instance per docs
  const { chainId } = useWalletProvider();

  const [connected, setConnected] = useState(false);
  const [pendingProposal, setPendingProposal] =
    useState<SessionProposalEvent | null>(null);

  /* -----------------------------
   * Live state ref (NO STALE CLOSURES)
   * ---------------------------- */
  const stateRef = useRef({
    chainId,
    accounts: options.accounts,
    onBlockNumber: options.onBlockNumber,
    onEthCall: options.onEthCall,
    onEstimateGas: options.onEstimateGas,
    onSendTransaction: options.onSendTransaction,
    onSignMessage: options.onSignMessage,
    onSignTypedData: options.onSignTypedData,
    onSwitchChain: options.onSwitchChain,
  });

  stateRef.current = {
    chainId,
    accounts: options.accounts,
    onBlockNumber: options.onBlockNumber,
    onEthCall: options.onEthCall,
    onEstimateGas: options.onEstimateGas,
    onSendTransaction: options.onSendTransaction,
    onSignMessage: options.onSignMessage,
    onSignTypedData: options.onSignTypedData,
    onSwitchChain: options.onSwitchChain,
  };

  /* -----------------------------
   * Init / listeners (per docs)
   * ---------------------------- */
  useEffect(() => {
    const onProposal = (event: SessionProposalEvent) => {
      setPendingProposal(event);
    };

    const onRequest = async (event: SessionRequestEvent) => {
      const { topic, id, params } = event;

      try {
        const result = await handleEip1193Request(params.request);

        await walletKit.respondSessionRequest({
          topic,
          response: { id, jsonrpc: "2.0", result },
        });
      } catch (err) {
        await walletKit.respondSessionRequest({
          topic,
          response: {
            id,
            jsonrpc: "2.0",
            error: {
              code: -32603,
              message:
                err instanceof Error ? err.message : "Internal error",
            },
          },
        });
      }
    };

    const onDelete = () => {
      setConnected(false);
    };

    walletKit.on("session_proposal", onProposal);
    walletKit.on("session_request", onRequest);
    walletKit.on("session_delete", onDelete);

    if (Object.values(walletKit.getActiveSessions()).length > 0) {
      setConnected(true);
    }

    return () => {
      walletKit.off("session_proposal", onProposal);
      walletKit.off("session_request", onRequest);
      walletKit.off("session_delete", onDelete);
    };
  }, [walletKit]);

  /* -----------------------------
   * Pair (same semantics)
   * ---------------------------- */
  async function pair(uri: string) {
    await walletKit.pair({ uri });
  }

  /* -----------------------------
   * Approve session
   * per Wallet SDK web usage
   * ---------------------------- */
  async function approveSession(proposal: SessionProposalEvent) {
    await walletKit.approveSession({
      id: proposal.id,
      namespaces: {
        eip155: {
          accounts: options.chains.flatMap(chain =>
            options.accounts.map(
              account => `eip155:${chain}:${account}`
            )
          ),
          methods: Object.values(Eip1193Method),
          events: ["accountsChanged", "chainChanged"],
        },
      },
    });

    setConnected(true);
    setPendingProposal(null);
  }

  function clearProposal() {
    setPendingProposal(null);
  }

  /* -----------------------------
   * Disconnect (WalletKit)
   * ---------------------------- */
  async function disconnect() {
    for (const session of Object.values(walletKit.getActiveSessions())) {
      await walletKit.disconnectSession({
        topic: session.topic,
        reason: { code: 6000, message: "Wallet disconnected" },
      });
    }
    setConnected(false);
    setPendingProposal(null);
  }

  /* -----------------------------
   * Set active account
   * (emit session event)
   * ---------------------------- */
  async function setActiveAccount(address: string) {
    if (!chainId) return;

    for (const session of Object.values(walletKit.getActiveSessions())) {
      const namespaces = session.namespaces;

      const updatedNamespaces = {
        ...namespaces,
        eip155: {
          ...namespaces.eip155,
          accounts: options.chains.map(
            chain => `eip155:${chain}:${address}`
          ),
        },
      };

      const { acknowledged } = await walletKit.updateSession({
        topic: session.topic,
        namespaces: updatedNamespaces,
      });

      // Wait until the dapp accepts the update
      await acknowledged();

      // Optional (harmless, sometimes useful)
      walletKit.emitSessionEvent({
        topic: session.topic,
        event: {
          name: "accountsChanged",
          data: [address],
        },
        chainId: `eip155:${chainId}`,
      });
    }
  }

  /* -----------------------------
   * EIP-1193 dispatcher (same)
   * ---------------------------- */
  async function handleEip1193Request(request: {
    method: string;
    params?: unknown[];
  }): Promise<unknown> {
    const state = stateRef.current;

    switch (request.method) {
      case Eip1193Method.EthChainId: {
        if (state.chainId == null) {
          throw new Error("Wallet not connected to a chain");
        }
        return `0x${state.chainId.toString(16)}`;
      }

      case Eip1193Method.EthAccounts:
      case Eip1193Method.EthRequestAccounts:
        return state.accounts;

      case Eip1193Method.EthBlockNumber: {
        const block = await state.onBlockNumber();
        return `0x${block.toString(16)}`;
      }

      case Eip1193Method.EthCall:
        return state.onEthCall(
          request.params?.[0] as TransactionRequest
        );

      case Eip1193Method.EthEstimateGas:
        return state.onEstimateGas(
          request.params?.[0] as TransactionRequest
        );

      case Eip1193Method.EthSendTransaction:
        return state.onSendTransaction(
          request.params?.[0] as TransactionRequest
        );

      case Eip1193Method.PersonalSign:
        return state.onSignMessage(
          request.params?.[0] as string
        );

      case Eip1193Method.EthSignTypedDataV4: {
        const [user, raw] = request.params as [string, string];
        if (typeof raw !== "string") {
          throw new Error("Invalid typed data payload");
        }
        return state.onSignTypedData(user, JSON.parse(raw));
      }

      case Eip1193Method.WalletSwitchEthereumChain:
        await state.onSwitchChain(
          parseInt((request.params?.[0] as any).chainId, 16)
        );
        return null;

      case Eip1193Method.WalletGetCapabilities:
        return {
          atomicBatch: false,
          paymasterService: false,
          sessionKeys: false,
        };

      case Eip1193Method.WalletAddEthereumChain:
        return null;

      default:
        throw new Error(`Unsupported method ${request.method}`);
    }
  }

  return {
    pair,
    approveSession,
    setActiveAccount,
    disconnect,
    connected,
    pendingProposal,
    clearProposal
  };
}
