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
  onEstimateGas: (tx: TransactionRequest) => Promise<string>;
  onSendTransaction: (tx: TransactionRequest) => Promise<string>;
  onSignMessage: (msg: string) => Promise<string>;
  onSignTypedData: (user: string, typedData: TypedDataPayload) => Promise<string>;
  onSwitchChain: (chainId: number) => Promise<void>;
  onSessionProposal: (proposal: SessionProposalEvent) => void;
};

export function useWalletConnectWallet(
  options: UseWalletConnectWalletOptions
) {
  const client = useWalletConnectClient();
  const { chainId: activeChainId } = useWalletProvider();
  const [connected, setConnected] = useState(false);

  /* -----------------------------
   * Live state ref (CRITICAL FIX)
   * ---------------------------- */
  const stateRef = useRef({
    chainId: activeChainId,
    accounts: options.accounts,
    onEstimateGas: options.onEstimateGas,
    onSendTransaction: options.onSendTransaction,
    onSignMessage: options.onSignMessage,
    onSignTypedData: options.onSignTypedData,
    onSwitchChain: options.onSwitchChain,
  });

  // keep ref up to date every render
  stateRef.current = {
    chainId: activeChainId,
    accounts: options.accounts,
    onEstimateGas: options.onEstimateGas,
    onSendTransaction: options.onSendTransaction,
    onSignMessage: options.onSignMessage,
    onSignTypedData: options.onSignTypedData,
    onSwitchChain: options.onSwitchChain,
  };

  /* -----------------------------
   * Proposal handler ref (already correct)
   * ---------------------------- */
  const proposalHandlerRef = useRef(options.onSessionProposal);
  proposalHandlerRef.current = options.onSessionProposal;

  /* -----------------------------
   * Init / listeners
   * ---------------------------- */
  useEffect(() => {
    const handleSessionDelete = () => {
      setConnected(false);
    };

    const handleProposal = (event: SessionProposalEvent) => {
      proposalHandlerRef.current(event);
    };

    const handleSessionRequest = async (event: SessionRequestEvent) => {
      const { topic, id, params } = event;

      try {
        const result = await handleEip1193Request(params.request);
        await client.respond({
          topic,
          response: { id, jsonrpc: "2.0", result },
        });
      } catch (err) {
        await client.respond({
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

    client.on("session_proposal", handleProposal);
    client.on("session_request", handleSessionRequest);
    client.on("session_delete", handleSessionDelete);

    if (client.session.getAll().length > 0) {
      setConnected(true);
    }

    return () => {
      client.off("session_proposal", handleProposal);
      client.off("session_request", handleSessionRequest);
      client.off("session_delete", handleSessionDelete);
    };
  }, [client]);

  /* -----------------------------
   * Pair
   * ---------------------------- */
  async function pair(uri: string) {
    await client.pair({ uri });
  }

  /* -----------------------------
   * Approve session
   * ---------------------------- */
  async function approveSession(proposal: SessionProposalEvent) {
    await client.approve({
      id: proposal.id,
      relayProtocol: proposal.params.relays[0].protocol,
      namespaces: {
        eip155: {
          accounts: options.chains.flatMap(chainId =>
            options.accounts.map(
              account => `eip155:${chainId}:${account}`
            )
          ),
          methods: Object.values(Eip1193Method),
          events: ["accountsChanged", "chainChanged"],
        },
      },
    });

    setConnected(true);
  }

  /* -----------------------------
   * Disconnect
   * ---------------------------- */
  async function disconnect() {
    await Promise.all(
      client.session.getAll().map(session =>
        client.disconnect({
          topic: session.topic,
          reason: { code: 6000, message: "Wallet disconnected" },
        })
      )
    );
    setConnected(false);
  }

  /* -----------------------------
   * EIP-1193 dispatcher (reads ONLY from ref)
   * ---------------------------- */
  async function handleEip1193Request(request: {
    method: string;
    params?: unknown[];
  }): Promise<unknown> {
    const state = stateRef.current;

    switch (request.method) {
      case Eip1193Method.EthChainId:
        if (!state.chainId) {
          throw new Error("Wallet not connected to a chain");
        }
        return `0x${state.chainId.toString(16)}`;

      case Eip1193Method.EthAccounts:
      case Eip1193Method.EthRequestAccounts:
        return state.accounts;

      case Eip1193Method.EthEstimateGas:
        return options.onEstimateGas(
          request.params?.[0] as TransactionRequest
        );
      case Eip1193Method.EthSendTransaction:
        return state.onSendTransaction(
          request.params?.[0] as TransactionRequest
        );

      case Eip1193Method.PersonalSign:
        return state.onSignMessage(request.params?.[0] as string);

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
    disconnect,
    connected,
  };
}
