export interface FormationDao {
  name?: string;
  symbol?: string;
  totalSupply?: string;
  governor?: { name?: string; address?: string };
  timelock?: { address?: string };
  token?: { address?: string };
}

export interface FormationChain {
  name?: string;
  chainId?: number;
}

export interface FormationWallet {
  address: string;
}

export interface FormationStep {
  id: StepId;
  label: string;
  sub: string;
}

export type StepId =
  | "eligibility"
  | "basics"
  | "contract"
  | "agent"
  | "agreement"
  | "notice"
  | "review";

export type ManagementType = "member" | "algo";
export type AgentMode = "service" | "own";
export type AgreementSource = "generate" | "upload";
export type AgreementStorage = "off" | "ipfs" | "chain";

export interface AgentCustom {
  name: string;
  street: string;
  city: string;
  zip: string;
}

export interface FormationAgent {
  id: string;
  name: string;
  price: number;
  coverage: string;
  badge: string | null;
}

export const EF_STEPS: FormationStep[] = [
  { id: "eligibility", label: "Eligibility", sub: "On-chain prerequisites" },
  { id: "basics", label: "Entity basics", sub: "Name + management" },
  { id: "contract", label: "Smart contract", sub: "Canonical identifier" },
  { id: "agent", label: "Registered agent", sub: "In-state address" },
  { id: "agreement", label: "Operating agreement", sub: "On + off-chain rules" },
  { id: "notice", label: "Member notice", sub: "Statutory disclosure" },
  { id: "review", label: "Review & file", sub: "Submit to Wyoming" },
];

export const EF_AGENTS: FormationAgent[] = [
  {
    id: "cloudpeak",
    name: "Cloud Peak Law Group",
    price: 49,
    coverage: "Mail forwarding · scan-to-email",
    badge: "recommended",
  },
  {
    id: "northwest",
    name: "Northwest Registered Agent",
    price: 125,
    coverage: "Mail forwarding · privacy address",
    badge: null,
  },
  {
    id: "wytrust",
    name: "Wyoming Trust & LLC",
    price: 59,
    coverage: "Mail forwarding only",
    badge: null,
  },
  {
    id: "rai",
    name: "Registered Agents Inc.",
    price: 200,
    coverage: "Mail forwarding + privacy address service",
    badge: null,
  },
];

export const STUB_GOVERNOR_ADDRESS = "0x7B4f29ae8E1d2F90c4f8B3A6E0D3B25a91A5D921";

export function efHasDesignator(s: string): boolean {
  return /\b(DAO LLC|DAO|LAO)\b/i.test(s || "");
}
