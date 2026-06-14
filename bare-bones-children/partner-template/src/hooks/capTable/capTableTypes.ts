// Cap-table view models. Mirror the on-chain shapes in
// BareBonesDiamond/src/captable/interfaces/IShareToken.sol (ClassParams) but in a
// frontend-friendly form (numbers instead of BigNumber, names joined from the MTA
// member registry). See CAPTABLE.md / CAPTABLE_DESIGN_HANDOFF.md.

export enum VestKind {
  None = 0,
  Linear = 1,
  Chunked = 2,
}

export enum DistributionPolicy {
  VestedOnly = 0,
  AccrueAndPayOnVest = 1,
  Full = 2,
}

export enum ClassStatus {
  Active = 0,
  Retired = 1,
  Removed = 2,
}

/** On-chain ClassParams, decoded. Field order matches the Solidity struct so it can
 *  be re-encoded for `createClass` / `deployFor.defaultClass`. */
export interface ClassParams {
  name: string;
  voteWeightBps: number; // 10000 = 1.0x
  vestKind: VestKind;
  vestCliff: number; // seconds
  vestDuration: number; // seconds
  vestPeriod: number; // seconds
  chunkAmount: string; // uint256 as decimal string
  transferLockDuration: number; // seconds
  transferGate: string;
  payoutPriority: number; // 1 = paid first
  distributionWeightBps: number; // 10000 = 1.0x
  distributionPolicy: DistributionPolicy;
  authorizedCap: string; // 0 = unlimited
  excludeFromFullyDiluted: boolean;
  excludeFromVotingTotal: boolean;
  unvestedVotes: boolean;
  requiresLiquidityEvent: boolean;
  vestingStrategy: string;
  transferPolicy: string;
  voteStrategy: string;
}

export interface CapClass {
  classId: number;
  params: ClassParams;
  status: ClassStatus;
  totalIssued: number;
  reservedPool: number;
  /** stable display colour, derived from classId */
  color: string;
  isPool: boolean; // reservedPool > 0 && totalIssued === 0 → treated as an option pool
}

export interface CapHolder {
  /** `${address}-${classId}` — stable row key */
  id: string;
  address: string;
  classId: number;
  shares: number;
  vested: number;
  /** joined from the MTA member registry (falls back to a shortened address) */
  name: string;
  initials: string;
  avatarHue: number;
  /** member | investor | authorizedUser | (unknown) */
  type: string;
  role: string;
}

export interface CapTableState {
  hasTable: boolean;
  shareTokenAddress: string | null;
  classes: CapClass[];
  holders: CapHolder[];
  fullyDiluted: number;
  issuedTotal: number;
  vestedTotal: number;
  loading: boolean;
  error: string | null;
}

export const EMPTY_CAP_TABLE_STATE: CapTableState = {
  hasTable: false,
  shareTokenAddress: null,
  classes: [],
  holders: [],
  fullyDiluted: 0,
  issuedTotal: 0,
  vestedTotal: 0,
  loading: false,
  error: null,
};

/** Deterministic class colour so the same class is always the same hue across renders. */
const CLASS_COLORS = [
  "#6366f1", // common — indigo
  "#10b981", // preferred — emerald
  "#f59e0b", // amber
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#8b5cf6", // violet
];
export function classColor(classId: number): string {
  return CLASS_COLORS[classId % CLASS_COLORS.length];
}
