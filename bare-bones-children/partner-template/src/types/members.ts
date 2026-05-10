// Type model for the Members & Roles section.
// Matches the shape produced by the design's seed data so we can swap in
// on-chain data later without touching the views — the read paths here are
// all derived (no member->role or role->permission lookups buried in components).

export enum AccountTypeId {
  Member = "member",
  Investor = "investor",
  Contractor = "contractor",
}

export enum OnboardingStatus {
  Invited = "invited",
  Active = "active",
  Suspended = "suspended",
  Departed = "departed",
}

export enum SbtStatus {
  Active = "active",
  Pending = "pending",
  Suspended = "suspended",
  Revoked = "revoked",
}

export enum WalletKind {
  SmartAccount = "smart-account",
  Eoa = "eoa",
}

export enum KycStatus {
  Verified = "verified",
  Pending = "pending",
  NotRequired = "not-required",
}

export enum SignatureRequirementType {
  Single = "single",
  Multisig = "multisig",
}

export enum ConstraintOp {
  Eq = "eq",
  Lt = "lt",
  Lte = "lte",
  Gt = "gt",
  Gte = "gte",
}

export enum ActivityKind {
  Vote = "vote",
  Role = "role",
  Tx = "tx",
  Sbt = "sbt",
  Create = "create",
  Kyc = "kyc",
}

export enum SlugStatus {
  Active = "active",
  Paused = "paused",
  Locked = "locked",
}

export interface AccountType {
  id: AccountTypeId;
  name: string;
  sub: string;
  desc: string;
  kycDefault: boolean;
}

export interface Constraint {
  param: string;
  op: ConstraintOp;
  value: string;
  type: string;
}

export type SignatureRequirement =
  | { type: SignatureRequirementType.Single }
  | { type: SignatureRequirementType.Multisig; threshold: number; of: number };

export interface Permission {
  id: string;
  name: string;
  target: string;
  targetName: string;
  function: string;
  selector: string;
  constraints: Constraint[];
  sigRequirement: SignatureRequirement;
  timeLock: string | null;
  validity: { start: string; end: string | null };
  rateLimit: { maxCalls: number; windowSeconds: number } | null;
  usedByRoles: number;
}

export interface Role {
  id: string;
  name: string;
  desc: string;
  accountTypes: AccountTypeId[];
  permissions: string[];
  cap: { maxMembers?: number; maxValue?: string } | null;
  isDefault: boolean;
  /** Built-in role (SuperAdmin, Admin, Pauser, RoleManager, MemberManager,
   *  PermissionManager, PayrollOperator, TreasuryOperator). System roles are
   *  not editable, deletable, or assignable via the standard role-assignment
   *  UX — they exist as a contract invariant, surfaced via the subgraph's
   *  synthesized rows. */
  isSystemRole: boolean;
  memberCount: number;
}

export interface Member {
  /** Frontend-side identifier — same as the contract's stable `memberId` so
   *  React keys, list indexes, and member-mutating call sites can use this
   *  directly without an extra lookup. */
  id: string;
  /** Stable global identifier from the contract (decimal string of uint256).
   *  Pass to `useMtaActions` mutators (`assignRoles`, `setMemberStatus`, etc.)
   *  — the contract takes `memberId[]`, never `address[]`. */
  memberId: string;
  name: string;
  initials: string;
  avatarHue: number;
  email: string;
  jurisdiction: string;
  accountType: AccountTypeId;
  roles: string[];
  wallet: { address: string; kind: WalletKind; deployed: boolean };
  sbt: { status: SbtStatus; tokenId: number | null; contract: string; mintedAt: string | null };
  onboardingStatus: OnboardingStatus;
  kyc: { required: boolean; status: KycStatus };
  dateAdded: string;
}

export interface ActivityEntry {
  when: string;
  who: string;
  what: string;
  kind: ActivityKind;
}
