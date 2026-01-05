import { useEffect, useRef, useState } from "react";
import type { ProposalTypes } from "@walletconnect/types";
import type SignClient from "@walletconnect/sign-client";
import { getWalletConnectClient } from "./walletConnectClient";


/* -----------------------------
 * EIP-1193 methods
 * ---------------------------- */
export enum Eip1193Method {
  EthChainId = "eth_chainId",
  EthAccounts = "eth_accounts",
  EthRequestAccounts = "eth_requestAccounts",
  EthSendTransaction = "eth_sendTransaction",
  PersonalSign = "personal_sign",
  EthSignTypedDataV4 = "eth_signTypedData_v4",
  WalletSwitchEthereumChain = "wallet_switchEthereumChain",
  WalletAddEthereumChain = "wallet_addEthereumChain",
}

/* -----------------------------
 * Event envelopes
 * ---------------------------- */
export type SessionProposalEvent = {
  id: number;
  params: ProposalTypes.Struct;
};

export type SessionRequestEvent = {
  id: number;
  topic: string;
  params: {
    request: {
      method: string;
      params?: unknown[];
    };
  };
};

/* -----------------------------
 * Hook options
 * ---------------------------- */
type UseWalletConnectWalletOptions = {
  projectId: string;
  chains: readonly number[];
  accounts: readonly string[];

  onSendTransaction: (tx: unknown) => Promise<string>;
  onSignMessage: (msg: string) => Promise<string>;
  onSignTypedData: (typedData: unknown) => Promise<string>;
  onSwitchChain: (chainId: number) => Promise<void>;

  onSessionProposal: (proposal: SessionProposalEvent) => void;
};

/* -----------------------------
 * Hook
 * ---------------------------- */
export function useWalletConnectWallet(
  options: UseWalletConnectWalletOptions
) {
  const clientRef = useRef<SignClient | null>(null);

  const proposalHandlerRef = useRef(options.onSessionProposal);
  proposalHandlerRef.current = options.onSessionProposal;

  const [connected, setConnected] = useState(false);
  const [ready, setReady] = useState(false);

  /* -----------------------------
   * Init (singleton)
   * ---------------------------- */
  useEffect(() => {
    let mounted = true;
    let client: SignClient;

    const handleSessionDelete = () => {
      setConnected(false);
    };

    const handleProposal = (event: SessionProposalEvent) => {
      proposalHandlerRef.current(event);
    };

    getWalletConnectClient(options.projectId).then(c => {
      if (!mounted) return;

      client = c;
      clientRef.current = client;

      client.on("session_proposal", handleProposal);
      client.on("session_request", handleSessionRequest);
      client.on("session_delete", handleSessionDelete);

      setReady(true);
    });

    return () => {
      mounted = false;
      if (client) {
        client.off("session_proposal", handleProposal);
        client.off("session_request", handleSessionRequest);
        client.off("session_delete", handleSessionDelete);
      }
    };
  }, [options.projectId]);

  /* -----------------------------
   * Pair
   * ---------------------------- */
  async function pair(uri: string) {
    if (!clientRef.current || !ready) {
      throw new Error("WalletConnect not ready");
    }
    await clientRef.current.pair({ uri });
  }

  /* -----------------------------
   * Approve session
   * ---------------------------- */
  async function approveSession(proposal: SessionProposalEvent) {
    if (!clientRef.current) return;

    await clientRef.current.approve({
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
    if (!clientRef.current) return;

    await Promise.all(
      clientRef.current.session.getAll().map(session =>
        clientRef.current!.disconnect({
          topic: session.topic,
          reason: { code: 6000, message: "Wallet disconnected" },
        })
      )
    );

    setConnected(false);
  }

  /* -----------------------------
   * Respond helpers
   * ---------------------------- */
  function respondSuccess(topic: string, id: number, result: unknown) {
    return clientRef.current?.respond({
      topic,
      response: { id, jsonrpc: "2.0", result },
    });
  }

  function respondError(topic: string, id: number, error: unknown) {
    return clientRef.current?.respond({
      topic,
      response: {
        id,
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message:
            error instanceof Error
              ? error.message
              : "Internal error",
        },
      },
    });
  }

  /* -----------------------------
   * Session request handler
   * ---------------------------- */
  async function handleSessionRequest(event: SessionRequestEvent) {
    const { topic, id, params } = event;

    try {
      const result = await handleEip1193Request(params.request);
      await respondSuccess(topic, id, result);
    } catch (err) {
      await respondError(topic, id, err);
    }
  }

  /* -----------------------------
   * EIP-1193 dispatcher
   * ---------------------------- */
  async function handleEip1193Request(request: {
    method: string;
    params?: unknown[];
  }): Promise<unknown> {
    switch (request.method) {
      case Eip1193Method.EthChainId:
        return `0x${options.chains[0].toString(16)}`;

      case Eip1193Method.EthAccounts:
      case Eip1193Method.EthRequestAccounts:
        return options.accounts;

      case Eip1193Method.EthSendTransaction:
        return options.onSendTransaction(request.params?.[0]);

      case Eip1193Method.PersonalSign:
        return options.onSignMessage(request.params?.[0] as string);

      case Eip1193Method.EthSignTypedDataV4:
        return options.onSignTypedData(request.params?.[1]);

      case Eip1193Method.WalletSwitchEthereumChain:
        await options.onSwitchChain(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          parseInt((request.params?.[0] as any).chainId, 16)
        );
        return null;

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
    ready,
  };
}
