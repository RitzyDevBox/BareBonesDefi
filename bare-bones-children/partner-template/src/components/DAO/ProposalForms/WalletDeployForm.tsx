import { useEffect, useState, useImperativeHandle, forwardRef } from "react";
import * as ethers from "ethers";
import type { ProposalForm, ProposalFormPropsWithAddressBook } from "./types";
import type { ProposalCall } from "../types";
import { FormField } from "../../FormField/FormField";
import { Stack } from "../../Primitives";
import { Text } from "../../Primitives/Text";
import { AddressBookInput } from "../../Inputs/AddressBookInput";
import { AddressInput } from "../../Inputs/AddressInput";
import { HexBytesInput } from "../../Inputs/HexBytesInput";
import { buildDiamondInitializerData } from "../../../utils/diamondDeployEncoding";

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const HEX_BYTES_REGEX = /^0x[0-9a-fA-F]*$/;

/** Encode `abi.encode(["address"], [addr])`, returning "" if `addr` isn't a valid address. */
function encodeAddressOptions(addr: string): string {
  const trimmed = addr.trim();
  if (!ADDRESS_REGEX.test(trimmed)) return "";
  const checksummed = ethers.utils.getAddress(trimmed);
  return ethers.utils.defaultAbiCoder.encode(["address"], [checksummed]);
}

/** Recover the address from a previously-encoded `abi.encode(["address"], [addr])` blob. */
function decodeAddressOptions(bytes: string): string {
  if (!bytes || !HEX_BYTES_REGEX.test(bytes) || bytes.length !== 66) return "";
  try {
    const [decoded] = ethers.utils.defaultAbiCoder.decode(["address"], bytes);
    return decoded as string;
  } catch {
    return "";
  }
}

/**
 * Coerce a HexBytesInput value to a hex bytes string. Hex passes through; any
 * other input is treated as UTF-8 text and encoded — same convention as the
 * `bytes` encoder in ProposalBuilder.tsx. Returns "" for empty input so callers
 * can decide whether to substitute a default ("0x").
 */
function coerceBytesValue(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed === "") return "";
  if (ethers.utils.isHexString(trimmed)) return trimmed;
  return ethers.utils.hexlify(ethers.utils.toUtf8Bytes(trimmed));
}

const DIAMOND_FACTORY_ABI_OBJECT = [
  {
    type: "function",
    name: "deployDiamond",
    inputs: [
      { name: "defaultAuthorizer", type: "address", internalType: "address" },
      { name: "options", type: "bytes", internalType: "bytes" },
      { name: "initializer", type: "address", internalType: "address" },
      { name: "initializerOptions", type: "bytes", internalType: "bytes" },
    ],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "nonpayable",
  },
];

const DIAMOND_FACTORY_INTERFACE = new ethers.utils.Interface(DIAMOND_FACTORY_ABI_OBJECT as any);

export interface WalletDeployFormRef extends ProposalForm {
  setAuthorizerAddress: (address: string, label?: string) => void;
  setInitializerAddress: (address: string, label?: string) => void;
}

interface WalletDeployFormState {
  authorizerAddress: string;
  optionsBytes: string;
  initializerAddress: string;
  initializerOptionsBytes: string;
}

function buildSafeDefaultInitializerOptions(authorizerAddress: string): string {
  if (!authorizerAddress.trim() || !ethers.utils.isAddress(authorizerAddress.trim())) {
    return "";
  }

  return buildDiamondInitializerData({
    authorityResolverAddress: authorizerAddress.trim(),
  });
}

export const WalletDeployForm = forwardRef<WalletDeployFormRef, ProposalFormPropsWithAddressBook>(
  ({ target, onValidityChange, onOpenConfigAddressBook, configAddresses }, ref) => {
    const [state, setState] = useState<WalletDeployFormState>({
      authorizerAddress: "",
      optionsBytes: "",
      initializerAddress: "",
      initializerOptionsBytes: "",
    });
    const [authorizerSelectionLabel, setAuthorizerSelectionLabel] = useState<string | null>(null);
    const [initializerSelectionLabel, setInitializerSelectionLabel] = useState<string | null>(null);
    // Raw user keystrokes for the wallet-owner address (when OwnerAuthorityResolver
    // is selected). Has to live separately from `optionsBytes` because encoding to
    // `abi.encode(["address"], [...])` only succeeds for a complete 42-char
    // address — if we encoded on every keystroke and re-derived the displayed
    // value from the bytes, partial input would be wiped on each character.
    const [walletOwnerInput, setWalletOwnerInput] = useState("");

    const ownerAuthorityResolverAddress =
      configAddresses?.find((entry) => entry.label.toLowerCase().includes("owner authority resolver"))?.address ?? "";

    const defaultAuthorizerAddress = ownerAuthorityResolverAddress;

    // The wallet-options bytes is forwarded to the chosen authorizer's `initialize(diamond, data)`.
    // For OwnerAuthorityResolver that data is `abi.encode(address)` — the wallet's owner — so
    // when that resolver is selected we render an AddressInput and ABI-encode behind the scenes
    // instead of asking the user to paste pre-encoded bytes.
    const isOwnerAuthorityResolverSelected =
      ownerAuthorityResolverAddress !== "" &&
      state.authorizerAddress.trim().toLowerCase() === ownerAuthorityResolverAddress.toLowerCase();

    // When the user switches AUTHORIZER (e.g. between OwnerAuthorityResolver and
    // some other resolver) we should re-seed the input from whatever's already
    // encoded in optionsBytes, so the user sees the same value rendered as a
    // typeable address.
    useEffect(() => {
      if (!isOwnerAuthorityResolverSelected) return;
      const decoded = decodeAddressOptions(state.optionsBytes);
      if (decoded && decoded !== walletOwnerInput) {
        setWalletOwnerInput(decoded);
      }
    }, [isOwnerAuthorityResolverSelected]);


    // Address-book entry registered by useProposalAddressBook is "Wallet Kernel Initializer"
    // (see src/hooks/dao/useProposalAddressBook.ts). Match on "kernel initializer" so this
    // stays robust if the label gets renamed slightly.
    const defaultInitializerAddress =
      configAddresses?.find((entry) => entry.label.toLowerCase().includes("kernel initializer"))?.address ?? "";

    useEffect(() => {
      if (!defaultAuthorizerAddress || state.authorizerAddress) return;
      setState((prev) => ({
        ...prev,
        authorizerAddress: defaultAuthorizerAddress,
        initializerOptionsBytes:
          prev.initializerOptionsBytes || buildSafeDefaultInitializerOptions(defaultAuthorizerAddress),
      }));
      const defaultLabel = configAddresses?.find(
        (entry) => entry.address.toLowerCase() === defaultAuthorizerAddress.toLowerCase()
      )?.label;
      if (defaultLabel) setAuthorizerSelectionLabel(defaultLabel);
    }, [defaultAuthorizerAddress, configAddresses]);

    useEffect(() => {
      if (!defaultInitializerAddress || state.initializerAddress) return;
      setState((prev) => ({ ...prev, initializerAddress: defaultInitializerAddress }));
      const defaultLabel = configAddresses?.find(
        (entry) => entry.address.toLowerCase() === defaultInitializerAddress.toLowerCase()
      )?.label;
      if (defaultLabel) setInitializerSelectionLabel(defaultLabel);
    }, [defaultInitializerAddress, configAddresses]);

    const isValid = () => {
      try {
        if (target.trim() === "") return false;
        if (state.authorizerAddress.trim() === "") return false;
        if (!ethers.utils.isAddress(state.authorizerAddress.trim())) return false;
        // When OwnerAuthorityResolver is the authorizer, the options bytes ARE the
        // encoded wallet owner — must be a valid address.
        if (isOwnerAuthorityResolverSelected && !ADDRESS_REGEX.test(walletOwnerInput.trim())) {
          return false;
        }
        return true;
      } catch {
        return false;
      }
    };

    useImperativeHandle(
      ref,
      () => ({
        buildCall(): ProposalCall {
          if (!target.trim()) throw new Error("Target contract address is required.");
          if (!state.authorizerAddress.trim()) throw new Error("Default authorizer address is required.");
          if (!ethers.utils.isAddress(state.authorizerAddress.trim())) {
            throw new Error("Default authorizer must be a valid 0x address.");
          }
          // When OwnerAuthorityResolver is the authorizer, the options bytes ARE the
          // ABI-encoded wallet owner address. Reject empty / invalid here so staging
          // can't slip past the form's local `isValid` (which the parent doesn't gate
          // the Stage button on).
          if (isOwnerAuthorityResolverSelected) {
            const ownerAddr = decodeAddressOptions(state.optionsBytes);
            if (!ADDRESS_REGEX.test(ownerAddr)) {
              throw new Error("Wallet owner is required and must be a valid 0x address.");
            }
          }

          const defaultInitializerOptions = buildSafeDefaultInitializerOptions(state.authorizerAddress);
          // For OwnerAuthorityResolver path, optionsBytes is already an
          // ABI-encoded address (hex). Otherwise, the HexBytesInput value may
          // be hex or UTF-8 — coerce to hex bytes either way.
          const optionsBytesEncoded = isOwnerAuthorityResolverSelected
            ? (state.optionsBytes.trim() || "0x")
            : (coerceBytesValue(state.optionsBytes) || "0x");
          const initializerOptionsEncoded =
            coerceBytesValue(state.initializerOptionsBytes) || defaultInitializerOptions;

          const calldata = DIAMOND_FACTORY_INTERFACE.encodeFunctionData("deployDiamond", [
            ethers.utils.getAddress(state.authorizerAddress.trim()),
            optionsBytesEncoded,
            state.initializerAddress.trim()
              ? ethers.utils.getAddress(state.initializerAddress.trim())
              : ethers.constants.AddressZero,
            initializerOptionsEncoded,
          ]);

          return {
            target: ethers.utils.getAddress(target.trim()),
            calldata,
            functionSignature: "deployDiamond(address,bytes,address,bytes)",
            valueWei: "0",
          };
        },

        reset(): void {
          setState({
            authorizerAddress: defaultAuthorizerAddress,
            optionsBytes: "",
            initializerAddress: defaultInitializerAddress,
            initializerOptionsBytes: buildSafeDefaultInitializerOptions(defaultAuthorizerAddress),
          });
          const defaultAuthorizerLabel = configAddresses?.find(
            (entry) => entry.address.toLowerCase() === defaultAuthorizerAddress.toLowerCase()
          )?.label;
          setAuthorizerSelectionLabel(defaultAuthorizerLabel ?? null);
          const defaultLabel = configAddresses?.find(
            (entry) => entry.address.toLowerCase() === defaultInitializerAddress.toLowerCase()
          )?.label;
          setInitializerSelectionLabel(defaultLabel ?? null);
          onValidityChange?.(false);
        },

        setAuthorizerAddress(address: string, label?: string): void {
          setState((prev) => {
            const previousDefault = buildSafeDefaultInitializerOptions(prev.authorizerAddress);
            const shouldSyncInitializerOptions =
              !prev.initializerOptionsBytes || prev.initializerOptionsBytes === previousDefault;

            return {
              ...prev,
              authorizerAddress: address,
              initializerOptionsBytes: shouldSyncInitializerOptions
                ? buildSafeDefaultInitializerOptions(address)
                : prev.initializerOptionsBytes,
            };
          });
          setAuthorizerSelectionLabel(label ?? null);
          onValidityChange?.(
            target.trim() !== "" && address.trim() !== "" && ethers.utils.isAddress(address.trim())
          );
        },

        setInitializerAddress(address: string, label?: string): void {
          setState((prev) => ({ ...prev, initializerAddress: address }));
          setInitializerSelectionLabel(label ?? null);
        },

        isValid,
      }),
      [target, state, onValidityChange, defaultAuthorizerAddress, defaultInitializerAddress, configAddresses]
    );

    const handleChange = (
      authorizerAddress: string,
      optionsBytes: string,
      initializerAddress: string,
      initializerOptionsBytes: string
    ) => {
      const authorizerChanged = authorizerAddress !== state.authorizerAddress;
      const previousDefault = buildSafeDefaultInitializerOptions(state.authorizerAddress);
      const shouldSyncInitializerOptions =
        authorizerChanged && (!state.initializerOptionsBytes || state.initializerOptionsBytes === previousDefault);

      const newState = {
        authorizerAddress,
        optionsBytes,
        initializerAddress,
        initializerOptionsBytes: shouldSyncInitializerOptions
          ? buildSafeDefaultInitializerOptions(authorizerAddress)
          : initializerOptionsBytes,
      };
      setState(newState);
      onValidityChange?.(
        target.trim() !== "" &&
          newState.authorizerAddress.trim() !== "" &&
          ethers.utils.isAddress(newState.authorizerAddress.trim())
      );
    };

    return (
      <Stack gap="sm">
        <FormField label="Default Authorizer Address" style={{ marginBottom: 0 }}>
          <AddressBookInput
            value={state.authorizerAddress}
            selectedLabel={authorizerSelectionLabel}
            onClearSelection={() => {
              setAuthorizerSelectionLabel(null);
              handleChange("", state.optionsBytes, state.initializerAddress, state.initializerOptionsBytes);
            }}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              setAuthorizerSelectionLabel(null);
              handleChange(event.target.value, state.optionsBytes, state.initializerAddress, state.initializerOptionsBytes);
            }}
            onOpenBook={() => onOpenConfigAddressBook?.("wallet-authorizer")}
          />
        </FormField>

        {isOwnerAuthorityResolverSelected ? (
          <FormField label="Wallet Owner" style={{ marginBottom: 0 }}>
            <AddressInput
              value={walletOwnerInput}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                const next = event.target.value;
                setWalletOwnerInput(next);
                // Encode into optionsBytes only once the input is a complete
                // valid address; otherwise leave it empty so buildCall fails
                // fast. The display value comes from `walletOwnerInput`, not
                // from re-decoding optionsBytes — that's what was wiping the
                // user's keystrokes before.
                handleChange(
                  state.authorizerAddress,
                  ADDRESS_REGEX.test(next.trim()) ? encodeAddressOptions(next) : "",
                  state.initializerAddress,
                  state.initializerOptionsBytes,
                );
              }}
            />
            {/* AddressInput already sanitizes keystrokes to hex-only and caps length at
                42 chars, so there's no truly-invalid character state to flag while typing.
                Just show muted helper / completion hints; submission is gated by
                `isValid()` (full 42-char regex) and `buildCall()` throws otherwise. */}
            {walletOwnerInput.trim() === "" ? (
              <Text.Body size="xs" color="muted">
                The Owner Authority Resolver authorizes this address as the wallet owner.
              </Text.Body>
            ) : !ADDRESS_REGEX.test(walletOwnerInput.trim()) ? (
              <Text.Body size="xs" color="muted">
                {`Keep typing — ${42 - walletOwnerInput.trim().length} chars to go.`}
              </Text.Body>
            ) : null}
          </FormField>
        ) : (
          <FormField label="Wallet Options (hex bytes, optional)" style={{ marginBottom: 0 }}>
            <HexBytesInput
              value={state.optionsBytes}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                handleChange(
                  state.authorizerAddress,
                  event.target.value,
                  state.initializerAddress,
                  state.initializerOptionsBytes,
                )
              }
            />
          </FormField>
        )}

        <FormField label="Initializer Address (optional)" style={{ marginBottom: 0 }}>
          <AddressBookInput
            value={state.initializerAddress}
            selectedLabel={initializerSelectionLabel}
            onClearSelection={() => {
              setInitializerSelectionLabel(null);
              handleChange(state.authorizerAddress, state.optionsBytes, "", state.initializerOptionsBytes);
            }}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              setInitializerSelectionLabel(null);
              handleChange(state.authorizerAddress, state.optionsBytes, event.target.value, state.initializerOptionsBytes);
            }}
            onOpenBook={() => onOpenConfigAddressBook?.("wallet-initializer")}
          />
        </FormField>
        <FormField label="Initializer Options (hex bytes, optional)" style={{ marginBottom: 0 }}>
          <HexBytesInput
            value={state.initializerOptionsBytes}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              handleChange(state.authorizerAddress, state.optionsBytes, state.initializerAddress, event.target.value)
            }
          />
        </FormField>
      </Stack>
    );
  }
);

WalletDeployForm.displayName = "WalletDeployForm";
