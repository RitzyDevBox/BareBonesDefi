import { useEffect, useMemo, useState, useRef } from "react";
import { ethers } from "ethers";
import { Input } from "../BasicComponents";
import { FormField } from "../FormField/FormField";
import { AddressInput } from "../Inputs/AddressInput";
import { Bytes32Input } from "../Inputs/Bytes32Input";
import { NumberInput } from "../Inputs/NumberInput";
import { Uint256Input } from "../Inputs/Uint256Input";
import { Select, SelectOption } from "../Select";
import { Stack } from "../Primitives";
import { Text } from "../Primitives/Text";
import DAOGovernorABI from "../../abis/dao/DAOGovernor.abi.json";
import ERC20ABI from "../../abis/ERC20.json";
import CaliburEntryABI from "../../abis/diamond/facets/CaliburEntry.abi.json";
import DiamondCutFacetABI from "../../abis/diamond/facets/DiamondCutFacet.abi.json";
import { TargetAddressBookModal } from "./TargetAddressBookModal";
import { AddressBookInput } from "../Inputs/AddressBookInput";
import { useProposalAddressBook, type AddressBookTargetType } from "../../hooks/dao/useProposalAddressBook";
import { useDiamondFacets } from "../../hooks/diamond/useDiamondFacets";
import { useWalletProvider } from "../../hooks/useWalletProvider";
import { DEFAULT_BARE_BONES_CONFIG } from "../../constants/misc";
import type { ProposalBuildPayload, ProposalCall } from "./types";
import { NativeTransferForm, TokenTransferForm, WalletDeployForm } from "./ProposalForms";

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

const TOKEN_FUNCTIONS_INTERFACE = new ethers.utils.Interface(TOKEN_FUNCTIONS_ABI_OBJECT as any);
const GOVERNANCE_INTERFACE = new ethers.utils.Interface(DAOGovernorABI as any);
const CALIBUR_INTERFACE = new ethers.utils.Interface(CaliburEntryABI as any);
const DIAMOND_CUT_INTERFACE = new ethers.utils.Interface(DiamondCutFacetABI as any);
const TIMELOCK_ROLE_INTERFACE = new ethers.utils.Interface(TIMELOCK_ROLE_ABI_OBJECT as any);

const PROPOSER_ROLE_ID = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("PROPOSER_ROLE"));
const CANCELLER_ROLE_ID = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("CANCELLER_ROLE"));
const EXECUTOR_ROLE_ID = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("EXECUTOR_ROLE"));

type ActionGroup = "token" | "governance" | "smart-wallet" | "custom";

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
  | "custom";

const ACTION_GROUP_OPTIONS: Array<{ value: ActionGroup; label: string }> = [
  { value: "token", label: "Token & Currency Functions" },
  { value: "governance", label: "Governance Management" },
  { value: "smart-wallet", label: "Smart Wallet / Diamond" },
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
  if (["wallet-update-entry-point", "wallet-set-execution-authority-resolver", "wallet-invalidate-nonce", "wallet-diamond-cut", "wallet-calibur-entry"].includes(preset)) return "wallet";
  return "custom";
}

function defaultTargetForPreset(
  preset: ProposalActionPreset,
  params: { governorAddress: string; timelockAddress: string }
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
  return "";
}

function defaultTargetLabelForPreset(
  preset: ProposalActionPreset,
  params: { governorAddress: string; timelockAddress: string; target: string }
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

  return null;
}

function normalizeAbiCandidate(input: unknown): any[] {
  if (Array.isArray(input)) return input;
  if (input && typeof input === "object" && Array.isArray((input as any).abi)) {
    return (input as any).abi;
  }
  throw new Error("ABI must be a JSON array or an object with an abi array.");
}

function parseParam(type: string, value: string) {
  if (type.endsWith("[]") || type.includes("tuple")) {
    return JSON.parse(value);
  }

  if (type === "address") {
    return ethers.utils.getAddress(value.trim());
  }

  if (type === "bool") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
    throw new Error("Boolean value must be 'true' or 'false'.");
  }

  if (type.startsWith("uint") || type.startsWith("int")) {
    return ethers.BigNumber.from(value.trim());
  }

  if (type === "bytes32") {
    const normalized = value.trim();
    if (ethers.utils.isHexString(normalized, 32)) return normalized;
    if (normalized.length <= 32) return ethers.utils.formatBytes32String(normalized);
    throw new Error("bytes32 value too long.");
  }

  if (type.startsWith("bytes") && type !== "bytes") {
    if (!ethers.utils.isHexString(value.trim())) throw new Error("Bytes value must be hex.");
    return value.trim();
  }

  if (type === "bytes") {
    if (ethers.utils.isHexString(value.trim())) return value.trim();
    return ethers.utils.toUtf8Bytes(value);
  }

  return value;
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
  onSubmit: (payload: ProposalBuildPayload) => Promise<void> | void;
};

export function ProposalBuilder({ disabled = false, loading = false, governorAddress = "", onSubmit }: Props) {
  const { chainId, provider } = useWalletProvider();

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
      (actionPreset === "custom" || actionPreset === "wallet-calibur-entry") &&
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

    const defaultTarget = defaultTargetForPreset(preset, {
      governorAddress,
      timelockAddress,
    });

    if (defaultTarget) {
      setTarget(defaultTarget);
      setTargetSelectionLabel(
        defaultTargetLabelForPreset(preset, {
          governorAddress,
          timelockAddress,
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
    });

    if (!defaultTarget) return;

    if (!target) {
      setTarget(defaultTarget);
      setTargetSelectionLabel(
        defaultTargetLabelForPreset(actionPreset, {
          governorAddress,
          timelockAddress,
          target: defaultTarget,
        })
      );
    }
  }, [actionPreset, governorAddress, timelockAddress]);

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
      return parseParam(input.type, valuesByParam[key] ?? "");
    });

    const calldata = iface.encodeFunctionData(selectedFunction, argValues);

    return {
      target: encodedTarget,
      calldata,
      functionSignature: selectedFunction.format(),
      valueWei: "0",
    };
  }

  function handleStageCall() {
    setError(null);

    try {
      const nextCall = buildCallFromForm();
      setStagedCalls((current) => [...current, nextCall]);
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
            <Select value={actionGroup} onChange={(v) => handleChangeActionGroup(v as ActionGroup)}>
              {ACTION_GROUP_OPTIONS.map((option) => (
                <SelectOption key={option.value} value={option.value} label={option.label} />
              ))}
            </Select>
          </FormField>

          <FormField label="Action" style={{ marginBottom: 0 }}>
            <Select value={actionPreset} onChange={(v) => applyPreset(v as ProposalActionPreset)}>
              {(ACTION_OPTIONS[actionGroup] ?? []).map((option) => (
                <SelectOption key={option.value} value={option.value} label={option.label} />
              ))}
            </Select>
          </FormField>
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

        {(actionPreset === "custom" || actionPreset === "wallet-calibur-entry") ? (
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

          {(actionPreset === "custom" || actionPreset === "wallet-calibur-entry") && selectedFunction ? (
            <Stack gap="sm">
              {selectedFunction ? (
                <Stack gap="sm">
                  <Text.Label>Function Inputs</Text.Label>
                  {selectedFunction.inputs.length === 0 ? (
                    <Text.Body size="sm" color="muted">
                      No inputs for this function.
                    </Text.Body>
                  ) : (
                    selectedFunction.inputs.map((input, index) => {
                      const key = `${input.name || `arg${index}`}-${index}`;
                      const label = `${input.name || `arg${index}`} (${input.type})`;
                      const value = valuesByParam[key] ?? "";

                      if (input.type.startsWith("uint") || input.type.startsWith("int")) {
                        if (input.type.startsWith("uint")) {
                          return (
                            <FormField key={key} label={label} style={{ marginBottom: 0 }}>
                              <Uint256Input
                                value={value}
                                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                  setValuesByParam((current) => ({ ...current, [key]: event.target.value }))
                                }
                              />
                            </FormField>
                          );
                        }

                        return (
                          <FormField key={key} label={label} style={{ marginBottom: 0 }}>
                            <NumberInput
                              value={value}
                              allowDecimal={false}
                              allowNegative={input.type.startsWith("int")}
                              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                setValuesByParam((current) => ({ ...current, [key]: event.target.value }))
                              }
                            />
                          </FormField>
                        );
                      }

                      if (input.type === "bytes32") {
                        return (
                          <FormField key={key} label={label} style={{ marginBottom: 0 }}>
                            <Bytes32Input
                              value={value}
                              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                setValuesByParam((current) => ({ ...current, [key]: event.target.value }))
                              }
                            />
                          </FormField>
                        );
                      }

                      if (input.type === "address") {
                        return (
                          <FormField key={key} label={label} style={{ marginBottom: 0 }}>
                            <AddressInput
                              value={value}
                              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                setValuesByParam((current) => ({
                                  ...current,
                                  [key]: event.target.value,
                                }))
                              }
                            />
                          </FormField>
                        );
                      }

                      return (
                        <FormField key={key} label={label} style={{ marginBottom: 0 }}>
                          <Input
                            value={value}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                              setValuesByParam((current) => ({ ...current, [key]: event.target.value }))
                            }
                            placeholder={input.type === "bool" ? "true or false" : "Value"}
                          />
                        </FormField>
                      );
                    })
                  )}
                </Stack>
              ) : null}
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
                  <div className="bb-staged-line-2">
                    calldata {call.calldata.length > 18 ? `${call.calldata.slice(0, 12)}…${call.calldata.slice(-6)}` : call.calldata}
                  </div>
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
