import { useState, useImperativeHandle, forwardRef } from "react";
import * as ethers from "ethers";
import type { ProposalForm, ProposalFormProps } from "./types";
import type { ProposalCall } from "../types";
import { FormField } from "../../FormField/FormField";
import { AddressInput } from "../../Inputs/AddressInput";
import { Uint256Input } from "../../Inputs/Uint256Input";
import { Stack } from "../../Primitives";

const SVR_FACTORY_ABI_OBJECT = [
  {
    type: "function",
    name: "createReserve",
    inputs: [
      { name: "owner", type: "address", internalType: "address" },
      { name: "withdrawDestination", type: "address", internalType: "address" },
      { name: "proposalDelay", type: "uint256", internalType: "uint256" },
      { name: "releaseDelay", type: "uint256", internalType: "uint256" },
      { name: "withdrawAddressChangeDelay", type: "uint256", internalType: "uint256" },
    ],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "nonpayable",
  },
];

const SVR_FACTORY_INTERFACE = new ethers.utils.Interface(SVR_FACTORY_ABI_OBJECT as any);

export interface VaultDeployFormRef extends ProposalForm {}

interface VaultDeployFormState {
  ownerAddress: string;
  withdrawAddress: string;
  proposalDelay: string;
  releaseDelay: string;
  withdrawAddressChangeDelay: string;
}

export const VaultDeployForm = forwardRef<VaultDeployFormRef, ProposalFormProps>(
  ({ target, onValidityChange }, ref) => {
    const [state, setState] = useState<VaultDeployFormState>({
      ownerAddress: "",
      withdrawAddress: "",
      proposalDelay: "",
      releaseDelay: "",
      withdrawAddressChangeDelay: "",
    });

    const isValid = () => {
      try {
        return (
          target.trim() !== "" &&
          state.ownerAddress.trim() !== "" &&
          state.withdrawAddress.trim() !== "" &&
          ethers.utils.isAddress(state.ownerAddress.trim()) &&
          ethers.utils.isAddress(state.withdrawAddress.trim())
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
          if (!state.ownerAddress.trim()) throw new Error("Vault owner address is required.");
          if (!state.withdrawAddress.trim()) throw new Error("Vault withdraw destination address is required.");

          const calldata = SVR_FACTORY_INTERFACE.encodeFunctionData("createReserve", [
            ethers.utils.getAddress(state.ownerAddress.trim()),
            ethers.utils.getAddress(state.withdrawAddress.trim()),
            ethers.BigNumber.from(state.proposalDelay.trim() || "0"),
            ethers.BigNumber.from(state.releaseDelay.trim() || "0"),
            ethers.BigNumber.from(state.withdrawAddressChangeDelay.trim() || "0"),
          ]);

          return {
            target: ethers.utils.getAddress(target.trim()),
            calldata,
            functionSignature: "createReserve(address,address,uint256,uint256,uint256)",
            valueWei: "0",
          };
        },

        reset(): void {
          setState({
            ownerAddress: "",
            withdrawAddress: "",
            proposalDelay: "",
            releaseDelay: "",
            withdrawAddressChangeDelay: "",
          });
          onValidityChange?.(false);
        },

        isValid,
      }),
      [target, state, onValidityChange]
    );

    const handleChange = (
      ownerAddress: string,
      withdrawAddress: string,
      proposalDelay: string,
      releaseDelay: string,
      withdrawAddressChangeDelay: string
    ) => {
      const newState = { ownerAddress, withdrawAddress, proposalDelay, releaseDelay, withdrawAddressChangeDelay };
      setState(newState);
      onValidityChange?.(
        target.trim() !== "" &&
          newState.ownerAddress.trim() !== "" &&
          newState.withdrawAddress.trim() !== "" &&
          ethers.utils.isAddress(newState.ownerAddress.trim()) &&
          ethers.utils.isAddress(newState.withdrawAddress.trim())
      );
    };

    return (
      <Stack gap="sm">
        <FormField label="Owner" style={{ marginBottom: 0 }}>
          <AddressInput
            value={state.ownerAddress}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              handleChange(event.target.value, state.withdrawAddress, state.proposalDelay, state.releaseDelay, state.withdrawAddressChangeDelay)
            }
          />
        </FormField>
        <FormField label="Withdraw Destination" style={{ marginBottom: 0 }}>
          <AddressInput
            value={state.withdrawAddress}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              handleChange(state.ownerAddress, event.target.value, state.proposalDelay, state.releaseDelay, state.withdrawAddressChangeDelay)
            }
          />
        </FormField>
        <FormField label="Default Proposal Delay" style={{ marginBottom: 0 }}>
          <Uint256Input
            value={state.proposalDelay}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              handleChange(state.ownerAddress, state.withdrawAddress, event.target.value, state.releaseDelay, state.withdrawAddressChangeDelay)
            }
          />
        </FormField>
        <FormField label="Default Release Delay" style={{ marginBottom: 0 }}>
          <Uint256Input
            value={state.releaseDelay}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              handleChange(state.ownerAddress, state.withdrawAddress, state.proposalDelay, event.target.value, state.withdrawAddressChangeDelay)
            }
          />
        </FormField>
        <FormField label="Default Withdraw Address Change Delay" style={{ marginBottom: 0 }}>
          <Uint256Input
            value={state.withdrawAddressChangeDelay}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              handleChange(state.ownerAddress, state.withdrawAddress, state.proposalDelay, state.releaseDelay, event.target.value)
            }
          />
        </FormField>
      </Stack>
    );
  }
);

VaultDeployForm.displayName = "VaultDeployForm";
