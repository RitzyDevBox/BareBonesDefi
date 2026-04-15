import { useEffect, useState, useImperativeHandle, forwardRef } from "react";
import * as ethers from "ethers";
import type { ProposalForm, ProposalFormPropsWithAddressBook } from "./types";
import type { ProposalCall } from "../types";
import { FormField } from "../../FormField/FormField";
import { Input } from "../../BasicComponents";
import { Stack } from "../../Primitives";
import { AddressBookInput } from "../../Inputs/AddressBookInput";
import { buildDiamondInitializerData } from "../../../utils/diamondDeployEncoding";

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

    const defaultAuthorizerAddress =
      configAddresses?.find((entry) => entry.label.toLowerCase().includes("owner authority resolver"))?.address ?? "";

    const defaultInitializerAddress =
      configAddresses?.find((entry) => entry.label.toLowerCase().includes("diamond kernel initializer"))?.address ?? "";

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
        return (
          target.trim() !== "" &&
          state.authorizerAddress.trim() !== "" &&
          ethers.utils.isAddress(state.authorizerAddress.trim())
        );
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

          const defaultInitializerOptions = buildSafeDefaultInitializerOptions(state.authorizerAddress);

          const calldata = DIAMOND_FACTORY_INTERFACE.encodeFunctionData("deployDiamond", [
            ethers.utils.getAddress(state.authorizerAddress.trim()),
            state.optionsBytes.trim() || "0x",
            state.initializerAddress.trim()
              ? ethers.utils.getAddress(state.initializerAddress.trim())
              : ethers.constants.AddressZero,
            state.initializerOptionsBytes.trim() || defaultInitializerOptions,
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

        <FormField label="Wallet Options (hex bytes, optional)" style={{ marginBottom: 0 }}>
          <Input
            value={state.optionsBytes}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              handleChange(state.authorizerAddress, event.target.value, state.initializerAddress, state.initializerOptionsBytes)
            }
            placeholder="0x"
          />
        </FormField>

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
          <Input
            value={state.initializerOptionsBytes}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              handleChange(state.authorizerAddress, state.optionsBytes, state.initializerAddress, event.target.value)
            }
            placeholder="0x"
          />
        </FormField>
      </Stack>
    );
  }
);

WalletDeployForm.displayName = "WalletDeployForm";
