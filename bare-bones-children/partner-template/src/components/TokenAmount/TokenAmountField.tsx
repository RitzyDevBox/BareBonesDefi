import { useState } from "react";
import { TokenAmountDisplay } from "./TokenAmountDisplay";
import { TokenSelect } from "../TokenSelect/TokenSelect";
import { TokenAmountInfo, TokenInfo, TokenPickerFieldOptions } from "../TokenSelect/types";


interface TokenAmountFieldProps {
  value: TokenAmountInfo | null;
  onChange: (value: TokenAmountInfo) => void;
  chainId: number;
  options: TokenPickerFieldOptions;
}

export function TokenAmountField({
  value,
  onChange,
  chainId,
  options,
}: TokenAmountFieldProps) {
  const [open, setOpen] = useState(false);

  const token = value ?? null;
  const amount = value?.amount ?? "";

  return (
    <>
      <TokenAmountDisplay
        token={token}
        amount={amount}
        userScope={options.userScope}
        onAmountChange={(nextAmount) => {
          if (!value) return;
          onChange({ ...value, amount: nextAmount });
        }}
        onTokenClick={() => setOpen(true)}
      />

      <TokenSelect
        isOpen={open}
        chainId={chainId}
        onClose={() => setOpen(false)}
        onSelect={(selectedToken: TokenInfo) => {
          onChange({
            ...selectedToken,
            amount,
          });
          setOpen(false);
        }}
      />
    </>
  );
}
