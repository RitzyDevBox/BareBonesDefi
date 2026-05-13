import { useEffect, useMemo, useState, useRef } from "react";
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
import { TargetAddressBookModal } from "./TargetAddressBookModal";
import { AddressBookInput } from "../Inputs/AddressBookInput";
import { useProposalAddressBook, type AddressBookTargetType } from "../../hooks/dao/useProposalAddressBook";
import { useDiamondFacets } from "../../hooks/diamond/useDiamondFacets";
import { useWalletProvider } from "../../hooks/useWalletProvider";
import { DEFAULT_BARE_BONES_CONFIG, getBareBonesConfiguration } from "../../constants/misc";
import type { ProposalBuildPayload, ProposalCall, ProposalCallArgPreview } from "./types";
import { NativeTransferForm, TokenTransferForm, WalletDeployForm } from "./ProposalForms";
import { MtaArgsRenderer } from "./proposalTemplates/MtaTemplate";
import { GenericArgsRenderer } from "./proposalTemplates/GenericTemplate";

// ============================================================================
// ABIs & Constants
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
  {
    type: "function",
    name: "renounceRole",
    inputs: [
      { name: "role", type: "bytes32", internalType: "bytes32" },
      { name: "callerConfirmation", type: "address", internalType: "address" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
];

const TIMELOCK_ROLE_ABI_OBJECT = [
  ...ACCESS_CONTROL_ABI_OBJECT,
  {
    type: "function",
    name: "PROPOSER_ROLE",
    inputs: [],
    outputs: [{ name: "", type: "bytes32", internalType: "bytes32" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "CANCELLER_ROLE",
    inputs: [],
    outputs: [{ name: "", type: "bytes32", internalType: "bytes32" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "EXECUTOR_ROLE",
    inputs: [],
    outputs: [{ name: "", type: "bytes32", internalType: "bytes32" }],
    stateMutability: "view",
  },
] as const;

const TOKEN_FUNCTIONS_ABI_OBJECT = [...(ERC20ABI as any[]), ...TOKEN_FUNCTIONS_EXTENSION_ABI_OBJECT] as any[];
const TOKEN_FUNCTIONS_ABI_TEXT = JSON.stringify(TOKEN_FUNCTIONS_ABI_OBJECT, null, 2);
const CALIBUR_ABI_TEXT = JSON.stringify(CaliburEntryABI, null, 2);
const MTA_ABI_TEXT = JSON.stringify(MultiTenantAuthABI, null, 2);

const TOKEN_FUNCTIONS_INTERFACE = new ethers.utils.Interface(TOKEN_FUNCTIONS_ABI_OBJECT as any);
const GOVERNANCE_INTERFACE = new ethers.utils.Interface(DAOGovernorABI as any);
const CALIBUR_INTERFACE = new ethers.utils.Interface(CaliburEntryABI as any);
const DIAMOND_CUT_INTERFACE = new ethers.utils.Interface(DiamondCutFacetABI as any);
const TIMELOCK_ROLE_INTERFACE = new ethers.utils.Interface(TIMELOCK_ROLE_ABI_OBJECT as any);

const PROPOSER_ROLE_ID = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("PROPOSER_ROLE"));
const CANCELLER_ROLE_ID = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("CANCELLER_ROLE"));
const EXECUTOR_ROLE_ID = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("EXECUTOR_ROLE"));

type ActionGroup = "token" | "governance" | "smart-wallet" | "authorizer" | "custom";

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
  | "custom";

const ACTION_GROUP_OPTIONS: Array<{ value: ActionGroup; label: string }> = [
  { value: "token", label: "Token & Currency Functions" },
  { value: "governance", label: "Governance Management" },
  { value: "smart-wallet", label: "Smart Wallet / Diamond" },
  { value: "authorizer", label: "Authorizer / Roles & Permissions" },
  { value: "custom", label: "Custom ABI" },
];

const ACTION_OPTIONS: Record<ActionGroup, Array<{ value: ProposalActionPreset; label: string }>> = {
  token: [
    { value: "native-transfer", label: "Native Transfer" },
    { value: "token-transfer", label: "ERC20 Transfer" },
    { value: "token-approve", label: "ERC20 Approve" },
    { value: "token-mint", label: "Mint" },
    { value: "token-burn", label: "Burn" },
    { value: "token-delegate", label: "Delegate Votes" },
  ],
  governance: [
    { value: "gov-set-voting-delay", label: "Set Voting Delay" },
    { value: "gov-set-voting-period", label: "Set Voting Period" },
    { value: "gov-set-proposal-threshold", label: "Set Proposal Threshold" },
    { value: "gov-update-quorum-numerator", label: "Update Quorum Numerator" },
    { value: "gov-update-timelock", label: "Update Timelock" },
    { value: "gov-add-proposer", label: "Add Proposer" },
    { value: "gov-add-canceller", label: "Add Canceller" },
    { value: "gov-add-executor", label: "Add Executor" },
    { value: "gov-remove-proposer", label: "Remove Proposer" },
    { value: "gov-remove-canceller", label: "Remove Canceller" },
    { value: "gov-remove-executor", label: "Remove Executor" },
  ],
  "smart-wallet": [
    { value: "wallet-calibur-entry", label: "Calibur Entry Function" },
    { value: "wallet-update-entry-point", label: "Update Entry Point" },
    { value: "wallet-set-execution-authority-resolver", label: "Set Execution Authority Resolver" },
    { value: "wallet-invalidate-nonce", label: "Invalidate Nonce" },
    { value: "wallet-diamond-cut", label: "Diamond Cut" },
  ],
  authorizer: [
    { value: "auth-mta-function", label: "Authorizer Function (MTA)" },
  ],
  custom: [{ value: "custom", label: "Custom ABI Function" }],
};

const GOVERNANCE_ROLE_CONFIG: Partial<
  Record<
    ProposalActionPreset,
    {
      label: string;
      roleId: string;
      method: "grantRole" | "revokeRole";
    }
  >
> = {
  "gov-add-proposer": {
    label: "Add Proposer",
    roleId: PROPOSER_ROLE_ID,
    method: "grantRole",
  },
  "gov-add-canceller": {
    label: "Add Canceller",
    roleId: CANCELLER_ROLE_ID,
    method: "grantRole",
  },
  "gov-add-executor": {
    label: "Add Executor",
    roleId: EXECUTOR_ROLE_ID,
    method: "grantRole",
  },
  "gov-remove-proposer": {
    label: "Remove Proposer",
    roleId: PROPOSER_ROLE_ID,
    method: "revokeRole",
  },
  "gov-remove-canceller": {
    label: "Remove Canceller",
    roleId: CANCELLER_ROLE_ID,
    method: "revokeRole",
  },
  "gov-remove-executor": {
    label: "Remove Executor",
    roleId: EXECUTOR_ROLE_ID,
    method: "revokeRole",
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

function targetTypeForPreset(preset: ProposalActionPreset): AddressBookTargetType {
  if (["token-transfer", "token-approve", "token-mint", "token-burn", "token-delegate"].includes(preset)) return "token";
  if (
    [
      "gov-set-voting-delay",
      "gov-set-voting-period",
      "gov-set-proposal-threshold",
      "gov-update-quorum-numerator",
      "gov-update-timelock",
    ].includes(preset)
  )
    return "governance";
  if (GOVERNANCE_ROLE_CONFIG[preset]) return "governance";
  if (preset === "wallet-deploy") return "config";
  if (preset === "auth-mta-function") return "config";
  if (["wallet-update-entry-point", "wallet-set-execution-authority-resolver", "wallet-invalidate-nonce", "wallet-diamond-cut", "wallet-calibur-entry"].includes(preset)) return "wallet";
  return "custom";
}

function defaultTargetForPreset(
  preset: ProposalActionPreset,
  params: { governorAddress: string; timelockAddress: string; mtaAddress: string }
): string {
  if (GOVERNANCE_ROLE_CONFIG[preset]) return params.timelockAddress;
  if (
    [
      "gov-set-voting-delay",
      "gov-set-voting-period",
      "gov-set-proposal-threshold",
      "gov-update-quorum-numerator",
      "gov-update-timelock",
    ].includes(preset)
  )
    return params.governorAddress;
  if (preset === "auth-mta-function") return params.mtaAddress;
  return "";
}

function defaultTargetLabelForPreset(
  preset: ProposalActionPreset,
  params: { governorAddress: string; timelockAddress: string; mtaAddress: string; target: string }
): string | null {
  if (!params.target) return null;
  if (GOVERNANCE_ROLE_CONFIG[preset] && params.target.toLowerCase() === params.timelockAddress.toLowerCase()) {
    return "Timelock";
  }

  if (
    [
      "gov-set-voting-delay",
      "gov-set-voting-period",
      "gov-set-proposal-threshold",
      "gov-update-quorum-numerator",
      "gov-update-timelock",
    ].includes(preset) &&
    params.target.toLowerCase() === params.governorAddress.toLowerCase()
  ) {
    return "Governor";
  }

  if (
    preset === "auth-mta-function" &&
    params.mtaAddress &&
    params.target.toLowerCase() === params.mtaAddress.toLowerCase()
  ) {
    return "Multi-Tenant Authorizer";
  }

  return null;
}

function normalizeAbiCandidate(input: unknown): any[] {
  if (Array.isArray(input)) return input;
  if (input && typeof input === "object" && Array.isArray((input as any).abi)) {
    return (input as any).abi;
  }
  throw new Error("ABI must be a JSON array or an object with an abi array.");
}

/**
 * Normalize an already-decoded JS value for a single scalar Solidity type
 * before it's handed to ethers' ABI encoder. Tolerates the same loose forms
 * the top-level form inputs accept (utf-8 bytes32, decimal-string uints,
 * mixed-case addresses) so nested tuple fields don't break encoding.
 */
function normalizeScalar(type: string, value: unknown): unknown {
  if (typeof value !== "string") return value;
  const v = value.trim();
  if (type === "address") {
    return v === "" ? v : ethers.utils.getAddress(v);
  }
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

/**
 * Recursively normalize a JS value against its ABI param fragment. Walks
 * tuple/tuple[] and array types so nested scalar fields (e.g. a `nameSlug`
 * bytes32 inside a `MemberInit` struct that the user typed as utf-8) get
 * the same lossless conversion the top-level form inputs apply. Without
 * this, ethers' encoder blows up on the first non-hex bytes32.
 */
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

/**
 * Render a normalized JS value as a short string for the staged-call row.
 * Tries hard to be human-friendly: bytes32 reads as utf-8 when it round-trips,
 * addresses are shortened, tuples / tuple[] collapse to a count + first-field
 * peek. Display only — calldata is the source of truth.
 */
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
      } catch { /* not utf-8, fall through */ }
      return `${s.slice(0, 6)}…${s.slice(-4)}`;
    }
    return s;
  }
  if (param.type === "address") {
    const s = typeof value === "string" ? value : String(value);
    if (s.length >= 10) return `${s.slice(0, 6)}…${s.slice(-4)}`;
    return s;
  }
  if (param.type === "bool") {
    return value ? "true" : "false";
  }
  if (param.type.startsWith("uint") || param.type.startsWith("int")) {
    if (ethers.BigNumber.isBigNumber(value)) return value.toString();
    return String(value);
  }
  // bytes, string, fallback
  const s = typeof value === "string" ? value : JSON.stringify(value);
  return s.length > 18 ? `${s.slice(0, 12)}…` : s;
}

function buildArgsPreview(
  inputs: ReadonlyArray<ethers.utils.ParamType>,
  argValues: unknown[],
): ProposalCallArgPreview[] {
  return inputs.map((input, i) => ({
    name: input.name || `arg${i}`,
    display: previewValue(argValues[i], input),
  }));
}

function defaultDescriptionForAction(preset: ProposalActionPreset) {
  const map: Record<ProposalActionPreset, string> = {
    "native-transfer": "Send native token",
    "token-transfer": "Transfer ERC20 tokens",
    "token-approve": "Approve ERC20 spender",
    "token-mint": "Mint governance tokens",
    "token-burn": "Burn governance tokens",
    "token-delegate": "Delegate governance votes",
    "gov-set-voting-delay": "Set voting delay",
    "gov-set-voting-period": "Set voting period",
    "gov-set-proposal-threshold": "Set proposal threshold",
    "gov-update-quorum-numerator": "Update quorum numerator",
    "gov-update-timelock": "Update timelock",
    "gov-add-proposer": "Add proposer",
    "gov-add-canceller": "Add canceller",
    "gov-add-executor": "Add executor",
    "gov-remove-proposer": "Remove proposer",
    "gov-remove-canceller": "Remove canceller",
    "gov-remove-executor": "Remove executor",
    "wallet-update-entry-point": "Update entry point",
    "wallet-set-execution-authority-resolver": "Set execution authority resolver",
    "wallet-invalidate-nonce": "Invalidate nonce",
    "wallet-diamond-cut": "Diamond cut",
    "wallet-calibur-entry": "Calibur entry function call",
    "wallet-deploy": "Deploy a new smart wallet",
    "auth-mta-function": "Authorizer (MTA) function call",
    custom: "",
  };
  return map[preset];
}

// ============================================================================
// Main Component
// ============================================================================

type Props = {
  disabled?: boolean;
  loading?: boolean;
  governorAddress?: string;
  /** Current DAO's org slug (bytes32). Auto-fills `slug` params on MTA calls and
   *  keys the roster lookup that powers the member/permission/custom-role pickers. */
  orgSlug?: string;
  onSubmit: (payload: ProposalBuildPayload) => Promise<void> | void;
};

export function ProposalBuilder({ disabled = false, loading = false, governorAddress = "", orgSlug = "", onSubmit }: Props) {
  const { chainId, provider } = useWalletProvider();
  const mtaAddress = useMemo(
    () => (chainId == null ? "" : getBareBonesConfiguration(chainId).multiTenantAuthAddress),
    [chainId],
  );

  // Core proposal state
  const [target, setTarget] = useState("");
  const [description, setDescription] = useState("");
  const [actionGroup, setActionGroup] = useState<ActionGroup>("token");
  const [actionPreset, setActionPreset] = useState<ProposalActionPreset>("native-transfer");
  const [addressBookOpen, setAddressBookOpen] = useState(false);
  const [configAddressBookOpen, setConfigAddressBookOpen] = useState<"wallet-authorizer" | "wallet-initializer" | null>(null);
  const [targetSelectionLabel, setTargetSelectionLabel] = useState<string | null>(null);

  // Staging
  const [stagedCalls, setStagedCalls] = useState<ProposalCall[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Legacy form states (gradually being replaced by form components)
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

  // Form component refs
  const nativeTransferFormRef = useRef<any>(null);
  const tokenTransferFormRef = useRef<any>(null);
  const walletDeployFormRef = useRef<any>(null);

  const {
    timelockWalletAddresses,
    vaultAddresses,
    timelockAddress,
    loadingTimelockWallets,
    loadingVaults,
    configAddresses,
  } = useProposalAddressBook(governorAddress);

  const { facets: installedFacets, loading: loadingFacets } = useDiamondFacets(
    provider,
    actionPreset === "wallet-diamond-cut" ? target : null
  );

  const currentTargetType = useMemo(() => targetTypeForPreset(actionPreset), [actionPreset]);

  // Human-readable label for the current call (shown in Call details head as a
  // secondary line, since the chooser is in a separate card now). For ABI-driven
  // presets (custom + calibur), prefer the actual function signature once one is
  // picked; fall back to the preset label otherwise.
  const presetLabelByValue = useMemo(() => {
    const map = new Map<ProposalActionPreset, string>();
    for (const group of Object.values(ACTION_OPTIONS)) {
      for (const opt of group) map.set(opt.value, opt.label);
    }
    return map;
  }, []);

  const callDetailsSubLabel = useMemo(() => {
    if (
      (actionPreset === "custom" || actionPreset === "wallet-calibur-entry" || actionPreset === "auth-mta-function") &&
      selectedFunctionSignature
    ) {
      return selectedFunctionSignature;
    }
    return presetLabelByValue.get(actionPreset) ?? actionPreset;
  }, [actionPreset, selectedFunctionSignature, presetLabelByValue]);

  function applyPreset(preset: ProposalActionPreset) {
    setActionPreset(preset);
    setValuesByParam({});
    setError(null);

    if (preset === "custom") {
      setAbiText("[]");
      setSelectedFunctionSignature("");
      return;
    }

    if (!description.trim()) {
      setDescription(defaultDescriptionForAction(preset));
    }

    if (["token-transfer", "token-approve", "token-mint", "token-burn", "token-delegate"].includes(preset)) {
      setAbiText(TOKEN_FUNCTIONS_ABI_TEXT);
      setSelectedFunctionSignature("");
    }

    if (preset === "wallet-calibur-entry") {
      setAbiText(CALIBUR_ABI_TEXT);
      setSelectedFunctionSignature("");
      setValuesByParam({});
    }

    if (preset === "auth-mta-function") {
      setAbiText(MTA_ABI_TEXT);
      setSelectedFunctionSignature("");
      setValuesByParam({});
    }

    const defaultTarget = defaultTargetForPreset(preset, {
      governorAddress,
      timelockAddress,
      mtaAddress,
    });

    if (defaultTarget) {
      setTarget(defaultTarget);
      setTargetSelectionLabel(
        defaultTargetLabelForPreset(preset, {
          governorAddress,
          timelockAddress,
          mtaAddress,
          target: defaultTarget,
        })
      );
    } else {
      setTarget("");
      setTargetSelectionLabel(null);
    }
  }

  useEffect(() => {
    const defaultTarget = defaultTargetForPreset(actionPreset, {
      governorAddress,
      timelockAddress,
      mtaAddress,
    });

    if (!defaultTarget) return;

    if (!target) {
      setTarget(defaultTarget);
      setTargetSelectionLabel(
        defaultTargetLabelForPreset(actionPreset, {
          governorAddress,
          timelockAddress,
          mtaAddress,
          target: defaultTarget,
        })
      );
    }
  }, [actionPreset, governorAddress, timelockAddress, mtaAddress]);

  function handleChangeActionGroup(nextGroup: ActionGroup) {
    setActionGroup(nextGroup);
    const firstAction = ACTION_OPTIONS[nextGroup][0]?.value;
    if (firstAction) applyPreset(firstAction);
  }

  const { iface, functions } = useMemo(() => {
    try {
      const parsed = normalizeAbiCandidate(JSON.parse(abiText));
      const nextIface = new ethers.utils.Interface(parsed as any);
      const nextFunctions = Object.keys(nextIface.functions)
        .map((signature) => nextIface.getFunction(signature))
        .filter((fragment) => fragment.constant !== true && fragment.stateMutability !== "view" && fragment.stateMutability !== "pure");

      return { iface: nextIface, functions: nextFunctions };
    } catch {
      return { iface: null as ethers.utils.Interface | null, functions: [] as ethers.utils.FunctionFragment[] };
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

  function buildCallFromForm(): ProposalCall {
    if (!target.trim()) throw new Error("Target contract address is required.");

    const encodedTarget = ethers.utils.getAddress(target.trim());

    // Use form components where available
    if (actionPreset === "native-transfer" && nativeTransferFormRef.current) {
      return nativeTransferFormRef.current.buildCall();
    }

    if (actionPreset === "token-transfer" && tokenTransferFormRef.current) {
      return tokenTransferFormRef.current.buildCall();
    }

    if (actionPreset === "wallet-deploy" && walletDeployFormRef.current) {
      return walletDeployFormRef.current.buildCall();
    }

    // Legacy: Token functions
    if (actionPreset === "token-approve") {
      if (!governanceAddressValue.trim()) throw new Error("Spender address is required.");
      if (!governanceUintValue.trim()) throw new Error("Amount is required.");

      const calldata = TOKEN_FUNCTIONS_INTERFACE.encodeFunctionData("approve", [
        ethers.utils.getAddress(governanceAddressValue.trim()),
        ethers.BigNumber.from(governanceUintValue.trim()),
      ]);

      return {
        target: encodedTarget,
        calldata,
        functionSignature: "approve(address,uint256)",
        valueWei: "0",
      };
    }

    if (actionPreset === "token-mint") {
      if (!roleAccountAddress.trim()) throw new Error("Mint recipient address is required.");
      if (!governanceUintValue.trim()) throw new Error("Amount is required.");

      const calldata = TOKEN_FUNCTIONS_INTERFACE.encodeFunctionData("mint", [
        ethers.utils.getAddress(roleAccountAddress.trim()),
        ethers.BigNumber.from(governanceUintValue.trim()),
      ]);

      return {
        target: encodedTarget,
        calldata,
        functionSignature: "mint(address,uint256)",
        valueWei: "0",
      };
    }

    if (actionPreset === "token-burn") {
      if (!governanceUintValue.trim()) throw new Error("Amount is required.");

      const calldata = TOKEN_FUNCTIONS_INTERFACE.encodeFunctionData("burn", [
        ethers.BigNumber.from(governanceUintValue.trim()),
      ]);

      return {
        target: encodedTarget,
        calldata,
        functionSignature: "burn(uint256)",
        valueWei: "0",
      };
    }

    if (actionPreset === "token-delegate") {
      if (!roleAccountAddress.trim()) throw new Error("Delegatee address is required.");

      const calldata = TOKEN_FUNCTIONS_INTERFACE.encodeFunctionData("delegate", [
        ethers.utils.getAddress(roleAccountAddress.trim()),
      ]);

      return {
        target: encodedTarget,
        calldata,
        functionSignature: "delegate(address)",
        valueWei: "0",
      };
    }

    // Legacy: Governance
    if (actionPreset === "gov-set-voting-delay") {
      if (!governanceUintValue.trim()) throw new Error("Voting delay value is required.");

      const calldata = GOVERNANCE_INTERFACE.encodeFunctionData("setVotingDelay", [
        ethers.BigNumber.from(governanceUintValue.trim()),
      ]);

      return {
        target: encodedTarget,
        calldata,
        functionSignature: "setVotingDelay(uint48)",
        valueWei: "0",
      };
    }

    if (actionPreset === "gov-set-voting-period") {
      if (!governanceUintValue.trim()) throw new Error("Voting period value is required.");

      const calldata = GOVERNANCE_INTERFACE.encodeFunctionData("setVotingPeriod", [
        ethers.BigNumber.from(governanceUintValue.trim()),
      ]);

      return {
        target: encodedTarget,
        calldata,
        functionSignature: "setVotingPeriod(uint32)",
        valueWei: "0",
      };
    }

    if (actionPreset === "gov-set-proposal-threshold") {
      if (!governanceUintValue.trim()) throw new Error("Proposal threshold value is required.");

      const calldata = GOVERNANCE_INTERFACE.encodeFunctionData("setProposalThreshold", [
        ethers.BigNumber.from(governanceUintValue.trim()),
      ]);

      return {
        target: encodedTarget,
        calldata,
        functionSignature: "setProposalThreshold(uint256)",
        valueWei: "0",
      };
    }

    if (actionPreset === "gov-update-quorum-numerator") {
      if (!governanceUintValue.trim()) throw new Error("Quorum numerator value is required.");

      const calldata = GOVERNANCE_INTERFACE.encodeFunctionData("updateQuorumNumerator", [
        ethers.BigNumber.from(governanceUintValue.trim()),
      ]);

      return {
        target: encodedTarget,
        calldata,
        functionSignature: "updateQuorumNumerator(uint256)",
        valueWei: "0",
      };
    }

    if (actionPreset === "gov-update-timelock") {
      if (!governanceAddressValue.trim()) throw new Error("New timelock address is required.");

      const calldata = GOVERNANCE_INTERFACE.encodeFunctionData("updateTimelock", [
        ethers.utils.getAddress(governanceAddressValue.trim()),
      ]);

      return {
        target: encodedTarget,
        calldata,
        functionSignature: "updateTimelock(address)",
        valueWei: "0",
      };
    }

    const governanceRoleConfig = GOVERNANCE_ROLE_CONFIG[actionPreset];
    if (governanceRoleConfig) {
      if (!roleAccountAddress.trim()) throw new Error("Role account is required.");

      const calldata = TIMELOCK_ROLE_INTERFACE.encodeFunctionData(governanceRoleConfig.method, [
        governanceRoleConfig.roleId,
        ethers.utils.getAddress(roleAccountAddress.trim()),
      ]);

      return {
        target: encodedTarget,
        calldata,
        functionSignature: `${governanceRoleConfig.method}(bytes32,address)`,
        valueWei: "0",
      };
    }

    // Legacy: Wallet
    if (actionPreset === "wallet-update-entry-point") {
      if (!walletAddressValue.trim()) throw new Error("Entry point address is required.");
      const calldata = CALIBUR_INTERFACE.encodeFunctionData("updateEntryPoint", [
        ethers.utils.getAddress(walletAddressValue.trim()),
      ]);

      return {
        target: encodedTarget,
        calldata,
        functionSignature: "updateEntryPoint(address)",
        valueWei: "0",
      };
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

      return {
        target: encodedTarget,
        calldata,
        functionSignature: "invalidateNonce(uint256)",
        valueWei: "0",
      };
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

    // Legacy: Custom ABI
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
      // Reset the per-call form so the user sees the staged row instead of
      // a still-filled-in form. Preserves the chosen preset/function/target
      // so the next call lives in the same context — they only need to
      // change the arg values.
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
      nativeTransferFormRef.current?.reset();
      tokenTransferFormRef.current?.reset();
      walletDeployFormRef.current?.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to stage call.");
    }
  }

  async function handleSubmitProposal() {
    setError(null);

    try {
      if (!description.trim()) throw new Error("Proposal description is required.");
      if (stagedCalls.length === 0) throw new Error("Stage at least one call before submitting.");

      await onSubmit({
        description: description.trim(),
        calls: stagedCalls,
      });

      setStagedCalls([]);
      setValuesByParam({});
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit proposal.");
    }
  }

  return (
    <div className="bb-builder">
      {/* Choose call type — templates + manual chooser. Both are different ways
          to pick the same thing: which kind of call this proposal will make.
          Rendered FIRST because the call type drives which fields appear below
          (and pre-fills the description); making the user pick "what" before
          "why" lines up the form with how they actually fill it out. */}
      <div className="bb-builder-section">
        <div className="bb-builder-head">
          <h4>Choose call type</h4>
          <span className="bb-muted bb-small">
            Start from a template or pick the contract group / action manually.
          </span>
        </div>

        <div className="bb-template-grid">
          <button
            type="button"
            className="bb-template-card"
            onClick={() => {
              applyPreset("wallet-deploy");
              setTarget(DEFAULT_BARE_BONES_CONFIG.diamondFactoryAddress);
              setTargetSelectionLabel("Diamond Factory");
              if (!description.trim()) setDescription("Deploy a new smart wallet");
            }}
          >
            <span className="bb-template-icon">✦</span>
            <div className="bb-template-body">
              <span className="bb-template-name">Deploy Wallet</span>
              <span className="bb-template-sub">
                Deploy a new smart wallet via the Diamond Factory. Pre-fills the
                target and description so you can review and submit.
              </span>
            </div>
          </button>
        </div>

        <div className="bb-builder-row">
          <FormField label="Contract Group" style={{ marginBottom: 0 }}>
            <Select
              value={actionGroup}
              onChange={(v) => handleChangeActionGroup(v as ActionGroup)}
              dataTestId="proposal-action-group"
            >
              {ACTION_GROUP_OPTIONS.map((option) => (
                <SelectOption key={option.value} value={option.value} label={option.label} />
              ))}
            </Select>
          </FormField>

          {/* Groups that only contain a single ABI-driven preset (authorizer,
              custom) skip the redundant "Action" picker — picking the group
              auto-applies the preset, and the Function picker below is the
              actual selection that matters. Mixed groups (smart-wallet) keep
              the Action picker so users can choose between direct presets and
              the ABI-driven Calibur Entry function. */}
          {actionGroup !== "authorizer" && actionGroup !== "custom" ? (
            <FormField label="Action" style={{ marginBottom: 0 }}>
              <Select
                value={actionPreset}
                onChange={(v) => applyPreset(v as ProposalActionPreset)}
                dataTestId="proposal-action"
              >
                {(ACTION_OPTIONS[actionGroup] ?? []).map((option) => (
                  <SelectOption key={option.value} value={option.value} label={option.label} />
                ))}
              </Select>
            </FormField>
          ) : null}
        </div>

        {actionPreset === "custom" ? (
          <FormField label="ABI JSON / ABI Section" style={{ marginBottom: 0 }}>
            <textarea
              value={abiText}
              onChange={(event) => {
                setAbiText(event.target.value);
                setSelectedFunctionSignature("");
                setValuesByParam({});
              }}
              onDrop={(event) => {
                event.preventDefault();
              }}
              onDragOver={(event) => {
                event.preventDefault();
              }}
              rows={8}
              style={{
                width: "100%",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--colors-border)",
                padding: "var(--spacing-md)",
                background: "var(--colors-background)",
                color: "var(--colors-text-main)",
              }}
            />
          </FormField>
        ) : null}

        {(actionPreset === "custom" || actionPreset === "wallet-calibur-entry" || actionPreset === "auth-mta-function") ? (
          <FormField label="Function" style={{ marginBottom: 0 }}>
            <Select
              value={selectedFunctionSignature || null}
              onChange={(v) => {
                setSelectedFunctionSignature(v as string);
                setValuesByParam({});
              }}
              placeholder="Select function"
            >
              {functions.map((fragment) => (
                <SelectOption key={fragment.format()} value={fragment.format()} label={fragment.format()} />
              ))}
            </Select>
          </FormField>
        ) : null}
      </div>

      {/* Identity / description — placed after call-type so a template can
          pre-fill the description (see `applyPreset`) and the user just edits. */}
      <div className="bb-builder-section">
        <div className="bb-builder-head">
          <h4>Proposal</h4>
        </div>
        <div className="bb-field-grid">
          <div className="bb-field bb-full">
            <label>Description</label>
            <Input
              value={description}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setDescription(event.target.value)}
              placeholder="Describe this proposal"
            />
          </div>
        </div>
      </div>

      {/* Call details — only the actual fields that build the call. */}
      <div className="bb-builder-section">
        <div className="bb-builder-head">
          <h4>
            Call details
            {callDetailsSubLabel ? (
              <span
                className="bb-mono bb-small"
                style={{
                  marginLeft: 8,
                  color: "var(--bb-text-dim)",
                  fontWeight: 400,
                  letterSpacing: 0,
                }}
              >
                · {callDetailsSubLabel}
              </span>
            ) : null}
            {stagedCalls.length > 0 ? (
              <span className="bb-muted">{` · ${stagedCalls.length} staged`}</span>
            ) : null}
          </h4>
          <span className="bb-muted bb-small">
            Fill in the parameters, then stage. Calls execute in order, atomically, when the proposal is executed.
          </span>
        </div>

        <FormField label="Target Contract" style={{ marginBottom: 0 }}>
          <AddressBookInput
            value={target}
            selectedLabel={targetSelectionLabel}
            onClearSelection={() => {
              setTarget("");
              setTargetSelectionLabel(null);
            }}
            onChange={(event) => {
              setTarget((event.target as HTMLInputElement).value);
              setTargetSelectionLabel(null);
            }}
            onOpenBook={() => setAddressBookOpen(true)}
            disabled={disabled}
            loading={loading}
          />
        </FormField>

          {actionPreset === "native-transfer" && (
            <NativeTransferForm
              ref={nativeTransferFormRef}
              target={target}
            />
          )}

          {actionPreset === "token-transfer" && (
            <TokenTransferForm
              ref={tokenTransferFormRef}
              target={target}
            />
          )}

          {actionPreset === "token-approve" ? (
            <>
              <FormField label="Spender" style={{ marginBottom: 0 }}>
                <AddressInput
                  value={governanceAddressValue}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => setGovernanceAddressValue(event.target.value)}
                />
              </FormField>
              <FormField label="Amount (raw token units)" style={{ marginBottom: 0 }}>
                <Uint256Input
                  value={governanceUintValue}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => setGovernanceUintValue(event.target.value)}
                />
              </FormField>
            </>
          ) : null}

          {actionPreset === "token-burn" ? (
            <FormField label="Burn Amount (raw token units)" style={{ marginBottom: 0 }}>
              <Uint256Input
                value={governanceUintValue}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setGovernanceUintValue(event.target.value)}
              />
            </FormField>
          ) : null}

          {actionPreset === "token-mint" ? (
            <>
              <FormField label="Mint To" style={{ marginBottom: 0 }}>
                <AddressInput
                  value={roleAccountAddress}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => setRoleAccountAddress(event.target.value)}
                />
              </FormField>
              <FormField label="Amount (raw token units)" style={{ marginBottom: 0 }}>
                <Uint256Input
                  value={governanceUintValue}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => setGovernanceUintValue(event.target.value)}
                />
              </FormField>
            </>
          ) : null}

          {actionPreset === "token-delegate" ? (
            <FormField label="Delegatee" style={{ marginBottom: 0 }}>
              <AddressInput
                value={roleAccountAddress}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setRoleAccountAddress(event.target.value)}
              />
            </FormField>
          ) : null}

          {["gov-set-voting-delay", "gov-set-voting-period", "gov-set-proposal-threshold", "gov-update-quorum-numerator"].includes(actionPreset) ? (
            <FormField label="New Value" style={{ marginBottom: 0 }}>
              <Uint256Input
                value={governanceUintValue}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setGovernanceUintValue(event.target.value)}
                data-testid="proposal-uint-value"
              />
            </FormField>
          ) : null}

          {actionPreset === "gov-update-timelock" ? (
            <FormField label="New Timelock Address" style={{ marginBottom: 0 }}>
              <AddressInput
                value={governanceAddressValue}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setGovernanceAddressValue(event.target.value)}
              />
            </FormField>
          ) : null}

          {Boolean(GOVERNANCE_ROLE_CONFIG[actionPreset]) ? (
            <>
              <FormField label="Role" style={{ marginBottom: 0 }}>
                <Input value={GOVERNANCE_ROLE_CONFIG[actionPreset]?.label ?? ""} readOnly />
              </FormField>
              <FormField label="Role Account" style={{ marginBottom: 0 }}>
                <AddressInput
                  value={roleAccountAddress}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => setRoleAccountAddress(event.target.value)}
                />
              </FormField>
            </>
          ) : null}

          {actionPreset === "wallet-update-entry-point" ? (
            <FormField label="New Entry Point" style={{ marginBottom: 0 }}>
              <AddressInput
                value={walletAddressValue}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setWalletAddressValue(event.target.value)}
              />
            </FormField>
          ) : null}

          {actionPreset === "wallet-set-execution-authority-resolver" ? (
            <FormField label="Authority Resolver" style={{ marginBottom: 0 }}>
              <AddressInput
                value={walletAddressValue}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setWalletAddressValue(event.target.value)}
              />
            </FormField>
          ) : null}

          {actionPreset === "wallet-invalidate-nonce" ? (
            <FormField label="New Nonce" style={{ marginBottom: 0 }}>
              <Uint256Input
                value={walletNonceValue}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setWalletNonceValue(event.target.value)}
              />
            </FormField>
          ) : null}

          {actionPreset === "wallet-diamond-cut" ? (
            <Stack gap="sm">
              {loadingFacets ? (
                <Text.Body size="sm" color="muted">
                  Discovering facets…
                </Text.Body>
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
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => setDiamondFacetAddress(event.target.value)}
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
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => setDiamondSelector(event.target.value)}
                  placeholder="0x12345678"
                />
              </FormField>
              <FormField label="Init Address (optional)" style={{ marginBottom: 0 }}>
                <AddressInput
                  value={diamondInitAddress}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => setDiamondInitAddress(event.target.value)}
                />
              </FormField>
              <FormField label="Init Calldata (hex, optional)" style={{ marginBottom: 0 }}>
                <Input
                  value={diamondInitCalldata}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => setDiamondInitCalldata(event.target.value)}
                  placeholder="0x"
                />
              </FormField>
            </Stack>
          ) : null}

          {actionPreset === "wallet-deploy" && (
            <WalletDeployForm
              ref={walletDeployFormRef}
              target={target}
              configAddresses={configAddresses}
              onOpenConfigAddressBook={(field) => {
                if (field === "wallet-authorizer" || field === "wallet-initializer") {
                  setConfigAddressBookOpen(field);
                  setAddressBookOpen(true);
                }
              }}
            />
          )}

          {(actionPreset === "custom" || actionPreset === "wallet-calibur-entry" || actionPreset === "auth-mta-function") && selectedFunction ? (
            <Stack gap="sm">
              <Text.Label>Function Inputs</Text.Label>
              {selectedFunction.inputs.length === 0 ? (
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
              )}
            </Stack>
          ) : null}

        {error ? (
          <div className="bb-banner bb-banner-warn" style={{ marginBottom: 0 }}>
            <span aria-hidden>⚠</span>
            <div>{error}</div>
            <span />
          </div>
        ) : null}

        <div className="bb-builder-actions">
          <button
            type="button"
            className="bb-btn-primary"
            disabled={disabled || loading}
            onClick={handleStageCall}
            data-testid="proposal-stage"
          >
            + Stage call
          </button>
        </div>
      </div>

      {/* Staged calls section */}
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
            <span>No staged calls yet. Add one above, or use a template.</span>
          </div>
        ) : (
          <div className="bb-staged-list">
            {stagedCalls.map((call, index) => (
              <div className="bb-staged-card" key={`${call.target}-${call.functionSignature}-${index}`}>
                <div className="bb-staged-num">#{index + 1}</div>
                <div className="bb-staged-body">
                  <div className="bb-staged-line-1">
                    <span className="bb-staged-target">{call.target.slice(0, 10)}…{call.target.slice(-6)}</span>
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
                      {call.argsPreview.map((a: ProposalCallArgPreview, ai) => (
                        <span key={`${a.name}-${ai}`} className="bb-staged-arg">
                          <span className="bb-staged-arg-name">{a.name}=</span>
                          <span className="bb-staged-arg-val">{a.display}</span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="bb-staged-line-2">
                      calldata {call.calldata.length > 18 ? `${call.calldata.slice(0, 12)}…${call.calldata.slice(-6)}` : call.calldata}
                    </div>
                  )}
                </div>
                <div className="bb-staged-actions">
                  <button
                    type="button"
                    className="bb-icon-btn-sm bb-danger"
                    aria-label="Remove staged call"
                    onClick={() =>
                      setStagedCalls((current) => current.filter((_, currentIndex) => currentIndex !== index))
                    }
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit footer */}
      <div className="bb-builder-foot">
        <span className="bb-muted bb-small bb-mono">
          {stagedCalls.length === 0 ? "No calls staged" : `${stagedCalls.length} call${stagedCalls.length === 1 ? "" : "s"} ready`}
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className="bb-btn-ghost"
            disabled={loading}
            onClick={() => {
              setDescription("");
              setTarget("");
              setTargetSelectionLabel(null);
              setGovernanceUintValue("");
              setGovernanceAddressValue("");
              setRoleAccountAddress("");
              setWalletAddressValue("");
              setWalletNonceValue("");
              setDiamondFacetAddress("");
              setDiamondSelector("");
              setDiamondCutAction("0");
              setDiamondInitAddress("");
              setDiamondInitCalldata("");
              setValuesByParam({});
              setStagedCalls([]);
              setError(null);
              nativeTransferFormRef.current?.reset();
              tokenTransferFormRef.current?.reset();
              walletDeployFormRef.current?.reset();
            }}
          >
            Reset
          </button>
          <button
            type="button"
            className="bb-btn-primary"
            disabled={disabled || loading}
            onClick={() => void handleSubmitProposal()}
            data-testid="proposal-submit"
          >
            {loading ? <span className="bb-spinner bb-sm" /> : null}
            {loading ? "Submitting…" : `Submit Proposal (${stagedCalls.length})`}
          </button>
        </div>
      </div>

      <TargetAddressBookModal
            isOpen={addressBookOpen}
            onClose={() => {
              setAddressBookOpen(false);
              setConfigAddressBookOpen(null);
            }}
            targetType={configAddressBookOpen ? "config" : currentTargetType}
            configFilter={
              configAddressBookOpen === "wallet-authorizer"
                ? "authorizer"
                : configAddressBookOpen === "wallet-initializer"
                  ? "initializer"
                  : actionPreset === "wallet-deploy"
                    ? "factory"
                    : null
            }
            chainId={chainId}
            governorAddress={governorAddress}
            timelockAddress={timelockAddress}
            userWalletAddresses={[]}
            timelockWalletAddresses={timelockWalletAddresses}
            vaultAddresses={vaultAddresses}
            configAddresses={configAddresses}
            loadingUserWallets={false}
            loadingTimelockWallets={loadingTimelockWallets}
            loadingVaults={loadingVaults}
            onSelectAddress={(address, label) => {
              if (configAddressBookOpen === "wallet-authorizer") {
                walletDeployFormRef.current?.setAuthorizerAddress?.(address, label);
              } else if (configAddressBookOpen === "wallet-initializer") {
                walletDeployFormRef.current?.setInitializerAddress?.(address, label);
              } else {
                setTarget(address);
                setTargetSelectionLabel(label ?? "Address Book Selection");
              }
              setAddressBookOpen(false);
              setConfigAddressBookOpen(null);
            }}
          />
    </div>
  );
}
