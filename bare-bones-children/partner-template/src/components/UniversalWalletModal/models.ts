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
  USE_TOKEN_INFO = "USE_TOKEN_INFO",
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
  C extends FieldComponent.USE_TOKEN_INFO ? { decimals: number; tokenSymbol: string } :
  unknown;

type ValueForResolverNode<N extends ActionNode> =
  N["id"] extends "assetInfo"
    ? { symbol: string; decimals: number }
    : unknown;

// --------------------
// Schema → Values
// --------------------

export type FieldNode<N extends ActionNode> =
  N["type"] extends ActionNodeType.Resolver ? never : N;

export type FieldsToValues<S extends readonly ActionNode[]> = {
  [N in FieldNode<S[number]> as N["id"]]: ValueForComponent<N["component"]>;
};

export type ResolverNodesToValues<S extends readonly ActionNode[]> = {
  [N in Extract<S[number], { type: ActionNodeType.Resolver }> as N["id"]]:
    ValueForResolverNode<N>;
};

export type ActionSchema = {
  readonly fields: readonly ActionNode[];
};

export type ValuesFromSchema<S extends { fields: readonly ActionNode[] }> =
  FieldsToValues<S["fields"]> &
  ResolverNodesToValues<S["fields"]>;


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
}
