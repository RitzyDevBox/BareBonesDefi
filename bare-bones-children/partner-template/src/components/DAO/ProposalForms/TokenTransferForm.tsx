import { useState, useImperativeHandle, forwardRef } from "react";
import * as ethers from "ethers";
import type { ProposalForm, ProposalFormProps } from "./types";
import type { ProposalCall } from "../types";
import { FormField } from "../../FormField/FormField";
import { AddressInput } from "../../Inputs/AddressInput";
import { Uint256Input } from "../../Inputs/Uint256Input";
import { Stack } from "../../Primitives";

const TOKEN_FUNCTIONS_ABI_OBJECT = [
  {
    type: "function",
    name: "transfer",
    inputs: [
      { name: "to", type: "address", internalType: "address" },
      { name: "amount", type: "uint256", internalType: "uint256" },
    ],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "nonpayable",
  },
];

const TOKEN_FUNCTIONS_INTERFACE = new ethers.utils.Interface(TOKEN_FUNCTIONS_ABI_OBJECT as any);

export interface TokenTransferFormRef extends ProposalForm {}

interface TokenTransferFormState {
  to: string;
  amount: string;
}

export const TokenTransferForm = forwardRef<TokenTransferFormRef, ProposalFormProps>(
  ({ target, onValidityChange }, ref) => {
    const [state, setState] = useState<TokenTransferFormState>({
      to: "",
      amount: "",
    });

    const isValid = () => {
      try {
        return (
          target.trim() !== "" &&
          state.to.trim() !== "" &&
          state.amount.trim() !== "" &&
          ethers.utils.isAddress(state.to.trim())
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
          if (!state.to.trim()) throw new Error("Recipient address is required.");
          if (!state.amount.trim()) throw new Error("Amount is required.");

          const calldata = TOKEN_FUNCTIONS_INTERFACE.encodeFunctionData("transfer", [
            ethers.utils.getAddress(state.to.trim()),
            ethers.BigNumber.from(state.amount.trim()),
          ]);

          return {
            target: ethers.utils.getAddress(target.trim()),
            calldata,
            functionSignature: "transfer(address,uint256)",
            valueWei: "0",
          };
        },

        reset(): void {
          setState({ to: "", amount: "" });
          onValidityChange?.(false);
        },

        isValid,
      }),
      [target, state, onValidityChange]
    );

    const handleChange = (to: string, amount: string) => {
      const newState = { to, amount };
      setState(newState);
      onValidityChange?.(
        target.trim() !== "" &&
          newState.to.trim() !== "" &&
          newState.amount.trim() !== "" &&
          ethers.utils.isAddress(newState.to.trim())
      );
    };

    return (
      <Stack gap="sm">
        <FormField label="Recipient" style={{ marginBottom: 0 }}>
          <AddressInput
            value={state.to}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => handleChange(event.target.value, state.amount)}
          />
        </FormField>
        <FormField label="Amount (raw token units)" style={{ marginBottom: 0 }}>
          <Uint256Input
            value={state.amount}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => handleChange(state.to, event.target.value)}
          />
        </FormField>
      </Stack>
    );
  }
);

TokenTransferForm.displayName = "TokenTransferForm";
