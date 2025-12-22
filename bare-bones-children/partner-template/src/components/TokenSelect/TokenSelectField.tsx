import { useState } from "react";
import { TokenSelect } from "./TokenSelect";
import { TokenSelectFieldDisplay } from "./TokenSelectFieldDisplay";
import { TokenInfo } from "./types";

export function TokenSelectField({
  value,
  onChange,
  chainId,
}: {
  value?: TokenInfo | null;
  onChange: (tokenInfo: TokenInfo) => void;
  chainId: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TokenSelectFieldDisplay
        token={value ?? null}
        onChangeClick={() => setOpen(true)}
      />

      <TokenSelect
        isOpen={open}
        chainId={chainId}
        onClose={() => setOpen(false)}
        onSelect={(token) => {
          onChange(token);   // ✅ TokenInfo directly
          setOpen(false);
        }}
      />
    </>
  );
}
