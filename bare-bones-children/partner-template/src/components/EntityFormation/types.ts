export interface FormationDao {
  name?: string;
  symbol?: string;
  totalSupply?: string;
  governor?: { name?: string; address?: string };
  timelock?: { address?: string };
  token?: { address?: string };
  /** On-chain governance parameters read off the Governor + Timelock. Used
   *  in the Operating Agreement step to describe the actual voting + delay
   *  config that goes into the filing — defaults to placeholders only when
   *  the chain read hasn't landed yet. */
  governance?: {
    votingDelay?: string;
    votingPeriod?: string;
    quorumRatio?: string;
    timelockMinDelay?: string;
  };
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
  | "organizer"
  | "agent"
  | "agreement"
  | "notice"
  | "documents"
  | "review";

export type ManagementType = "member" | "algo";
export type AgentMode = "service" | "own";
export type AgreementSource = "generate" | "upload";
export type AgreementStorage = "off" | "arweave" | "chain";

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

// ----- Organizer step -----

export interface OrganizerOrg {
  street1: string;
  street2: string;
  city: string;
  region: string;
  postal: string;
  country: string;
  email: string;
  phoneDial: string;
  phoneIso: string;
  phoneNum: string;
}

export interface OrganizerMailing {
  street1: string;
  street2: string;
  city: string;
  region: string;
  postal: string;
  country: string;
}

export type FilerRole = "member" | "manager" | "attorney" | "agent" | "other";

export interface OrganizerFiler {
  first: string;
  last: string;
  role: FilerRole;
  email: string;
  phoneDial: string;
  phoneIso: string;
  phoneNum: string;
}

export interface DialCode {
  iso: string;
  code: string;
  flag: string;
  name: string;
}

// Curated list — the dozen jurisdictions a DAO LLC organizer is most likely
// to live in. Easy to extend; not exhaustive.
export const EF_DIAL_CODES: DialCode[] = [
  { iso: "US", code: "+1", flag: "🇺🇸", name: "United States" },
  { iso: "CA", code: "+1", flag: "🇨🇦", name: "Canada" },
  { iso: "GB", code: "+44", flag: "🇬🇧", name: "United Kingdom" },
  { iso: "DE", code: "+49", flag: "🇩🇪", name: "Germany" },
  { iso: "FR", code: "+33", flag: "🇫🇷", name: "France" },
  { iso: "CH", code: "+41", flag: "🇨🇭", name: "Switzerland" },
  { iso: "SG", code: "+65", flag: "🇸🇬", name: "Singapore" },
  { iso: "AE", code: "+971", flag: "🇦🇪", name: "UAE" },
  { iso: "AU", code: "+61", flag: "🇦🇺", name: "Australia" },
  { iso: "JP", code: "+81", flag: "🇯🇵", name: "Japan" },
  { iso: "BR", code: "+55", flag: "🇧🇷", name: "Brazil" },
  { iso: "PT", code: "+351", flag: "🇵🇹", name: "Portugal" },
];

export const EF_STEPS: FormationStep[] = [
  { id: "eligibility", label: "Eligibility", sub: "On-chain prerequisites" },
  { id: "basics", label: "Entity basics", sub: "Name + management" },
  { id: "organizer", label: "Organizer & contact", sub: "Principal office + filer" },
  { id: "agent", label: "Registered agent", sub: "In-state address" },
  { id: "agreement", label: "Operating agreement", sub: "On + off-chain rules" },
  { id: "notice", label: "Member notice", sub: "Statutory disclosure" },
  { id: "documents", label: "Formation documents", sub: "Download + review" },
  { id: "review", label: "Review & file", sub: "Submit to Wyoming" },
];

export function efHasDesignator(s: string): boolean {
  return /\b(DAO LLC|DAO|LAO)\b/i.test(s || "");
}

export function makeEmptyOrg(): OrganizerOrg {
  return {
    street1: "",
    street2: "",
    city: "",
    region: "",
    postal: "",
    country: "US",
    email: "",
    phoneDial: "+1",
    phoneIso: "US",
    phoneNum: "",
  };
}

export function makeEmptyMailing(): OrganizerMailing {
  return {
    street1: "",
    street2: "",
    city: "",
    region: "",
    postal: "",
    country: "US",
  };
}

export function makeEmptyFiler(): OrganizerFiler {
  return {
    first: "",
    last: "",
    role: "member",
    email: "",
    phoneDial: "+1",
    phoneIso: "US",
    phoneNum: "",
  };
}
