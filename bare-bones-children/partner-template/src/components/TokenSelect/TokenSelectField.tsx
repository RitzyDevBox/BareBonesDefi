import { useState } from "react";
import { TokenSelect } from "./TokenSelect";
import { TokenPickerFieldOptions, TokenSelectFieldDisplay } from "./TokenSelectFieldDisplay";
import { TokenInfo } from "./types";

export function TokenSelectField({
  value,
  onChange,
  chainId,
  options,
}: {
  value?: TokenInfo | null;
  onChange: (tokenInfo: TokenInfo) => void;
  chainId: number;
  options: TokenPickerFieldOptions
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TokenSelectFieldDisplay
        token={value ?? null}
        onChangeClick={() => setOpen(true)}
        options={options}
      />

      <TokenSelect
        isOpen={open}
        chainId={chainId}
        onClose={() => setOpen(false)}
        onSelect={(token) => {
          onChange(token);
          setOpen(false);
        }}
      />
    </>
  );
}
