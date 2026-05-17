import { useMemo, useState, useRef } from "react";
import { ethers } from "ethers";
import { Input } from "../BasicComponents";
import { FormField } from "../FormField/FormField";
import { AddressInput } from "../Inputs/AddressInput";
import { Uint256Input } from "../Inputs/Uint256Input";
import { Select, SelectOption } from "../Select";
import { Stack } from "../Primitives";
import { Text } from "../Primitives/Text";
import DAOGovernorABI from "../../abis/dao/DAOGovernor.abi.json";
import ERC20ABI from "../../abis/ERC20.json";
import CaliburEntryABI from "../../abis/diamond/facets/CaliburEntry.abi.json";
import DiamondCutFacetABI from "../../abis/diamond/facets/DiamondCutFacet.abi.json";
import MultiTenantAuthABI from "../../abis/auth/MultiTenantAuth.abi.json";
import {
  AddressBookModal,
  AddrAvatar,
  useAddressBook,
  type AddressBookEntry,
  type AddressKind,
} from "../AddressBook";
import { useDiamondFacets } from "../../hooks/diamond/useDiamondFacets";
import { useWalletProvider } from "../../hooks/useWalletProvider";
import { getBareBonesConfiguration } from "../../constants/misc";
import { shortAddress } from "../../utils/formatUtils";
import { parsePayeeNameLabel } from "../../utils/payroll/payrollFormatters";
import type { ProposalBuildPayload, ProposalCall, ProposalCallArgPreview } from "./types";
import { NativeTransferForm, TokenTransferForm, WalletDeployForm } from "./ProposalForms";
import { MtaArgsRenderer } from "./proposalTemplates/MtaTemplate";
import { GenericArgsRenderer } from "./proposalTemplates/GenericTemplate";

// ============================================================================
// ABIs & Constants — unchanged from the previous builder. The calldata
// encoding logic is the source of truth for on-chain behavior and isn't
// touched by the wizard restructure.
// ============================================================================

const TOKEN_FUNCTIONS_EXTENSION_ABI_OBJECT = [
  {
    type: "function",
    name: "mint",
    inputs: [
      { name: "to", type: "address", internalType: "address" },
      { name: "amount", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "burn",
    inputs: [{ name: "amount", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "delegate",
    inputs: [{ name: "delegatee", type: "address", internalType: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

const ACCESS_CONTROL_ABI_OBJECT = [
  {
    type: "function",
    name: "grantRole",
    inputs: [
      { name: "role", type: "bytes32", internalType: "bytes32" },
      { name: "account", type: "address", internalType: "address" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "revokeRole",
    inputs: [
      { name: "role", type: "bytes32", internalType: "bytes32" },
      { name: "account", type: "address", internalType: "address" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
];

const TIMELOCK_ROLE_ABI_OBJECT = [
  ...ACCESS_CONTROL_ABI_OBJECT,
] as const;

const TOKEN_FUNCTIONS_ABI_OBJECT = [
  ...(ERC20ABI as any[]),
  ...TOKEN_FUNCTIONS_EXTENSION_ABI_OBJECT,
] as any[];
const TOKEN_FUNCTIONS_ABI_TEXT = JSON.stringify(TOKEN_FUNCTIONS_ABI_OBJECT, null, 2);
const CALIBUR_ABI_TEXT = JSON.stringify(CaliburEntryABI, null, 2);
const MTA_ABI_TEXT = JSON.stringify(MultiTenantAuthABI, null, 2);

const TOKEN_FUNCTIONS_INTERFACE = new ethers.utils.Interface(TOKEN_FUNCTIONS_ABI_OBJECT as any);
const GOVERNANCE_INTERFACE = new ethers.utils.Interface(DAOGovernorABI as any);
const CALIBUR_INTERFACE = new ethers.utils.Interface(CaliburEntryABI as any);
const DIAMOND_CUT_INTERFACE = new ethers.utils.Interface(DiamondCutFacetABI as any);
const TIMELOCK_ROLE_INTERFACE = new ethers.utils.Interface(TIMELOCK_ROLE_ABI_OBJECT as any);
const MTA_INTERFACE = new ethers.utils.Interface(MultiTenantAuthABI as any);

const PROPOSER_ROLE_ID = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("PROPOSER_ROLE"));
const CANCELLER_ROLE_ID = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("CANCELLER_ROLE"));
const EXECUTOR_ROLE_ID = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("EXECUTOR_ROLE"));

// ============================================================================
// Preset taxonomy
// ============================================================================

type ProposalActionPreset =
  | "native-transfer"
  | "token-transfer"
  | "token-approve"
  | "token-mint"
  | "token-burn"
  | "token-delegate"
  | "gov-set-voting-delay"
  | "gov-set-voting-period"
  | "gov-set-proposal-threshold"
  | "gov-update-quorum-numerator"
  | "gov-update-timelock"
  | "gov-add-proposer"
  | "gov-add-canceller"
  | "gov-add-executor"
  | "gov-remove-proposer"
  | "gov-remove-canceller"
  | "gov-remove-executor"
  | "wallet-update-entry-point"
  | "wallet-set-execution-authority-resolver"
  | "wallet-invalidate-nonce"
  | "wallet-diamond-cut"
  | "wallet-calibur-entry"
  | "wallet-deploy"
  | "auth-mta-function"
  | "auth-execute-mint"
  | "custom";

interface PresetMeta {
  label: string;
  description: string;
}

const PRESET_META: Record<ProposalActionPreset, PresetMeta> = {
  "native-transfer": { label: "Native Transfer", description: "Send native ETH/MATIC to the target." },
  "token-transfer": { label: "ERC20 Transfer", description: "Move ERC20 tokens to a recipient." },
  "token-approve": { label: "ERC20 Approve", description: "Authorize a spender to move tokens." },
  "token-mint": { label: "Mint", description: "Mint new governance tokens (if owner)." },
  "token-burn": { label: "Burn", description: "Burn governance tokens from the caller." },
  "token-delegate": { label: "Delegate Votes", description: "Delegate voting power to another address." },
  "gov-set-voting-delay": { label: "Set Voting Delay", description: "Blocks between propose and vote-open." },
  "gov-set-voting-period": { label: "Set Voting Period", description: "Blocks the vote stays open." },
  "gov-set-proposal-threshold": { label: "Set Proposal Threshold", description: "Min token balance to propose." },
  "gov-update-quorum-numerator": { label: "Update Quorum Numerator", description: "Quorum as % of total supply." },
  "gov-update-timelock": { label: "Update Timelock", description: "Point the governor at a new timelock." },
  "gov-add-proposer": { label: "Add Proposer", description: "Grant PROPOSER_ROLE on the timelock." },
  "gov-add-canceller": { label: "Add Canceller", description: "Grant CANCELLER_ROLE on the timelock." },
  "gov-add-executor": { label: "Add Executor", description: "Grant EXECUTOR_ROLE on the timelock." },
  "gov-remove-proposer": { label: "Remove Proposer", description: "Revoke PROPOSER_ROLE on the timelock." },
  "gov-remove-canceller": { label: "Remove Canceller", description: "Revoke CANCELLER_ROLE on the timelock." },
  "gov-remove-executor": { label: "Remove Executor", description: "Revoke EXECUTOR_ROLE on the timelock." },
  "wallet-update-entry-point": { label: "Update Entry Point", description: "Repoint to a new 4337 entry point." },
  "wallet-set-execution-authority-resolver": { label: "Set Authority Resolver", description: "Change which resolver authorizes execution." },
  "wallet-invalidate-nonce": { label: "Invalidate Nonce", description: "Bump the wallet's session nonce." },
  "wallet-diamond-cut": { label: "Diamond Cut", description: "Add / replace / remove a facet." },
  "wallet-calibur-entry": { label: "Calibur Entry Function", description: "Invoke any Calibur entry-point function." },
  "wallet-deploy": { label: "Deploy Smart Wallet", description: "Use the factory to deploy a new Diamond wallet." },
  "auth-mta-function": { label: "Authorizer (MTA) Function", description: "Invoke a Multi-Tenant Authorizer function." },
  "auth-execute-mint": { label: "Execute · Mint Token", description: "Mint via auth.execute → token.mint (owner-gated)." },
  custom: { label: "Custom ABI Function", description: "Paste an ABI and invoke any function." },
};

/**
 * Which presets are valid for a given address kind. Drives the function picker
 * on wizard step 3. Order matters — first entry is the default selection.
 */
const PRESETS_BY_KIND: Record<AddressKind, ProposalActionPreset[]> = {
  governor: [
    "gov-set-voting-delay",
    "gov-set-voting-period",
    "gov-set-proposal-threshold",
    "gov-update-quorum-numerator",
    "gov-update-timelock",
  ],
  timelock: [
    "gov-add-proposer",
    "gov-add-canceller",
    "gov-add-executor",
    "gov-remove-proposer",
    "gov-remove-canceller",
    "gov-remove-executor",
  ],
  token: [
    "token-transfer",
    "token-approve",
    "token-mint",
    "token-burn",
    "token-delegate",
  ],
  erc20: ["token-transfer", "token-approve"],
  wallet: [
    "wallet-calibur-entry",
    "wallet-update-entry-point",
    "wallet-set-execution-authority-resolver",
    "wallet-invalidate-nonce",
    "wallet-diamond-cut",
    "native-transfer",
  ],
  vault: ["custom"],
  factory: ["wallet-deploy"],
  mta: ["auth-execute-mint", "auth-mta-function"],
  "authority-resolver": ["custom"],
  "kernel-initializer": ["custom"],
  config: ["custom"],
  eoa: ["native-transfer"],
  custom: ["custom"],
};

const GOVERNANCE_ROLE_CONFIG: Partial<
  Record<
    ProposalActionPreset,
    { label: string; roleId: string; method: "grantRole" | "revokeRole" }
  >
> = {
  "gov-add-proposer": { label: "Add Proposer", roleId: PROPOSER_ROLE_ID, method: "grantRole" },
  "gov-add-canceller": { label: "Add Canceller", roleId: CANCELLER_ROLE_ID, method: "grantRole" },
  "gov-add-executor": { label: "Add Executor", roleId: EXECUTOR_ROLE_ID, method: "grantRole" },
  "gov-remove-proposer": { label: "Remove Proposer", roleId: PROPOSER_ROLE_ID, method: "revokeRole" },
  "gov-remove-canceller": { label: "Remove Canceller", roleId: CANCELLER_ROLE_ID, method: "revokeRole" },
  "gov-remove-executor": { label: "Remove Executor", roleId: EXECUTOR_ROLE_ID, method: "revokeRole" },
};

// ============================================================================
// Helpers — ABI parsing & calldata building (unchanged in behavior)
// ============================================================================

function normalizeAbiCandidate(input: unknown): any[] {
  if (Array.isArray(input)) return input;
  if (input && typeof input === "object" && Array.isArray((input as any).abi)) {
    return (input as any).abi;
  }
  throw new Error("ABI must be a JSON array or an object with an abi array.");
}

function normalizeScalar(type: string, value: unknown): unknown {
  if (typeof value !== "string") return value;
  const v = value.trim();
  if (type === "address") return v === "" ? v : ethers.utils.getAddress(v);
  if (type === "bool") {
    const n = v.toLowerCase();
    if (n === "true" || n === "1") return true;
    if (n === "false" || n === "0") return false;
    return value;
  }
  if (type.startsWith("uint") || type.startsWith("int")) {
    return v === "" ? v : ethers.BigNumber.from(v);
  }
  if (type === "bytes32") {
    if (ethers.utils.isHexString(v, 32)) return v;
    if (v.length <= 31) return ethers.utils.formatBytes32String(v);
    throw new Error("bytes32 value too long.");
  }
  if (type === "bytes") {
    if (ethers.utils.isHexString(v)) return v;
    return ethers.utils.toUtf8Bytes(v);
  }
  if (type.startsWith("bytes") && type !== "bytes") {
    if (!ethers.utils.isHexString(v)) throw new Error("Bytes value must be hex.");
    return v;
  }
  return value;
}

function normalizeRecursive(value: unknown, param: ethers.utils.ParamType): unknown {
  if (param.type === "tuple" && param.components) {
    const out: Record<string, unknown> = {};
    const v = (value as Record<string, unknown>) ?? {};
    for (let i = 0; i < param.components.length; i++) {
      const c = param.components[i];
      const key = c.name || `field_${i}`;
      out[key] = normalizeRecursive(v[key], c);
    }
    return out;
  }
  if (param.type === "tuple[]" && param.components) {
    if (!Array.isArray(value)) return [];
    const elemParam = ethers.utils.ParamType.from({
      type: "tuple",
      components: param.components.map((c) => ({
        name: c.name,
        type: c.type,
        components: c.components,
        internalType: (c as any).internalType,
      })),
    });
    return value.map((v) => normalizeRecursive(v, elemParam));
  }
  if (param.type.endsWith("[]")) {
    if (!Array.isArray(value)) return [];
    const elementType = param.type.slice(0, -2);
    return value.map((v) => normalizeScalar(elementType, v));
  }
  return normalizeScalar(param.type, value);
}

function parseParam(param: ethers.utils.ParamType, value: string) {
  const type = param.type;
  if (type === "tuple" || type === "tuple[]" || type.endsWith("[]")) {
    const parsed = JSON.parse(value || (type === "tuple" ? "{}" : "[]"));
    return normalizeRecursive(parsed, param);
  }
  return normalizeScalar(type, value);
}

function previewValue(value: unknown, param: ethers.utils.ParamType): string {
  if (value == null) return "—";
  if (param.type === "tuple[]" && param.components) {
    const arr = Array.isArray(value) ? value : [];
    if (arr.length === 0) return "[]";
    const first = arr[0];
    const firstField = param.components[0];
    const peek = firstField ? previewValue(first?.[firstField.name ?? ""], firstField) : "";
    return `${arr.length}× {${peek}${arr.length > 1 ? ", …" : ""}}`;
  }
  if (param.type === "tuple" && param.components) {
    const peeks = param.components.slice(0, 2).map((c) => {
      const k = c.name || "";
      return previewValue((value as any)?.[k], c);
    });
    return `{${peeks.join(", ")}${param.components.length > 2 ? ", …" : ""}}`;
  }
  if (param.type.endsWith("[]")) {
    const arr = Array.isArray(value) ? value : [];
    if (arr.length === 0) return "[]";
    const elementType = param.type.slice(0, -2);
    const fakeParam = ethers.utils.ParamType.from(elementType);
    const peek = previewValue(arr[0], fakeParam);
    return arr.length === 1 ? `[${peek}]` : `[${peek}, …${arr.length - 1}]`;
  }
  if (param.type === "bytes32") {
    const s = typeof value === "string" ? value : String(value);
    if (ethers.utils.isHexString(s, 32)) {
      try {
        const decoded = ethers.utils.parseBytes32String(s);
        if (decoded) return decoded;
      } catch { /* not utf-8 */ }
      return `${s.slice(0, 6)}…${s.slice(-4)}`;
    }
    return s;
  }
  if (param.type === "address") {
    const s = typeof value === "string" ? value : String(value);
    return s.length >= 10 ? `${s.slice(0, 6)}…${s.slice(-4)}` : s;
  }
  if (param.type === "bool") return value ? "true" : "false";
  if (param.type.startsWith("uint") || param.type.startsWith("int")) {
    if (ethers.BigNumber.isBigNumber(value)) return value.toString();
    return String(value);
  }
  const s = typeof value === "string" ? value : JSON.stringify(value);
  return s.length > 18 ? `${s.slice(0, 12)}…` : s;
}

function buildArgsPreview(
  inputs: ReadonlyArray<ethers.utils.ParamType>,
  argValues: unknown[]
): ProposalCallArgPreview[] {
  return inputs.map((input, i) => ({
    name: input.name || `arg${i}`,
    display: previewValue(argValues[i], input),
  }));
}

// ============================================================================
// Templates — one-click pre-fills. Each sets target+kind+preset+description,
// then jumps the user to step 3 with the form rendered & pre-filled for
// review. Mirrors the "Deploy Wallet" pattern from the previous builder.
// ============================================================================

interface TemplateDef {
  id: string;
  title: string;
  description: string;
  icon: string;
  /** Resolves the template against current DAO/chain context. Returns null
   *  when the template can't apply (e.g. no governance token wired). */
  resolve: (ctx: TemplateContext) => TemplateResolution | null;
}

interface TemplateContext {
  governorAddress: string;
  timelockAddress: string;
  tokenAddress: string;
  mtaAddress: string;
  factoryAddress: string;
}

interface TemplateResolution {
  preset: ProposalActionPreset;
  target: string;
  targetKind: AddressKind;
  targetLabel: string;
  description: string;
}

const TEMPLATES: TemplateDef[] = [
  {
    id: "tpl-deploy-wallet",
    title: "Deploy smart wallet",
    description: "Use the Diamond Factory to deploy a fresh smart wallet.",
    icon: "✦",
    resolve: ({ factoryAddress }) =>
      factoryAddress
        ? {
            preset: "wallet-deploy",
            target: factoryAddress,
            targetKind: "factory",
            targetLabel: "Diamond Factory",
            description: "Deploy a new smart wallet",
          }
        : null,
  },
  {
    id: "tpl-treasury-grant",
    title: "Treasury transfer",
    description: "Move governance tokens from the treasury to a recipient.",
    icon: "💰",
    resolve: ({ tokenAddress }) =>
      tokenAddress
        ? {
            preset: "token-transfer",
            target: tokenAddress,
            targetKind: "token",
            targetLabel: "Governance token",
            description: "Transfer governance tokens from the treasury",
          }
        : null,
  },
  {
    id: "tpl-mint",
    title: "Mint governance tokens",
    description: "Mint new governance tokens to a contributor.",
    icon: "🪙",
    // Routed through MTA's execute() because the token's mint() is onlyOwner
    // and the owner is the MTA. The MTA gates the inner call on
    // TOKEN_MINTER_ROLE (seeded at bootstrap) and re-issues as the owner so
    // Ownable passes. A direct mint() call from the timelock reverts with
    // OwnableUnauthorizedAccount(timelock).
    resolve: ({ tokenAddress, mtaAddress }) =>
      tokenAddress && mtaAddress
        ? {
            preset: "auth-execute-mint",
            target: mtaAddress,
            targetKind: "mta",
            targetLabel: "Multi-Tenant Authorizer",
            description: "Mint governance tokens to a contributor",
          }
        : null,
  },
  {
    id: "tpl-voting-delay",
    title: "Tune voting delay",
    description: "Change how many blocks between propose and vote-open.",
    icon: "⚙",
    resolve: ({ governorAddress }) =>
      governorAddress
        ? {
            preset: "gov-set-voting-delay",
            target: governorAddress,
            targetKind: "governor",
            targetLabel: "Governor",
            description: "Tune voting delay",
          }
        : null,
  },
  {
    id: "tpl-grant-canceller",
    title: "Grant Canceller role",
    description: "Allow an account to cancel queued timelock actions.",
    icon: "🔑",
    resolve: ({ timelockAddress }) =>
      timelockAddress
        ? {
            preset: "gov-add-canceller",
            target: timelockAddress,
            targetKind: "timelock",
            targetLabel: "Timelock",
            description: "Grant CANCELLER role on the timelock",
          }
        : null,
  },
  {
    id: "tpl-authorizer-call",
    title: "Authorizer (MTA) call",
    description: "Grant / revoke tenant roles in the Multi-Tenant Authorizer.",
    icon: "🛡",
    resolve: ({ mtaAddress }) =>
      mtaAddress && mtaAddress !== ethers.constants.AddressZero
        ? {
            preset: "auth-mta-function",
            target: mtaAddress,
            targetKind: "mta",
            targetLabel: "Multi-Tenant Authorizer",
            description: "Authorizer (MTA) call",
          }
        : null,
  },
];

// ============================================================================
// Wizard step nav
// ============================================================================

type StepId = "method" | "source" | "function" | "review";

const WIZARD_STEPS: Array<{ id: StepId; label: string }> = [
  { id: "method", label: "Method" },
  { id: "source", label: "Source" },
  { id: "function", label: "Function" },
  { id: "review", label: "Review" },
];

function StepNav({
  stepId,
  onJump,
  canJumpReview,
  canJumpFunction,
}: {
  stepId: StepId;
  onJump: (id: StepId) => void;
  canJumpReview: boolean;
  canJumpFunction: boolean;
}) {
  const idx = WIZARD_STEPS.findIndex((s) => s.id === stepId);
  return (
    <div className="bb-pw-steps" role="tablist">
      {WIZARD_STEPS.map((s, i) => {
        const isActive = s.id === stepId;
        const isDone = i < idx;
        const reachable =
          i <= idx ||
          (s.id === "review" && canJumpReview) ||
          (s.id === "function" && canJumpFunction);
        return (
          <span key={s.id} style={{ display: "inline-flex", alignItems: "center" }}>
            <button
              type="button"
              className={`bb-pw-step${isActive ? " bb-active" : ""}${isDone ? " bb-done" : ""}`}
              disabled={!reachable}
              onClick={() => reachable && onJump(s.id)}
              data-testid={`proposal-step-${s.id}`}
            >
              <span className="bb-pw-step-num">
                {isDone ? "✓" : String(i + 1).padStart(2, "0")}
              </span>
              {s.label}
            </button>
            {i < WIZARD_STEPS.length - 1 && (
              <span className={`bb-pw-step-sep${isDone ? " bb-done" : ""}`} />
            )}
          </span>
        );
      })}
    </div>
  );
}

// ============================================================================
// Main wizard
// ============================================================================

type Props = {
  disabled?: boolean;
  loading?: boolean;
  governorAddress?: string;
  /** Current DAO's org slug (bytes32). Auto-fills `slug` params on MTA calls. */
  orgSlug?: string;
  onSubmit: (payload: ProposalBuildPayload) => Promise<void> | void;
};

export function ProposalBuilder({
  disabled = false,
  loading = false,
  governorAddress = "",
  orgSlug = "",
  onSubmit,
}: Props) {
  const { chainId, provider } = useWalletProvider();
  const mtaAddress = useMemo(
    () => (chainId == null ? "" : getBareBonesConfiguration(chainId).multiTenantAuthAddress),
    [chainId]
  );
  const factoryAddress = useMemo(
    () => (chainId == null ? "" : getBareBonesConfiguration(chainId).diamondFactoryAddress),
    [chainId]
  );

  const {
    entries: bookEntries,
    loadingTimelockWallets,
    loadingVaults,
    configAddresses,
    daoAddresses,
    contactsStore,
  } = useAddressBook({ governorAddress });

  // ── Wizard state ─────────────────────────────────────────────────────────
  const [step, setStep] = useState<StepId>("method");
  const [method, setMethod] = useState<"template" | "address" | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  /** When opened from a per-field picker (wallet-deploy authorizer/initializer),
   *  selections route to the form ref instead of becoming the wizard target. */
  const [configPickerField, setConfigPickerField] = useState<
    "wallet-authorizer" | "wallet-initializer" | null
  >(null);

  // ── Call composition ────────────────────────────────────────────────────
  const [target, setTarget] = useState("");
  const [targetMeta, setTargetMeta] = useState<{ name: string; kind: AddressKind } | null>(null);
  const [actionPreset, setActionPreset] = useState<ProposalActionPreset | null>(null);

  // ── Proposal-wide state ─────────────────────────────────────────────────
  const [description, setDescription] = useState("");
  const [stagedCalls, setStagedCalls] = useState<ProposalCall[]>([]);
  const [error, setError] = useState<string | null>(null);

  // ── Per-preset legacy form state (unchanged semantics, just lifted here) ─
  const [governanceUintValue, setGovernanceUintValue] = useState("");
  const [governanceAddressValue, setGovernanceAddressValue] = useState("");
  const [roleAccountAddress, setRoleAccountAddress] = useState("");
  const [walletAddressValue, setWalletAddressValue] = useState("");
  const [walletNonceValue, setWalletNonceValue] = useState("");
  const [diamondFacetAddress, setDiamondFacetAddress] = useState("");
  const [diamondSelector, setDiamondSelector] = useState("");
  const [diamondCutAction, setDiamondCutAction] = useState("0");
  const [diamondInitAddress, setDiamondInitAddress] = useState("");
  const [diamondInitCalldata, setDiamondInitCalldata] = useState("");
  const [abiText, setAbiText] = useState("[]");
  const [selectedFunctionSignature, setSelectedFunctionSignature] = useState("");
  const [valuesByParam, setValuesByParam] = useState<Record<string, string>>({});

  // Form component refs (preserve the previous ref-imperative API contracts)
  const nativeTransferFormRef = useRef<any>(null);
  const tokenTransferFormRef = useRef<any>(null);
  const walletDeployFormRef = useRef<any>(null);

  const { facets: installedFacets, loading: loadingFacets } = useDiamondFacets(
    provider,
    actionPreset === "wallet-diamond-cut" ? target : null
  );

  // Function presets available for the current target kind.
  const presetsForKind = useMemo<ProposalActionPreset[]>(() => {
    if (!targetMeta) return [];
    return PRESETS_BY_KIND[targetMeta.kind] ?? ["custom"];
  }, [targetMeta]);

  // ABI / function picker (only for ABI-driven presets).
  const { iface, functions } = useMemo(() => {
    try {
      const parsed = normalizeAbiCandidate(JSON.parse(abiText));
      const nextIface = new ethers.utils.Interface(parsed as any);
      const nextFunctions = Object.keys(nextIface.functions)
        .map((signature) => nextIface.getFunction(signature))
        .filter(
          (fragment) =>
            fragment.constant !== true &&
            fragment.stateMutability !== "view" &&
            fragment.stateMutability !== "pure"
        );
      return { iface: nextIface, functions: nextFunctions };
    } catch {
      return {
        iface: null as ethers.utils.Interface | null,
        functions: [] as ethers.utils.FunctionFragment[],
      };
    }
  }, [abiText]);

  const selectedFunction = useMemo(() => {
    if (!iface || !selectedFunctionSignature) return null;
    try {
      return iface.getFunction(selectedFunctionSignature);
    } catch {
      return null;
    }
  }, [iface, selectedFunctionSignature]);

  // ── Preset application (sets ABI + clears per-preset state) ─────────────
  function applyPreset(preset: ProposalActionPreset) {
    setActionPreset(preset);
    setValuesByParam({});
    setError(null);

    // Pre-fill the description when blank so users (and the e2e test) don't
    // have to type one explicitly for simple single-call proposals. They can
    // still edit it on the review step.
    if (!description.trim()) {
      setDescription(PRESET_META[preset].label);
    }

    if (preset === "custom") {
      setAbiText("[]");
      setSelectedFunctionSignature("");
      return;
    }

    if (["token-transfer", "token-approve", "token-mint", "token-burn", "token-delegate"].includes(preset)) {
      setAbiText(TOKEN_FUNCTIONS_ABI_TEXT);
      setSelectedFunctionSignature("");
    }
    if (preset === "wallet-calibur-entry") {
      setAbiText(CALIBUR_ABI_TEXT);
      setSelectedFunctionSignature("");
    }
    if (preset === "auth-mta-function" || preset === "auth-execute-mint") {
      setAbiText(MTA_ABI_TEXT);
      setSelectedFunctionSignature("");
    }
  }

  // ── Step transitions ────────────────────────────────────────────────────
  function resetWizardForNextCall() {
    setStep("method");
    setMethod(null);
    setTarget("");
    setTargetMeta(null);
    setActionPreset(null);
    setSelectedFunctionSignature("");
    setValuesByParam({});
    setGovernanceUintValue("");
    setGovernanceAddressValue("");
    setRoleAccountAddress("");
    setWalletAddressValue("");
    setWalletNonceValue("");
    setDiamondFacetAddress("");
    setDiamondSelector("");
    setDiamondInitAddress("");
    setDiamondInitCalldata("");
    setError(null);
    nativeTransferFormRef.current?.reset?.();
    tokenTransferFormRef.current?.reset?.();
    walletDeployFormRef.current?.reset?.();
  }

  function fullReset() {
    resetWizardForNextCall();
    setDescription("");
    setStagedCalls([]);
  }

  function pickMethod(m: "template" | "address") {
    setMethod(m);
    setStep("source");
    if (m === "address") setPickerOpen(true);
  }

  function applyTemplate(t: TemplateDef) {
    const ctx: TemplateContext = {
      governorAddress: daoAddresses.governor,
      timelockAddress: daoAddresses.timelock,
      tokenAddress: daoAddresses.token,
      mtaAddress,
      factoryAddress,
    };
    const resolved = t.resolve(ctx);
    if (!resolved) {
      setError(`"${t.title}" can't be used yet — the required DAO contract isn't available.`);
      return;
    }
    setError(null);
    setTarget(resolved.target);
    setTargetMeta({ name: resolved.targetLabel, kind: resolved.targetKind });
    // Always overwrite — switching templates without resetting the
    // description leaves stale text from the previously-clicked template
    // (e.g. picking Treasury Transfer then switching to Mint kept the
    // "Transfer governance tokens…" copy).
    setDescription(resolved.description);
    applyPreset(resolved.preset);
    setStep("function");
  }

  function handlePickAddress(entry: AddressBookEntry) {
    // The wallet-deploy form opens this modal too (for picking authorizer/initializer);
    // route the selection to the form via its ref instead of becoming the wizard target.
    if (configPickerField === "wallet-authorizer") {
      walletDeployFormRef.current?.setAuthorizerAddress?.(entry.address, entry.name);
      setConfigPickerField(null);
      setPickerOpen(false);
      return;
    }
    if (configPickerField === "wallet-initializer") {
      walletDeployFormRef.current?.setInitializerAddress?.(entry.address, entry.name);
      setConfigPickerField(null);
      setPickerOpen(false);
      return;
    }

    setTarget(entry.address);
    setTargetMeta({ name: entry.name, kind: entry.kind });
    setPickerOpen(false);
    // Auto-select the default preset for this kind so step 3 lands on a usable form.
    const defaultPreset = (PRESETS_BY_KIND[entry.kind] ?? ["custom"])[0];
    applyPreset(defaultPreset);
    setStep("function");
  }

  function goPrev() {
    if (step === "source") {
      setStep("method");
      setMethod(null);
      return;
    }
    if (step === "function") {
      setStep("source");
      if (method === "address") setPickerOpen(true);
      return;
    }
    if (step === "review") {
      // From review → back to function step to tweak the current call (if any).
      if (targetMeta) {
        setStep("function");
        return;
      }
      resetWizardForNextCall();
    }
  }

  function jumpStep(id: StepId) {
    if (id === "review" && stagedCalls.length === 0) return;
    if (id === "function" && !targetMeta) return;
    setStep(id);
  }

  // ── Open the address book pre-filtered, for per-field pickers (wallet-deploy) ─
  function openConfigPicker(field: "wallet-authorizer" | "wallet-initializer") {
    setConfigPickerField(field);
    setPickerOpen(true);
  }

  // ── Build the encoded call from the active form ─────────────────────────
  function buildCallFromForm(): ProposalCall {
    if (!target.trim()) throw new Error("Target contract address is required.");
    if (!actionPreset) throw new Error("Pick an action first.");

    const encodedTarget = ethers.utils.getAddress(target.trim());

    if (actionPreset === "native-transfer" && nativeTransferFormRef.current) {
      return nativeTransferFormRef.current.buildCall();
    }
    if (actionPreset === "token-transfer" && tokenTransferFormRef.current) {
      return tokenTransferFormRef.current.buildCall();
    }
    if (actionPreset === "wallet-deploy" && walletDeployFormRef.current) {
      return walletDeployFormRef.current.buildCall();
    }

    if (actionPreset === "token-approve") {
      if (!governanceAddressValue.trim()) throw new Error("Spender address is required.");
      if (!governanceUintValue.trim()) throw new Error("Amount is required.");
      const calldata = TOKEN_FUNCTIONS_INTERFACE.encodeFunctionData("approve", [
        ethers.utils.getAddress(governanceAddressValue.trim()),
        ethers.BigNumber.from(governanceUintValue.trim()),
      ]);
      return { target: encodedTarget, calldata, functionSignature: "approve(address,uint256)", valueWei: "0" };
    }

    if (actionPreset === "token-mint") {
      if (!roleAccountAddress.trim()) throw new Error("Mint recipient address is required.");
      if (!governanceUintValue.trim()) throw new Error("Amount is required.");
      const calldata = TOKEN_FUNCTIONS_INTERFACE.encodeFunctionData("mint", [
        ethers.utils.getAddress(roleAccountAddress.trim()),
        ethers.BigNumber.from(governanceUintValue.trim()),
      ]);
      return { target: encodedTarget, calldata, functionSignature: "mint(address,uint256)", valueWei: "0" };
    }

    if (actionPreset === "auth-execute-mint") {
      if (!roleAccountAddress.trim()) throw new Error("Mint recipient address is required.");
      if (!governanceUintValue.trim()) throw new Error("Amount is required.");
      if (!daoAddresses.token) throw new Error("Governance token address unavailable for this DAO.");
      if (!orgSlug) throw new Error("Org slug unavailable — required to route through MTA.");
      // Inner call: token.mint(to, amount). Outer wraps with MTA.execute so
      // the MTA (the token's owner) re-issues the call and Ownable passes.
      const innerCalldata = TOKEN_FUNCTIONS_INTERFACE.encodeFunctionData("mint", [
        ethers.utils.getAddress(roleAccountAddress.trim()),
        ethers.BigNumber.from(governanceUintValue.trim()),
      ]);
      const outerCalldata = MTA_INTERFACE.encodeFunctionData("execute", [
        orgSlug,
        ethers.utils.getAddress(daoAddresses.token),
        innerCalldata,
        "0x",
      ]);
      return {
        target: encodedTarget,
        calldata: outerCalldata,
        functionSignature: "execute(bytes32,address,bytes,bytes)",
        valueWei: "0",
      };
    }

    if (actionPreset === "token-burn") {
      if (!governanceUintValue.trim()) throw new Error("Amount is required.");
      const calldata = TOKEN_FUNCTIONS_INTERFACE.encodeFunctionData("burn", [
        ethers.BigNumber.from(governanceUintValue.trim()),
      ]);
      return { target: encodedTarget, calldata, functionSignature: "burn(uint256)", valueWei: "0" };
    }

    if (actionPreset === "token-delegate") {
      if (!roleAccountAddress.trim()) throw new Error("Delegatee address is required.");
      const calldata = TOKEN_FUNCTIONS_INTERFACE.encodeFunctionData("delegate", [
        ethers.utils.getAddress(roleAccountAddress.trim()),
      ]);
      return { target: encodedTarget, calldata, functionSignature: "delegate(address)", valueWei: "0" };
    }

    if (actionPreset === "gov-set-voting-delay") {
      if (!governanceUintValue.trim()) throw new Error("Voting delay value is required.");
      const calldata = GOVERNANCE_INTERFACE.encodeFunctionData("setVotingDelay", [
        ethers.BigNumber.from(governanceUintValue.trim()),
      ]);
      return { target: encodedTarget, calldata, functionSignature: "setVotingDelay(uint48)", valueWei: "0" };
    }

    if (actionPreset === "gov-set-voting-period") {
      if (!governanceUintValue.trim()) throw new Error("Voting period value is required.");
      const calldata = GOVERNANCE_INTERFACE.encodeFunctionData("setVotingPeriod", [
        ethers.BigNumber.from(governanceUintValue.trim()),
      ]);
      return { target: encodedTarget, calldata, functionSignature: "setVotingPeriod(uint32)", valueWei: "0" };
    }

    if (actionPreset === "gov-set-proposal-threshold") {
      if (!governanceUintValue.trim()) throw new Error("Proposal threshold value is required.");
      const calldata = GOVERNANCE_INTERFACE.encodeFunctionData("setProposalThreshold", [
        ethers.BigNumber.from(governanceUintValue.trim()),
      ]);
      return { target: encodedTarget, calldata, functionSignature: "setProposalThreshold(uint256)", valueWei: "0" };
    }

    if (actionPreset === "gov-update-quorum-numerator") {
      if (!governanceUintValue.trim()) throw new Error("Quorum numerator value is required.");
      const calldata = GOVERNANCE_INTERFACE.encodeFunctionData("updateQuorumNumerator", [
        ethers.BigNumber.from(governanceUintValue.trim()),
      ]);
      return { target: encodedTarget, calldata, functionSignature: "updateQuorumNumerator(uint256)", valueWei: "0" };
    }

    if (actionPreset === "gov-update-timelock") {
      if (!governanceAddressValue.trim()) throw new Error("New timelock address is required.");
      const calldata = GOVERNANCE_INTERFACE.encodeFunctionData("updateTimelock", [
        ethers.utils.getAddress(governanceAddressValue.trim()),
      ]);
      return { target: encodedTarget, calldata, functionSignature: "updateTimelock(address)", valueWei: "0" };
    }

    const roleConfig = GOVERNANCE_ROLE_CONFIG[actionPreset];
    if (roleConfig) {
      if (!roleAccountAddress.trim()) throw new Error("Role account is required.");
      const calldata = TIMELOCK_ROLE_INTERFACE.encodeFunctionData(roleConfig.method, [
        roleConfig.roleId,
        ethers.utils.getAddress(roleAccountAddress.trim()),
      ]);
      return {
        target: encodedTarget,
        calldata,
        functionSignature: `${roleConfig.method}(bytes32,address)`,
        valueWei: "0",
      };
    }

    if (actionPreset === "wallet-update-entry-point") {
      if (!walletAddressValue.trim()) throw new Error("Entry point address is required.");
      const calldata = CALIBUR_INTERFACE.encodeFunctionData("updateEntryPoint", [
        ethers.utils.getAddress(walletAddressValue.trim()),
      ]);
      return { target: encodedTarget, calldata, functionSignature: "updateEntryPoint(address)", valueWei: "0" };
    }

    if (actionPreset === "wallet-set-execution-authority-resolver") {
      if (!walletAddressValue.trim()) throw new Error("Authority resolver address is required.");
      const calldata = CALIBUR_INTERFACE.encodeFunctionData("setExecutionAuthorityResolver", [
        ethers.utils.getAddress(walletAddressValue.trim()),
      ]);
      return {
        target: encodedTarget,
        calldata,
        functionSignature: "setExecutionAuthorityResolver(address)",
        valueWei: "0",
      };
    }

    if (actionPreset === "wallet-invalidate-nonce") {
      if (!walletNonceValue.trim()) throw new Error("New nonce is required.");
      const calldata = CALIBUR_INTERFACE.encodeFunctionData("invalidateNonce", [
        ethers.BigNumber.from(walletNonceValue.trim()),
      ]);
      return { target: encodedTarget, calldata, functionSignature: "invalidateNonce(uint256)", valueWei: "0" };
    }

    if (actionPreset === "wallet-diamond-cut") {
      if (!diamondFacetAddress.trim()) throw new Error("Facet address is required.");
      if (!diamondSelector.trim()) throw new Error("Function selector is required.");
      if (!ethers.utils.isHexString(diamondSelector.trim(), 4)) {
        throw new Error("Function selector must be a valid bytes4 hex value (e.g. 0xabcdef01).");
      }
      const initAddress = diamondInitAddress.trim()
        ? ethers.utils.getAddress(diamondInitAddress.trim())
        : ethers.constants.AddressZero;
      const initCalldata = diamondInitCalldata.trim() || "0x";
      if (!ethers.utils.isHexString(initCalldata)) {
        throw new Error("Init calldata must be a valid hex string.");
      }
      const calldata = DIAMOND_CUT_INTERFACE.encodeFunctionData("diamondCut", [
        [
          {
            facetAddress: ethers.utils.getAddress(diamondFacetAddress.trim()),
            action: Number(diamondCutAction),
            functionSelectors: [diamondSelector.trim() as `0x${string}`],
          },
        ],
        initAddress,
        initCalldata,
      ]);
      return {
        target: encodedTarget,
        calldata,
        functionSignature: "diamondCut((address,uint8,bytes4[])[],address,bytes)",
        valueWei: "0",
      };
    }

    // ABI-driven presets (custom, wallet-calibur-entry, auth-mta-function)
    if (!iface) throw new Error("Invalid ABI JSON.");
    if (!selectedFunction) throw new Error("Select a function from the ABI.");

    const argValues = selectedFunction.inputs.map((input, index) => {
      const key = `${input.name || `arg${index}`}-${index}`;
      return parseParam(input, valuesByParam[key] ?? "");
    });
    const calldata = iface.encodeFunctionData(selectedFunction, argValues);
    return {
      target: encodedTarget,
      calldata,
      functionSignature: selectedFunction.format(),
      valueWei: "0",
      argsPreview: buildArgsPreview(selectedFunction.inputs, argValues),
    };
  }

  function handleStageCall() {
    setError(null);
    try {
      const nextCall = buildCallFromForm();
      setStagedCalls((current) => [...current, nextCall]);
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to stage call.");
    }
  }

  async function handleSubmitProposal() {
    setError(null);
    try {
      if (!description.trim()) throw new Error("Proposal description is required.");
      if (stagedCalls.length === 0) throw new Error("Stage at least one call before submitting.");
      await onSubmit({ description: description.trim(), calls: stagedCalls });
      setDescription("");
      setStagedCalls([]);
      resetWizardForNextCall();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit proposal.");
    }
  }

  function removeStaged(idx: number) {
    setStagedCalls((calls) => calls.filter((_, i) => i !== idx));
  }

  function moveStaged(idx: number, dir: -1 | 1) {
    setStagedCalls((calls) => {
      const next = [...calls];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return calls;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  }

  // Whether the address book has any sources still loading (just for the empty hint).
  const bookHasContent = bookEntries.length > 0;
  const sourcesLoading = loadingTimelockWallets || loadingVaults;

  return (
    <div className="bb-builder">
      <div className="bb-pw-shell">
        <StepNav
          stepId={step}
          onJump={jumpStep}
          canJumpReview={stagedCalls.length > 0}
          canJumpFunction={!!targetMeta}
        />

        {/* ── STEP 1 · Method ───────────────────────────────────────────── */}
        {step === "method" && (
          <div className="bb-pw-section">
            <div>
              <div className="bb-pw-kicker">Step 1 / 4</div>
              <h3 className="bb-pw-h">How do you want to build this proposal?</h3>
              <p className="bb-pw-sub">
                Start from a ready-made template, or pick the contract you want to call.
              </p>
            </div>
            <div className="bb-pw-methods">
              <button
                type="button"
                className="bb-pw-method"
                onClick={() => pickMethod("template")}
                data-testid="proposal-method-template"
              >
                <div className="bb-pw-method-icon">✦</div>
                <div className="bb-pw-method-k">
                  <div className="bb-pw-method-name">From a template</div>
                  <div className="bb-pw-method-sub">
                    Pre-built proposals — grants, mints, role grants, governance tweaks.
                    Edit before submitting.
                  </div>
                </div>
                <span className="bb-pw-method-cta">Choose template →</span>
              </button>
              <button
                type="button"
                className="bb-pw-method"
                onClick={() => pickMethod("address")}
                data-testid="proposal-method-address"
              >
                <div className="bb-pw-method-icon">📖</div>
                <div className="bb-pw-method-k">
                  <div className="bb-pw-method-name">From an address</div>
                  <div className="bb-pw-method-sub">
                    Pick from your address book — known contracts auto-detect their
                    interface. Saved contacts persist for next time.
                  </div>
                </div>
                <span className="bb-pw-method-cta">Pick address →</span>
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2A · Templates ──────────────────────────────────────── */}
        {step === "source" && method === "template" && (
          <div className="bb-pw-section">
            <div>
              <div className="bb-pw-kicker">Step 2 / 4 · Template</div>
              <h3 className="bb-pw-h">Pick a template</h3>
              <p className="bb-pw-sub">
                Templates fill the target and a starter description. You'll edit the
                params on the next step before staging.
              </p>
            </div>
            <div className="bb-pw-types">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="bb-pw-type"
                  onClick={() => applyTemplate(t)}
                  data-testid={`proposal-template-${t.id}`}
                >
                  <div className="bb-pw-type-icon">{t.icon}</div>
                  <div className="bb-pw-type-k">
                    <div className="bb-pw-type-name">{t.title}</div>
                    <div className="bb-pw-type-sub">{t.description}</div>
                  </div>
                </button>
              ))}
            </div>
            {error && (
              <div className="bb-banner bb-banner-warn">
                <span aria-hidden>⚠</span>
                <div>{error}</div>
                <span />
              </div>
            )}
            <div className="bb-pw-foot">
              <div className="bb-pw-foot-meta">
                Templates land on the function step with the form pre-filled.
              </div>
              <div className="bb-pw-foot-actions">
                <button type="button" className="bb-btn-ghost bb-btn-xs" onClick={goPrev}>
                  Back
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2B · Address picker ─────────────────────────────────── */}
        {step === "source" && method === "address" && (
          <div className="bb-pw-section">
            <div>
              <div className="bb-pw-kicker">Step 2 / 4 · Address</div>
              <h3 className="bb-pw-h">Which contract?</h3>
              <p className="bb-pw-sub">
                Pick from your address book or paste a custom address.
              </p>
            </div>
            <button
              type="button"
              className="bb-pw-pickbtn"
              onClick={() => setPickerOpen(true)}
              data-testid="proposal-open-address-book"
            >
              <div className="bb-pw-pickbtn-icon">📖</div>
              <div className="bb-pw-pickbtn-k">
                <div className="bb-pw-pickbtn-name">Browse address book</div>
                <div className="bb-pw-pickbtn-sub">
                  {bookHasContent
                    ? `${bookEntries.length} entries available · core contracts, wallets, vaults, config & saved contacts`
                    : sourcesLoading
                      ? "Loading sources…"
                      : "Connect a wallet and pick a DAO to populate the book"}
                </div>
              </div>
              <span className="bb-pw-pickbtn-caret">→</span>
            </button>
            <div className="bb-pw-foot">
              <div className="bb-pw-foot-meta">
                Picking a known address auto-loads its function list.
              </div>
              <div className="bb-pw-foot-actions">
                <button type="button" className="bb-btn-ghost bb-btn-xs" onClick={goPrev}>
                  Back
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3 · Function & params ──────────────────────────────── */}
        {step === "function" && targetMeta && (
          <div className="bb-pw-section">
            <div>
              <div className="bb-pw-kicker">Step 3 / 4 · {targetMeta.name}</div>
              <h3 className="bb-pw-h">Pick a function</h3>
              <p className="bb-pw-sub">
                {targetMeta.kind === "custom" ? (
                  <>Functions decoded from a custom ABI.</>
                ) : (
                  <>Interface inferred from <b>{targetMeta.kind}</b>.</>
                )}
              </p>
            </div>

            {/* Selected-target toolbar */}
            <div className="bb-pw-toolbar">
              <div className="bb-pw-toolbar-icon">
                <AddrAvatar address={target} name={targetMeta.name} size={22} />
              </div>
              <div className="bb-pw-toolbar-k">
                <b>{targetMeta.name}</b>
                <span>
                  <span className="bb-mono">{shortAddress(target)}</span> · {targetMeta.kind}
                </span>
              </div>
              <button
                type="button"
                className="bb-pw-toolbar-edit"
                onClick={() => {
                  setStep("source");
                  if (method === "address") setPickerOpen(true);
                }}
              >
                Change
              </button>
            </div>

            {/* Function (preset) list — except when the kind locks in a single preset
                (factory→wallet-deploy, mta→auth-mta-function); then go straight to the form. */}
            {presetsForKind.length > 1 && (
              <div>
                <div className="bb-pw-kicker" style={{ marginBottom: 6 }}>
                  {presetsForKind.length} action{presetsForKind.length === 1 ? "" : "s"} available
                </div>
                <div className="bb-pw-fns">
                  {presetsForKind.map((p) => {
                    const meta = PRESET_META[p];
                    const isOn = actionPreset === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        className={`bb-pw-fn${isOn ? " bb-on" : ""}`}
                        onClick={() => applyPreset(p)}
                        data-testid={`proposal-preset-${p}`}
                      >
                        <div>
                          <div className="bb-pw-fn-l1">{meta.label}</div>
                          <div className="bb-pw-fn-l2">{meta.description}</div>
                        </div>
                        <span className="bb-pw-fn-tag">{p}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Per-preset form */}
            {actionPreset && (
              <div className="bb-builder-params">
                <div className="bb-builder-params-head">
                  <span className="bb-mono">{PRESET_META[actionPreset].label}</span>
                </div>

                {actionPreset === "native-transfer" && (
                  <NativeTransferForm ref={nativeTransferFormRef} target={target} />
                )}

                {actionPreset === "token-transfer" && (
                  <TokenTransferForm ref={tokenTransferFormRef} target={target} />
                )}

                {actionPreset === "token-approve" && (
                  <>
                    <FormField label="Spender" style={{ marginBottom: 0 }}>
                      <AddressInput
                        value={governanceAddressValue}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setGovernanceAddressValue(e.target.value)
                        }
                      />
                    </FormField>
                    <FormField label="Amount (raw token units)" style={{ marginBottom: 0 }}>
                      <Uint256Input
                        value={governanceUintValue}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setGovernanceUintValue(e.target.value)
                        }
                      />
                    </FormField>
                  </>
                )}

                {actionPreset === "token-burn" && (
                  <FormField label="Burn Amount (raw token units)" style={{ marginBottom: 0 }}>
                    <Uint256Input
                      value={governanceUintValue}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setGovernanceUintValue(e.target.value)
                      }
                    />
                  </FormField>
                )}

                {(actionPreset === "token-mint" || actionPreset === "auth-execute-mint") && (
                  <>
                    {actionPreset === "auth-execute-mint" && (
                      <>
                        <div className="bb-field-hint bb-muted" style={{ marginBottom: 8 }}>
                          Wrapped through MTA · auth.execute(slug, token, mint(...)). Caller must
                          hold TOKEN_MINTER_ROLE (or be Super Admin) on this org's slug.
                        </div>
                        <FormField label="slug · auto" style={{ marginBottom: 0 }}>
                          <div className="bb-pw-readonly-pill">
                            <span className="bb-pw-readonly-pill-name">
                              {parsePayeeNameLabel(orgSlug) || "—"}
                            </span>
                            <span className="bb-pw-readonly-pill-sub bb-mono">
                              {orgSlug ? `${orgSlug.slice(0, 10)}…${orgSlug.slice(-8)}` : "—"}
                            </span>
                          </div>
                        </FormField>
                        <FormField label="target · auto" style={{ marginBottom: 0 }}>
                          <div className="bb-pw-readonly-pill">
                            <AddrAvatar address={daoAddresses.token} name="Governance Token" size={20} />
                            <span className="bb-pw-readonly-pill-name">Governance Token</span>
                            <span className="bb-pw-readonly-pill-sub bb-mono">
                              {daoAddresses.token ? shortAddress(daoAddresses.token) : "—"}
                            </span>
                          </div>
                        </FormField>
                      </>
                    )}
                    <FormField label="Mint To" style={{ marginBottom: 0 }}>
                      <AddressInput
                        value={roleAccountAddress}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setRoleAccountAddress(e.target.value)
                        }
                      />
                    </FormField>
                    <FormField label="Amount (raw token units)" style={{ marginBottom: 0 }}>
                      <Uint256Input
                        value={governanceUintValue}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setGovernanceUintValue(e.target.value)
                        }
                      />
                    </FormField>
                    {actionPreset === "auth-execute-mint" && (
                      <div className="bb-field-hint bb-muted" style={{ marginTop: 6 }}>
                        options = 0x (empty). The MTA forwards this bytes blob to per-permission
                        custom authorizers; TOKEN_MINTER_ROLE uses the simple whitelist path so
                        nothing reads it here.
                      </div>
                    )}
                  </>
                )}

                {actionPreset === "token-delegate" && (
                  <FormField label="Delegatee" style={{ marginBottom: 0 }}>
                    <AddressInput
                      value={roleAccountAddress}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setRoleAccountAddress(e.target.value)
                      }
                    />
                  </FormField>
                )}

                {(
                  actionPreset === "gov-set-voting-delay" ||
                  actionPreset === "gov-set-voting-period" ||
                  actionPreset === "gov-set-proposal-threshold" ||
                  actionPreset === "gov-update-quorum-numerator"
                ) && (
                  <FormField label="New Value" style={{ marginBottom: 0 }}>
                    <Uint256Input
                      value={governanceUintValue}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setGovernanceUintValue(e.target.value)
                      }
                      data-testid="proposal-uint-value"
                    />
                  </FormField>
                )}

                {actionPreset === "gov-update-timelock" && (
                  <FormField label="New Timelock Address" style={{ marginBottom: 0 }}>
                    <AddressInput
                      value={governanceAddressValue}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setGovernanceAddressValue(e.target.value)
                      }
                    />
                  </FormField>
                )}

                {GOVERNANCE_ROLE_CONFIG[actionPreset] && (
                  <>
                    <FormField label="Role" style={{ marginBottom: 0 }}>
                      <Input value={GOVERNANCE_ROLE_CONFIG[actionPreset]?.label ?? ""} readOnly />
                    </FormField>
                    <FormField label="Role Account" style={{ marginBottom: 0 }}>
                      <AddressInput
                        value={roleAccountAddress}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setRoleAccountAddress(e.target.value)
                        }
                      />
                    </FormField>
                  </>
                )}

                {actionPreset === "wallet-update-entry-point" && (
                  <FormField label="New Entry Point" style={{ marginBottom: 0 }}>
                    <AddressInput
                      value={walletAddressValue}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setWalletAddressValue(e.target.value)
                      }
                    />
                  </FormField>
                )}

                {actionPreset === "wallet-set-execution-authority-resolver" && (
                  <FormField label="Authority Resolver" style={{ marginBottom: 0 }}>
                    <AddressInput
                      value={walletAddressValue}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setWalletAddressValue(e.target.value)
                      }
                    />
                  </FormField>
                )}

                {actionPreset === "wallet-invalidate-nonce" && (
                  <FormField label="New Nonce" style={{ marginBottom: 0 }}>
                    <Uint256Input
                      value={walletNonceValue}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setWalletNonceValue(e.target.value)
                      }
                    />
                  </FormField>
                )}

                {actionPreset === "wallet-diamond-cut" && (
                  <Stack gap="sm">
                    {loadingFacets ? (
                      <Text.Body size="sm" color="muted">Discovering facets…</Text.Body>
                    ) : installedFacets.length > 0 ? (
                      <FormField label="Installed Facets" style={{ marginBottom: 0 }}>
                        <Select
                          value={diamondFacetAddress || null}
                          onChange={(v) => setDiamondFacetAddress(v as string)}
                          placeholder="Select from installed facets"
                        >
                          {installedFacets.map((facet) => (
                            <SelectOption
                              key={facet.facetAddress}
                              value={facet.facetAddress}
                              label={`${facet.facetAddress.slice(0, 10)}… (${facet.selectors.length} selectors)`}
                            />
                          ))}
                        </Select>
                      </FormField>
                    ) : null}
                    <FormField label="Facet Address" style={{ marginBottom: 0 }}>
                      <AddressInput
                        value={diamondFacetAddress}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setDiamondFacetAddress(e.target.value)
                        }
                      />
                    </FormField>
                    <FormField label="Action" style={{ marginBottom: 0 }}>
                      <Select value={diamondCutAction as string} onChange={(v) => setDiamondCutAction(v as string)}>
                        <SelectOption value="0" label="Add" />
                        <SelectOption value="1" label="Replace" />
                        <SelectOption value="2" label="Remove" />
                      </Select>
                    </FormField>
                    <FormField label="Function Selector (bytes4)" style={{ marginBottom: 0 }}>
                      <Input
                        value={diamondSelector}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setDiamondSelector(e.target.value)
                        }
                        placeholder="0x12345678"
                      />
                    </FormField>
                    <FormField label="Init Address (optional)" style={{ marginBottom: 0 }}>
                      <AddressInput
                        value={diamondInitAddress}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setDiamondInitAddress(e.target.value)
                        }
                      />
                    </FormField>
                    <FormField label="Init Calldata (hex, optional)" style={{ marginBottom: 0 }}>
                      <Input
                        value={diamondInitCalldata}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setDiamondInitCalldata(e.target.value)
                        }
                        placeholder="0x"
                      />
                    </FormField>
                  </Stack>
                )}

                {actionPreset === "wallet-deploy" && (
                  <WalletDeployForm
                    ref={walletDeployFormRef}
                    target={target}
                    configAddresses={configAddresses}
                    onOpenConfigAddressBook={(field) => {
                      if (field === "wallet-authorizer" || field === "wallet-initializer") {
                        openConfigPicker(field);
                      }
                    }}
                  />
                )}

                {(actionPreset === "custom" ||
                  actionPreset === "wallet-calibur-entry" ||
                  actionPreset === "auth-mta-function") && (
                  <Stack gap="sm">
                    {actionPreset === "custom" && (
                      <FormField label="ABI JSON" style={{ marginBottom: 0 }}>
                        <textarea
                          value={abiText}
                          onChange={(e) => {
                            setAbiText(e.target.value);
                            setSelectedFunctionSignature("");
                            setValuesByParam({});
                          }}
                          rows={6}
                          style={{
                            width: "100%",
                            borderRadius: "var(--radius-md)",
                            border: "1px solid var(--colors-border)",
                            padding: "var(--spacing-md)",
                            background: "var(--colors-background)",
                            color: "var(--colors-text-main)",
                            fontFamily: "var(--bb-font-mono)",
                            fontSize: 12.5,
                          }}
                        />
                      </FormField>
                    )}

                    {functions.length === 0 ? (
                      <div className="bb-pw-empty">
                        <b>No writable functions in this ABI</b>
                        <span>Paste a valid ABI JSON above to populate the list.</span>
                      </div>
                    ) : (
                      <div>
                        <div className="bb-pw-kicker" style={{ marginBottom: 6 }}>
                          {functions.length} writable function{functions.length === 1 ? "" : "s"}
                        </div>
                        <div className="bb-pw-fns">
                          {functions.map((fragment) => {
                            const sig = fragment.format();
                            const isOn = selectedFunctionSignature === sig;
                            const argCount = fragment.inputs.length;
                            return (
                              <button
                                key={sig}
                                type="button"
                                className={`bb-pw-fn${isOn ? " bb-on" : ""}`}
                                onClick={() => {
                                  setSelectedFunctionSignature(sig);
                                  setValuesByParam({});
                                }}
                                data-testid={`proposal-fn-${fragment.name}`}
                              >
                                <div>
                                  <div className="bb-pw-fn-l1">{fragment.name}</div>
                                  <div className="bb-pw-fn-l2">{sig}</div>
                                </div>
                                <span className="bb-pw-fn-tag">
                                  {argCount} arg{argCount === 1 ? "" : "s"}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {selectedFunction && (
                      selectedFunction.inputs.length === 0 ? (
                        <Text.Body size="sm" color="muted">No inputs for this function.</Text.Body>
                      ) : actionPreset === "auth-mta-function" ? (
                        <MtaArgsRenderer
                          inputs={selectedFunction.inputs}
                          valuesByParam={valuesByParam}
                          setValuesByParam={setValuesByParam}
                          orgSlug={orgSlug}
                          chainId={chainId}
                        />
                      ) : (
                        <GenericArgsRenderer
                          inputs={selectedFunction.inputs}
                          valuesByParam={valuesByParam}
                          setValuesByParam={setValuesByParam}
                        />
                      )
                    )}
                  </Stack>
                )}
              </div>
            )}

            {error && (
              <div className="bb-banner bb-banner-warn">
                <span aria-hidden>⚠</span>
                <div>{error}</div>
                <span />
              </div>
            )}

            <div className="bb-pw-foot">
              <div className="bb-pw-foot-meta">
                {actionPreset
                  ? <>Action: <b style={{ color: "var(--bb-text)" }}>{PRESET_META[actionPreset].label}</b></>
                  : "Pick an action above"}
              </div>
              <div className="bb-pw-foot-actions">
                <button type="button" className="bb-btn-ghost bb-btn-xs" onClick={goPrev}>
                  Back
                </button>
                <button
                  type="button"
                  className="bb-btn-primary bb-btn-xs"
                  onClick={handleStageCall}
                  disabled={!actionPreset || disabled || loading}
                  data-testid="proposal-stage"
                >
                  + Stage call
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 4 · Review ─────────────────────────────────────────── */}
        {step === "review" && (
          <div className="bb-pw-section">
            <div>
              <div className="bb-pw-kicker">Step 4 / 4 · Review</div>
              <h3 className="bb-pw-h">Describe & submit</h3>
              <p className="bb-pw-sub">
                Voters see the description and the staged calls. Be clear about intent.
              </p>
            </div>

            <div className="bb-field-grid">
              <div className="bb-field bb-full">
                <label>Description</label>
                <Input
                  value={description}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)}
                  placeholder="What does this proposal do?"
                />
              </div>
            </div>

            <div className="bb-builder-section">
              <div className="bb-builder-head">
                <h4>
                  Staged calls <span className="bb-muted">({stagedCalls.length})</span>
                </h4>
                <span className="bb-muted bb-small">
                  Calls execute in order, atomically, when the proposal is executed.
                </span>
              </div>
              {stagedCalls.length === 0 ? (
                <div className="bb-staged-empty">
                  <span aria-hidden>📎</span>
                  <span>No staged calls yet.</span>
                </div>
              ) : (
                <div className="bb-staged-list">
                  {stagedCalls.map((call, index) => (
                    <div className="bb-staged-card" key={`${call.target}-${call.functionSignature}-${index}`}>
                      <div className="bb-staged-num">#{index + 1}</div>
                      <div className="bb-staged-body">
                        <div className="bb-staged-line-1">
                          <span className="bb-staged-target">{shortAddress(call.target)}</span>
                          <span className="bb-staged-dot">·</span>
                          <span className="bb-staged-fn">{call.functionSignature}</span>
                          {call.valueWei && call.valueWei !== "0" && (
                            <>
                              <span className="bb-staged-dot">·</span>
                              <span className="bb-staged-val">{call.valueWei} wei</span>
                            </>
                          )}
                        </div>
                        {call.argsPreview && call.argsPreview.length > 0 ? (
                          <div className="bb-staged-line-2 bb-staged-args">
                            {call.argsPreview.map((a, ai) => (
                              <span key={`${a.name}-${ai}`} className="bb-staged-arg">
                                <span className="bb-staged-arg-name">{a.name}=</span>
                                <span className="bb-staged-arg-val">{a.display}</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="bb-staged-line-2">
                            calldata {call.calldata.length > 18
                              ? `${call.calldata.slice(0, 12)}…${call.calldata.slice(-6)}`
                              : call.calldata}
                          </div>
                        )}
                      </div>
                      <div className="bb-staged-actions">
                        <button
                          type="button"
                          className="bb-icon-btn-sm"
                          onClick={() => moveStaged(index, -1)}
                          disabled={index === 0}
                          aria-label="Move up"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="bb-icon-btn-sm"
                          onClick={() => moveStaged(index, 1)}
                          disabled={index === stagedCalls.length - 1}
                          aria-label="Move down"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="bb-icon-btn-sm bb-danger"
                          onClick={() => removeStaged(index)}
                          aria-label="Remove staged call"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "flex-start", marginTop: 4 }}>
                <button
                  type="button"
                  className="bb-pw-add-call"
                  onClick={resetWizardForNextCall}
                  data-testid="proposal-add-another"
                >
                  + Add another call
                </button>
              </div>
            </div>

            {error && (
              <div className="bb-banner bb-banner-warn">
                <span aria-hidden>⚠</span>
                <div>{error}</div>
                <span />
              </div>
            )}

            <div className="bb-pw-foot">
              <div className="bb-pw-foot-meta">
                {stagedCalls.length === 0
                  ? "No calls staged"
                  : `${stagedCalls.length} call${stagedCalls.length === 1 ? "" : "s"} ready`}
              </div>
              <div className="bb-pw-foot-actions">
                <button type="button" className="bb-btn-ghost bb-btn-xs" onClick={fullReset}>
                  Reset
                </button>
                <button
                  type="button"
                  className="bb-btn-primary bb-btn-xs"
                  onClick={() => void handleSubmitProposal()}
                  disabled={
                    disabled || loading || !description.trim() || stagedCalls.length === 0
                  }
                  data-testid="proposal-submit"
                >
                  {loading ? <span className="bb-spinner bb-sm" /> : null}
                  {loading
                    ? "Submitting…"
                    : `Submit Proposal (${stagedCalls.length})`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <AddressBookModal
        isOpen={pickerOpen}
        onClose={() => {
          setPickerOpen(false);
          setConfigPickerField(null);
        }}
        entries={bookEntries}
        contactsStore={contactsStore}
        title={
          configPickerField === "wallet-authorizer"
            ? "Pick an authorizer"
            : configPickerField === "wallet-initializer"
              ? "Pick an initializer"
              : "Address book"
        }
        kindFilter={
          configPickerField === "wallet-authorizer"
            ? ["authority-resolver"]
            : configPickerField === "wallet-initializer"
              ? ["kernel-initializer"]
              : undefined
        }
        categoryFilter={configPickerField ? ["config"] : undefined}
        onSelect={handlePickAddress}
      />
    </div>
  );
}
