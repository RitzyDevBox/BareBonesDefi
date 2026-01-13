import { TypedDataDomain, TypedDataField } from "ethers";
import type { ProposalTypes } from "@walletconnect/types";

export enum Eip1193Method {
  EthChainId = "eth_chainId",
  EthAccounts = "eth_accounts",
  EthRequestAccounts = "eth_requestAccounts",

  // Transactions
  EthSendTransaction = "eth_sendTransaction",
  EthEstimateGas = "eth_estimateGas",

  // Read-only RPC (REQUIRED)
  EthCall = "eth_call",
  EthBlockNumber = "eth_blockNumber",
  EthGasPrice = "eth_gasPrice",
  EthGetBalance = "eth_getBalance",

  // Signing
  PersonalSign = "personal_sign",
  EthSignTypedDataV4 = "eth_signTypedData_v4",

  // Wallet UX
  WalletAddEthereumChain = "wallet_addEthereumChain",
  WalletSwitchEthereumChain = "wallet_switchEthereumChain",
  WalletWatchAsset = "wallet_watchAsset",
  WalletGetCapabilities = "wallet_getCapabilities",
}

export enum Eip1193MethodFull {
  // =========================
  // Signing
  // =========================
  EthSign = "eth_sign",
  EthSignTypedData = "eth_signTypedData",
  EthSignTypedDataV3 = "eth_signTypedData_v3",

  // =========================
  // Transactions
  // =========================
  EthSendRawTransaction = "eth_sendRawTransaction",


  // =========================
  // Permissions
  // =========================
  WalletGetPermissions = "wallet_getPermissions",
  WalletRequestPermissions = "wallet_requestPermissions",
  WalletRevokePermissions = "wallet_revokePermissions",

  // =========================
  // ERC-5792 (batching / status)
  // =========================
  WalletSendCalls = "wallet_sendCalls",
  WalletShowCallsStatus = "wallet_showCallsStatus",
  WalletGetCallsStatus = "wallet_getCallsStatus",

  // =========================
  // RPC passthrough (commonly expected)
  // =========================
  EthEstimateGas = "eth_estimateGas",
  EthGetCode = "eth_getCode",
  EthGetTransactionByHash = "eth_getTransactionByHash",
  EthGetTransactionReceipt = "eth_getTransactionReceipt",
  EthGetBlockByHash = "eth_getBlockByHash",
  EthBlockNumber = "eth_blockNumber",
  EthGetLogs = "eth_getLogs",

  // =========================
  // Debug / optional (some wallets expose)
  // =========================
  Web3ClientVersion = "web3_clientVersion",
  NetVersion = "net_version",
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

export type TypedDataPayload = {
  domain: TypedDataDomain;
  types: Record<string, TypedDataField[]>;
  primaryType: string;
  message: Record<string, any>;
};
