// =======================
// Universal Modal Models
// =======================

export enum UniversalActionType {
  SEND = "SEND",
  RECEIVE = "RECEIVE",
  WRAP = "WRAP",
  UNWRAP = "UNWRAP",
  SWAP = "SWAP",
  ADD_LIQUIDITY = "ADD_LIQUIDITY",
  REMOVE_LIQUIDITY = "REMOVE_LIQUIDITY",
  MINT_NFT = "MINT_NFT",
  TRANSFER_NFT = "TRANSFER_NFT",
  TEST = "TEST"
}

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
}

// Each input field in the modal:
export interface ActionField {
  id: string;                     // maps to output key (e.g. amountA, tokenB)
  component: FieldComponent;      // which UI widget to display
  label: string;                  // user-facing label
  optional?: boolean;             // hide required indicator if needed
  options?: unknown;
}

export const ActionSchemas: Record<UniversalActionType, ActionField[]> = {
  [UniversalActionType.SEND]: [
    { id: "asset", component: FieldComponent.TOKEN_PICKER, label: "Asset" },
    { id: "amount", component: FieldComponent.AMOUNT, label: "Amount" },
    { id: "recipient", component: FieldComponent.ADDRESS, label: "Recipient Address" },
  ],

  [UniversalActionType.RECEIVE]: [
    { id: "asset", component: FieldComponent.TOKEN_PICKER, label: "Asset" },
    { id: "amount", component: FieldComponent.AMOUNT, label: "Amount" },
  ],

  [UniversalActionType.WRAP]: [
    { id: "amount", component: FieldComponent.AMOUNT, label: "ETH Amount" },
  ],

  [UniversalActionType.UNWRAP]: [
    { id: "amount", component: FieldComponent.AMOUNT, label: "WETH Amount" },
  ],

  [UniversalActionType.SWAP]: [
    { id: "tokenA", component: FieldComponent.TOKEN_PICKER, label: "From Token" },
    { id: "tokenB", component: FieldComponent.TOKEN_PICKER, label: "To Token" },
    { id: "amountIn", component: FieldComponent.AMOUNT, label: "Amount In" },
    { id: "slippage", component: FieldComponent.PERCENT, label: "Slippage" },
  ],

  [UniversalActionType.ADD_LIQUIDITY]: [
    { id: "tokenA", component: FieldComponent.TOKEN_PICKER, label: "Token A" },
    { id: "amountA", component: FieldComponent.AMOUNT, label: "Amount A" },
    { id: "tokenB", component: FieldComponent.TOKEN_PICKER, label: "Token B" },
    { id: "amountB", component: FieldComponent.AMOUNT, label: "Amount B" },
  ],

  [UniversalActionType.REMOVE_LIQUIDITY]: [
    { id: "lpAmount", component: FieldComponent.AMOUNT, label: "LP Amount" },
  ],

  [UniversalActionType.MINT_NFT]: [
    { id: "tokenId", component: FieldComponent.NFT_PICKER, label: "Token ID" },
    { id: "quantity", component: FieldComponent.AMOUNT, label: "Quantity" },
  ],

  [UniversalActionType.TRANSFER_NFT]: [
    { id: "tokenId", component: FieldComponent.NFT_PICKER, label: "Token ID" },
    { id: "recipient", component: FieldComponent.ADDRESS, label: "Recipient Address" },
  ],

  [UniversalActionType.TEST]: [
    { id: "tokenPicker", component: FieldComponent.TOKEN_PICKER, label: "Token Picker" },
    { id: "nftPicker", component: FieldComponent.NFT_PICKER, label: "NFT Picker" },
    { id: "amount", component: FieldComponent.AMOUNT, label: "Amount" },
    { id: "percent", component: FieldComponent.PERCENT, label: "Percent" }, 
    { id: "address", component: FieldComponent.ADDRESS, label: "Address" },
    { id: "text", component: FieldComponent.TEXT, label: "Text" },
    { id: "number", component: FieldComponent.NUMBER, label: "Number" },
  ]
};
