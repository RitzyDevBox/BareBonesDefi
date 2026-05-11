// Seed data for the Members section. Mirrors the design's `members-data.jsx`
// — kept as a thin factory so future on-chain reads can drop in by replacing
// the export bodies (the type contracts in `types/members.ts` won't change).

import {
  AccountType, AccountTypeId, ActivityEntry, ActivityKind, ConstraintOp,
  KycStatus, Member, OnboardingStatus, Permission, Role, SbtStatus,
  SignatureRequirementType, WalletKind,
} from "../types/members";

export const ACCOUNT_TYPES: AccountType[] = [
  {
    id: AccountTypeId.Member,
    name: "Member",
    sub: "Equity holder · governance rights",
    desc: "Holds equity and votes on proposals. The default for core contributors and founders.",
    kycDefault: true,
  },
  {
    id: AccountTypeId.Investor,
    name: "Investor",
    sub: "Economic interest only",
    desc: "LP, SAFE holder, or token-only investor. No governance unless explicitly granted.",
    kycDefault: true,
  },
  {
    id: AccountTypeId.AuthorizedUser,
    name: "Contractor",
    sub: "Service provider · payee",
    desc: "Receives payroll or per-invoice payments. No equity, no governance rights.",
    kycDefault: false,
  },
];

export const PERMISSIONS_SEED: Permission[] = [
  {
    id: "perm_treasury_small",
    name: "Approve treasury spend < $10k",
    target: "0x4Aa3D5e6F7a8B9c0D1e2F3a4B5c6D7e8F9A0b1C2",
    targetName: "Treasury Safe",
    function: "execTransaction(address,uint256,bytes)",
    selector: "0x6a761202",
    constraints: [{ param: "value", op: ConstraintOp.Lt, value: "10000000000", type: "uint256" }],
    sigRequirement: { type: SignatureRequirementType.Multisig, threshold: 2, of: 4 },
    timeLock: null,
    validity: { start: "2026-01-01", end: null },
    rateLimit: null,
    usedByRoles: 3,
  },
  {
    id: "perm_treasury_large",
    name: "Approve treasury spend ≥ $10k",
    target: "0x4Aa3D5e6F7a8B9c0D1e2F3a4B5c6D7e8F9A0b1C2",
    targetName: "Treasury Safe",
    function: "execTransaction(address,uint256,bytes)",
    selector: "0x6a761202",
    constraints: [{ param: "value", op: ConstraintOp.Gte, value: "10000000000", type: "uint256" }],
    sigRequirement: { type: SignatureRequirementType.Multisig, threshold: 3, of: 4 },
    timeLock: "24h",
    validity: { start: "2026-01-01", end: null },
    rateLimit: null,
    usedByRoles: 1,
  },
  {
    id: "perm_propose",
    name: "Submit governance proposal",
    target: "0x11aB2c3D4e5F6a7B8c9D0e1F2a3B4c5D6e7F8a9B",
    targetName: "Governor",
    function: "propose(address[],uint256[],bytes[],string)",
    selector: "0x7d5e81e2",
    constraints: [],
    sigRequirement: { type: SignatureRequirementType.Single },
    timeLock: null,
    validity: { start: "2026-01-01", end: null },
    rateLimit: null,
    usedByRoles: 4,
  },
  {
    id: "perm_cancel",
    name: "Cancel proposal",
    target: "0x11aB2c3D4e5F6a7B8c9D0e1F2a3B4c5D6e7F8a9B",
    targetName: "Governor",
    function: "cancel(uint256)",
    selector: "0x40e58ee5",
    constraints: [],
    sigRequirement: { type: SignatureRequirementType.Single },
    timeLock: null,
    validity: { start: "2026-01-01", end: null },
    rateLimit: null,
    usedByRoles: 2,
  },
  {
    id: "perm_payroll",
    name: "Configure payroll batch",
    target: "0x33aB2c3D4e5F6a7B8c9D0e1F2a3B4c5D6e7F8a9C",
    targetName: "Payroll Module",
    function: "configureBatch(bytes32,address[],uint256[])",
    selector: "0x4f8c1a91",
    constraints: [{ param: "totalAmount", op: ConstraintOp.Lte, value: "50000000000", type: "uint256" }],
    sigRequirement: { type: SignatureRequirementType.Multisig, threshold: 2, of: 3 },
    timeLock: null,
    validity: { start: "2026-01-01", end: null },
    rateLimit: { maxCalls: 4, windowSeconds: 86400 },
    usedByRoles: 2,
  },
  {
    id: "perm_mint",
    name: "Mint governance tokens",
    target: "0x7A3Fb9c1d2e0a4c5B8D9f0A1b2C3d4E5F6a7B890",
    targetName: "QRM Token",
    function: "mint(address,uint256)",
    selector: "0x40c10f19",
    constraints: [{ param: "amount", op: ConstraintOp.Lt, value: "500000000000000000000000", type: "uint256" }],
    sigRequirement: { type: SignatureRequirementType.Multisig, threshold: 4, of: 5 },
    timeLock: "48h",
    validity: { start: "2026-01-01", end: "2026-12-31" },
    rateLimit: { maxCalls: 1, windowSeconds: 604800 },
    usedByRoles: 1,
  },
];

export const ROLES_SEED: Role[] = [
  {
    id: "role_manager",
    name: "Manager",
    desc: "Day-to-day operational lead. Configures payroll, manages contractors.",
    accountTypes: [AccountTypeId.Member],
    permissions: ["perm_treasury_small", "perm_payroll", "perm_propose"],
    cap: { maxMembers: 5 },
    isDefault: true,
    isSystemRole: false,
    memberCount: 2,
  },
  {
    id: "role_director",
    name: "Director",
    desc: "Board-level signer. Approves large treasury actions and high-impact proposals.",
    accountTypes: [AccountTypeId.Member],
    permissions: ["perm_treasury_large", "perm_treasury_small", "perm_cancel", "perm_propose"],
    cap: { maxMembers: 7 },
    isDefault: true,
    isSystemRole: false,
    memberCount: 3,
  },
  {
    id: "role_officer",
    name: "Officer",
    desc: "Executive officer with broad operational authority.",
    accountTypes: [AccountTypeId.Member],
    permissions: ["perm_treasury_small", "perm_propose", "perm_payroll"],
    cap: null,
    isDefault: true,
    isSystemRole: false,
    memberCount: 1,
  },
  {
    id: "role_lp",
    name: "LP",
    desc: "Limited partner. Information rights, no operational authority.",
    accountTypes: [AccountTypeId.Investor],
    permissions: [],
    cap: null,
    isDefault: true,
    isSystemRole: false,
    memberCount: 4,
  },
  {
    id: "role_voting",
    name: "Voting Member",
    desc: "Holds voting rights on governance proposals.",
    accountTypes: [AccountTypeId.Member, AccountTypeId.Investor],
    permissions: ["perm_propose"],
    cap: null,
    isDefault: true,
    isSystemRole: false,
    memberCount: 8,
  },
  {
    id: "role_observer",
    name: "Observer",
    desc: "Read-only access. Sees proposals and treasury but cannot vote or sign.",
    accountTypes: [AccountTypeId.Member, AccountTypeId.Investor, AccountTypeId.AuthorizedUser],
    permissions: [],
    cap: null,
    isDefault: true,
    isSystemRole: false,
    memberCount: 2,
  },
  {
    id: "role_treasury_signer",
    name: "Treasury Signer",
    desc: "Co-signs treasury transactions. Custom role created Apr 2026.",
    accountTypes: [AccountTypeId.Member],
    permissions: ["perm_treasury_small", "perm_treasury_large"],
    cap: { maxValue: "$50,000", maxMembers: 4 },
    isDefault: false,
    isSystemRole: false,
    memberCount: 4,
  },
];

export const MEMBERS_SEED: Member[] = [
  {
    id: "mbr_alex", memberId: "mbr_alex", name: "Alex Rivera", initials: "AR", avatarHue: 220,
    email: "alex@quorum.xyz", jurisdiction: "United States · DE",
    accountType: AccountTypeId.Member,
    roles: ["role_director", "role_treasury_signer"],
    wallet: { address: "0x9F2Ab3C4d5E6f7A8b9C0D1e2F3a4B5c6D7e8F9A0", kind: WalletKind.SmartAccount, deployed: true },
    sbt: { status: SbtStatus.Active, tokenId: 17, contract: "0xSBT0…anchor", mintedAt: "Feb 14, 2026" },
    onboardingStatus: OnboardingStatus.Active,
    kyc: { required: true, status: KycStatus.Verified },
    dateAdded: "Feb 14, 2026",
  },
  {
    id: "mbr_priya", memberId: "mbr_priya", name: "Priya Shah", initials: "PS", avatarHue: 320,
    email: "priya@quorum.xyz", jurisdiction: "United Kingdom",
    accountType: AccountTypeId.Member,
    roles: ["role_officer", "role_treasury_signer", "role_voting"],
    wallet: { address: "0x6B1c2D3e4F5a6B7c8D9e0F1a2B3c4D5e6F7a8B90", kind: WalletKind.SmartAccount, deployed: true },
    sbt: { status: SbtStatus.Active, tokenId: 18, contract: "0xSBT0…anchor", mintedAt: "Feb 16, 2026" },
    onboardingStatus: OnboardingStatus.Active,
    kyc: { required: true, status: KycStatus.Verified },
    dateAdded: "Feb 16, 2026",
  },
  {
    id: "mbr_chen", memberId: "mbr_chen", name: "Chen Liu", initials: "CL", avatarHue: 145,
    email: "chen@quorum.xyz", jurisdiction: "Singapore",
    accountType: AccountTypeId.Member,
    roles: ["role_manager", "role_voting"],
    wallet: { address: "0x71E3c4D5e6F7a8B9c0D1e2F3a4B5c6D7e8F9ef02", kind: WalletKind.SmartAccount, deployed: true },
    sbt: { status: SbtStatus.Active, tokenId: 19, contract: "0xSBT0…anchor", mintedAt: "Feb 28, 2026" },
    onboardingStatus: OnboardingStatus.Active,
    kyc: { required: true, status: KycStatus.Verified },
    dateAdded: "Feb 28, 2026",
  },
  {
    id: "mbr_maya", memberId: "mbr_maya", name: "Maya Tanaka", initials: "MT", avatarHue: 30,
    email: "maya@quorum.xyz", jurisdiction: "Japan",
    accountType: AccountTypeId.AuthorizedUser,
    roles: ["role_observer"],
    wallet: { address: "0xAbCDeF0123456789aBcDeF0123456789aBcDeF01", kind: WalletKind.SmartAccount, deployed: true },
    sbt: { status: SbtStatus.Active, tokenId: 22, contract: "0xSBT0…anchor", mintedAt: "Mar 14, 2026" },
    onboardingStatus: OnboardingStatus.Active,
    kyc: { required: false, status: KycStatus.NotRequired },
    dateAdded: "Mar 14, 2026",
  },
  {
    id: "mbr_velta", memberId: "mbr_velta", name: "Velta Capital", initials: "VC", avatarHue: 270,
    email: "ops@velta.capital", jurisdiction: "Cayman Islands",
    accountType: AccountTypeId.Investor,
    roles: ["role_lp"],
    wallet: { address: "0x5566aaBBccDDee66Ff7a8B9c0D1e2F3a4B5c6D7e", kind: WalletKind.Eoa, deployed: true },
    sbt: { status: SbtStatus.Active, tokenId: 24, contract: "0xSBT0…anchor", mintedAt: "Mar 21, 2026" },
    onboardingStatus: OnboardingStatus.Active,
    kyc: { required: true, status: KycStatus.Verified },
    dateAdded: "Mar 21, 2026",
  },
  {
    id: "mbr_octant", memberId: "mbr_octant", name: "Octant Partners", initials: "OP", avatarHue: 195,
    email: "fund@octant.partners", jurisdiction: "Switzerland",
    accountType: AccountTypeId.Investor,
    roles: ["role_lp", "role_voting"],
    wallet: { address: "0x3344aAbBccDDee66Ff7a8B9c0D1e2F3a4B5c6D7e", kind: WalletKind.Eoa, deployed: true },
    sbt: { status: SbtStatus.Active, tokenId: 25, contract: "0xSBT0…anchor", mintedAt: "Apr 02, 2026" },
    onboardingStatus: OnboardingStatus.Active,
    kyc: { required: true, status: KycStatus.Verified },
    dateAdded: "Apr 02, 2026",
  },
  {
    id: "mbr_jordan", memberId: "mbr_jordan", name: "Jordan Hayes", initials: "JH", avatarHue: 12,
    email: "jordan@external.dev", jurisdiction: "Canada",
    accountType: AccountTypeId.AuthorizedUser,
    roles: ["role_observer"],
    wallet: { address: "0x12abCdef34567890aBcDeF1234567890ABCdEf12", kind: WalletKind.SmartAccount, deployed: false },
    sbt: { status: SbtStatus.Pending, tokenId: null, contract: "0xSBT0…anchor", mintedAt: null },
    onboardingStatus: OnboardingStatus.Invited,
    kyc: { required: false, status: KycStatus.NotRequired },
    dateAdded: "Apr 22, 2026",
  },
  {
    id: "mbr_sam", memberId: "mbr_sam", name: "Sam Patel", initials: "SP", avatarHue: 88,
    email: "sam@quorum.xyz", jurisdiction: "Australia",
    accountType: AccountTypeId.Member,
    roles: ["role_voting"],
    wallet: { address: "0x4455ccDDee66Ff7a8B9c0D1e2F3a4B5c6D7e8F9a", kind: WalletKind.SmartAccount, deployed: true },
    sbt: { status: SbtStatus.Active, tokenId: 26, contract: "0xSBT0…anchor", mintedAt: "Apr 18, 2026" },
    onboardingStatus: OnboardingStatus.Active,
    kyc: { required: true, status: KycStatus.Pending },
    dateAdded: "Apr 18, 2026",
  },
  {
    id: "mbr_dana", memberId: "mbr_dana", name: "Dana Cole", initials: "DC", avatarHue: 350,
    email: "dana@former.xyz", jurisdiction: "United States · NY",
    accountType: AccountTypeId.Member,
    roles: [],
    wallet: { address: "0x88aB2c3D4e5F6a7B8c9D0e1F2a3B4c5D6e7F8a9C", kind: WalletKind.SmartAccount, deployed: true },
    sbt: { status: SbtStatus.Revoked, tokenId: 11, contract: "0xSBT0…anchor", mintedAt: "Jan 08, 2026" },
    onboardingStatus: OnboardingStatus.Departed,
    kyc: { required: true, status: KycStatus.Verified },
    dateAdded: "Jan 08, 2026",
  },
  {
    id: "mbr_kai", memberId: "mbr_kai", name: "Kai Nguyen", initials: "KN", avatarHue: 165,
    email: "kai@quorum.xyz", jurisdiction: "Vietnam",
    accountType: AccountTypeId.Member,
    roles: ["role_voting"],
    wallet: { address: "0x77aB2c3D4e5F6a7B8c9D0e1F2a3B4c5D6e7F8ab1", kind: WalletKind.SmartAccount, deployed: true },
    sbt: { status: SbtStatus.Suspended, tokenId: 14, contract: "0xSBT0…anchor", mintedAt: "Feb 02, 2026" },
    onboardingStatus: OnboardingStatus.Suspended,
    kyc: { required: true, status: KycStatus.Verified },
    dateAdded: "Feb 02, 2026",
  },
];

export const MEMBER_ACTIVITY_SEED: Record<string, ActivityEntry[]> = {
  mbr_alex: [
    { when: "May 02, 2026", who: "system",            what: "Voted FOR proposal #47 (250k QRM allocation)", kind: ActivityKind.Vote },
    { when: "Apr 28, 2026", who: "priya@quorum.xyz",  what: "Granted role: Treasury Signer",                kind: ActivityKind.Role },
    { when: "Apr 14, 2026", who: "system",            what: "Co-signed treasury tx 0x91a…2f0c ($8,400)",    kind: ActivityKind.Tx },
    { when: "Feb 14, 2026", who: "system",            what: "SBT #17 minted on Polygon",                    kind: ActivityKind.Sbt },
    { when: "Feb 14, 2026", who: "priya@quorum.xyz",  what: "Member created · sent invite",                 kind: ActivityKind.Create },
  ],
  mbr_priya: [
    { when: "May 03, 2026", who: "system", what: "Submitted proposal #48 (Enable fee switch)",       kind: ActivityKind.Vote },
    { when: "Apr 28, 2026", who: "self",   what: "Granted role to Alex: Treasury Signer",            kind: ActivityKind.Role },
    { when: "Feb 16, 2026", who: "system", what: "SBT #18 minted on Polygon",                        kind: ActivityKind.Sbt },
  ],
};

export function constraintOpLabel(op: ConstraintOp): string {
  switch (op) {
    case ConstraintOp.Eq:  return "==";
    case ConstraintOp.Lt:  return "<";
    case ConstraintOp.Lte: return "≤";
    case ConstraintOp.Gt:  return ">";
    case ConstraintOp.Gte: return "≥";
  }
}

/** Render a constraint value for display. Big numbers are abbreviated. */
export function formatConstraintValue(value: string): string {
  // Long uint values get an abbreviated mantissa hint (e.g. 5e23). The full
  // value lives in the underlying data; this is just for the inline pill.
  if (/^\d{15,}$/.test(value)) {
    const exp = value.length - 1;
    const lead = value[0];
    return `${lead}e${exp}`;
  }
  return value;
}
