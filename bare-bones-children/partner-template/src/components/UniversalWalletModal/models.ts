// =======================
// Universal Modal Models
// =======================

import { BigNumber } from "ethers";

// What KIND of asset the user is interacting with
export enum AssetType {
  NATIVE = "NATIVE",
  ERC20 = "ERC20",
  ERC721 = "ERC721",
  ERC1155 = "ERC1155",
}

// What KIND of UI input should render
export enum FieldComponent {
  TOKEN_PICKER = "TOKEN_PICKER",
  NFT_PICKER = "NFT_PICKER",
  ADDRESS = "ADDRESS",
  AMOUNT = "AMOUNT",
  PERCENT = "PERCENT",
  NUMBER = "NUMBER",
  TEXT = "TEXT",
  USE_TOKEN_INFO = "USE_TOKEN_INFO"
}

export enum ActionNodeType {
  Field,
  Resolver,
}

export interface ActionNode {
  id: string;
  component: FieldComponent;
  type?: ActionNodeType; // default = Field
  deps?: readonly string[];
  label?: string;
  optional?: boolean;
}

// --------------------
// Value inference
// --------------------

type ValueForComponent<C extends FieldComponent> =
  C extends FieldComponent.TOKEN_PICKER ? string :
  C extends FieldComponent.AMOUNT ? BigNumber :
  C extends FieldComponent.PERCENT ? number :
  C extends FieldComponent.ADDRESS ? string :
  C extends FieldComponent.TEXT ? string :
  C extends FieldComponent.NUMBER ? number :
  C extends FieldComponent.USE_TOKEN_INFO ? { decimals: number, tokenSymbol: string } :
  unknown;

type ValueForResolverNode<N extends ActionNode> =
  N["id"] extends "assetInfo"
    ? { symbol: string; decimals: number }
    : unknown;

// --------------------
// Schema → Values
// --------------------

type FieldNode<N extends ActionNode> =
  N["type"] extends ActionNodeType.Resolver ? never : N;

type FieldsToValues<S extends readonly ActionNode[]> = {
  [N in FieldNode<S[number]> as N["id"]]: ValueForComponent<N["component"]>;
};

type ResolverNodesToValues<S extends readonly ActionNode[]> = {
  [N in Extract<S[number], { type: ActionNodeType.Resolver }> as N["id"]]:
    ValueForResolverNode<N>;
};

export type ActionValues<A extends UniversalActionType> =
  FieldsToValues<(typeof ActionSchemas)[A]["fields"]> &
  ResolverNodesToValues<(typeof ActionSchemas)[A]["fields"]>;

// --------------------
// Actions
// --------------------

export enum UniversalActionType {
  SEND = "SEND",
  RECEIVE = "RECEIVE",
  WRAP = "WRAP",
  UNWRAP = "UNWRAP",
  SWAP = "SWAP",
  ADD_V2_LP = "ADD_V2_LP",
  REMOVE_V2_LP = "REMOVE_V2_LP",
  TEST = "TEST",
}

export type SendModalResponse = ActionValues<UniversalActionType.SEND>;
export type ReceiveModalResponse = ActionValues<UniversalActionType.RECEIVE>;
export type WrapModalResponse = ActionValues<UniversalActionType.WRAP>;
export type UnwrapModalResponse = ActionValues<UniversalActionType.UNWRAP>;
export type SwapModalResponse = ActionValues<UniversalActionType.SWAP>;
export type AddLiquidityModalResponse = ActionValues<UniversalActionType.ADD_V2_LP>;
export type RemoveLiquidityModalResponse = ActionValues<UniversalActionType.REMOVE_V2_LP>;

// --------------------
// Schemas
// --------------------

export const ActionSchemas = {
  [UniversalActionType.SEND]: {
    fields: [
      { id: "asset", component: FieldComponent.TOKEN_PICKER, label: "Asset" },
      { id: "amount", component: FieldComponent.AMOUNT, label: "Amount" },
      { id: "recipient", component: FieldComponent.ADDRESS, label: "Recipient Address" },
      { id: "assetInfo", type: ActionNodeType.Resolver, component: FieldComponent.USE_TOKEN_INFO, deps: ["asset"] },
    ],
  },

  [UniversalActionType.RECEIVE]: {
    fields: [
      { id: "asset", component: FieldComponent.TOKEN_PICKER, label: "Asset" },
      { id: "amount", component: FieldComponent.AMOUNT, label: "Amount" },
    ],
  },

  [UniversalActionType.WRAP]: {
    fields: [{ id: "amount", component: FieldComponent.AMOUNT, label: "ETH Amount" }],
  },

  [UniversalActionType.UNWRAP]: {
    fields: [{ id: "amount", component: FieldComponent.AMOUNT, label: "WETH Amount" }],
  },

  [UniversalActionType.SWAP]: {
    fields: [
      { id: "tokenA", component: FieldComponent.TOKEN_PICKER, label: "From Token" },
      { id: "tokenB", component: FieldComponent.TOKEN_PICKER, label: "To Token" },
      { id: "amountIn", component: FieldComponent.AMOUNT, label: "Amount In" },
      { id: "slippage", component: FieldComponent.PERCENT, label: "Slippage" },
    ],
  },

  [UniversalActionType.ADD_V2_LP]: {
    fields: [
      { id: "tokenA", component: FieldComponent.TOKEN_PICKER, label: "Token A" },
      { id: "amountA", component: FieldComponent.AMOUNT, label: "Amount A" },
      { id: "tokenB", component: FieldComponent.TOKEN_PICKER, label: "Token B" },
      { id: "amountB", component: FieldComponent.AMOUNT, label: "Amount B" },
    ],
  },

  [UniversalActionType.REMOVE_V2_LP]: {
    fields: [
      { id: "lpAmount", component: FieldComponent.AMOUNT, label: "LP Amount" },
    ],
  },

  [UniversalActionType.TEST]: {
    fields: [
      { id: "tokenPicker", component: FieldComponent.TOKEN_PICKER, label: "Token Picker" },
      { id: "nftPicker", component: FieldComponent.NFT_PICKER, label: "NFT Picker" },
      { id: "amount", component: FieldComponent.AMOUNT, label: "Amount" },
      { id: "percent", component: FieldComponent.PERCENT, label: "Percent" },
      { id: "address", component: FieldComponent.ADDRESS, label: "Address" },
      { id: "text", component: FieldComponent.TEXT, label: "Text" },
      { id: "number", component: FieldComponent.NUMBER, label: "Number" },
    ],
  },
} as const satisfies Record<
  UniversalActionType,
  {
    readonly fields: readonly ActionNode[];
  }
>;
