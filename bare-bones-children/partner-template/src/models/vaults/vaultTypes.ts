// vaultTypes.ts
export enum AssetType {
  Native = 0,
  ERC20 = 1,
  ERC721 = 2,
  ERC1155 = 3,
}

export enum LimitKind {
  Unset = 0,
  Absolute = 1,
  PercentOfBalance = 2,
  Delay = 3,
}

export enum PolicyScopeKind {
  AssetType = 0,
  AssetTypeAddress = 1,
  AssetTypeAddressId = 2,
}

export interface PolicyScope {
  kind: PolicyScopeKind;
  assetType: AssetType;
  asset: string;
  id: string;
}

export interface LimitPolicy {
  kind: LimitKind;
  windowSeconds: number;
  proposalDelaySeconds: number;
  value: string;
}

export enum VaultUpdateKind {
  POLICY = "POLICY",
  DEFAULT_PROPOSAL_DELAY = "DEFAULT_PROPOSAL_DELAY",
  DEFAULT_RELEASE_DELAY = "DEFAULT_RELEASE_DELAY",
  WITHDRAW_ADDRESS_DELAY = "WITHDRAW_ADDRESS_DELAY",
  WITHDRAW_ADDRESS = "WITHDRAW_ADDRESS",
}
