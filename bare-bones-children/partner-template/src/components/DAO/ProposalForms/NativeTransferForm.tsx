import { useState, useImperativeHandle, forwardRef } from "react";
import * as ethers from "ethers";
import type { ProposalForm, ProposalFormProps } from "./types";
import type { ProposalCall } from "../types";
import { FormField } from "../../FormField/FormField";
import { Uint256Input } from "../../Inputs/Uint256Input";

export interface NativeTransferFormRef extends ProposalForm {}

interface NativeTransferFormState {
  nativeValueWei: string;
}

export const NativeTransferForm = forwardRef<
  NativeTransferFormRef,
  ProposalFormProps
>(({ target, onValidityChange }, ref) => {
  const [state, setState] = useState<NativeTransferFormState>({
    nativeValueWei: "",
  });

  const isValid = () => {
    return target.trim() !== "" && state.nativeValueWei.trim() !== "" && /^\d+$/.test(state.nativeValueWei.trim());
  };

  useImperativeHandle(
    ref,
    () => ({
      buildCall(): ProposalCall {
        if (!target.trim()) throw new Error("Target contract address is required.");
        if (!state.nativeValueWei.trim()) throw new Error("Native value (wei) is required.");
        if (!/^\d+$/.test(state.nativeValueWei.trim())) throw new Error("Native value must be a whole number.");

        return {
          target: ethers.utils.getAddress(target.trim()),
          calldata: "0x",
          functionSignature: "native transfer",
          valueWei: state.nativeValueWei.trim(),
        };
      },

      reset(): void {
        setState({ nativeValueWei: "" });
        onValidityChange?.(false);
      },

      isValid,
    }),
    [target, state, onValidityChange]
  );

  const handleChange = (nativeValueWei: string) => {
    setState({ nativeValueWei });
    onValidityChange?.(
      target.trim() !== "" && nativeValueWei.trim() !== "" && /^\d+$/.test(nativeValueWei.trim())
    );
  };

  return (
    <FormField label="Native Value (wei)" style={{ marginBottom: 0 }}>
      <Uint256Input
        value={state.nativeValueWei}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => handleChange(event.target.value)}
      />
    </FormField>
  );
});

NativeTransferForm.displayName = "NativeTransferForm";
