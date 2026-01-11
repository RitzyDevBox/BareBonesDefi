import { useState } from "react";
import { TokenAmountDisplay } from "./TokenAmountDisplay";
import { TokenSelect } from "../TokenSelect/TokenSelect";
import { TokenAmountInfo, TokenInfo, TokenAmountDisplayFieldOptions } from "../TokenSelect/types";


interface TokenAmountFieldProps {
  value: TokenAmountInfo | null;
  onChange: (value: TokenAmountInfo) => void;
  chainId: number | null;
  options: TokenAmountDisplayFieldOptions;
}

export function TokenAmountField({
  value,
  onChange,
  chainId,
  options,
}: TokenAmountFieldProps) {
  const [open, setOpen] = useState(false);

  const token = value?.token ?? null;
  const amount = value?.amount ?? "";

  return (
    <>
      <TokenAmountDisplay
        token={token}
        amount={amount}
        options={options}
        onAmountChange={(nextAmount) => {
          onChange({
            token,
            amount: nextAmount,
          });
        }}
        onDefaultTokenSelect={(defaultToken) => {
          onChange({
            token: defaultToken,
            amount,
          });
        }}
        onTokenClick={() => setOpen(true)}
      />

      <TokenSelect
        isOpen={open}
        chainId={chainId}
        onClose={() => setOpen(false)}
        onSelect={(selectedToken: TokenInfo) => {
          onChange({
            token: selectedToken,
            amount,
          });
          setOpen(false);
        }}
      />
    </>
  );
}
