import { CHAIN_INFO_MAP } from "../../constants/misc";
import { Select, SelectOption } from "../Select";


interface ChainSelectorProps {
  chainId: number | null;
  onChainChange: (chainId: number) => void;
}

export function ChainSelector({
  chainId,
  onChainChange,
}: ChainSelectorProps) {
  
  const selected = Object.values(CHAIN_INFO_MAP).find((c) => c.chainId === chainId) ?? null;

  return (
    <Select
      value={selected?.chainId ?? null}
      onChange={onChainChange}
      placeholder="Select chain"
      style={{ width: 180 }}
    >
      {Object.values(CHAIN_INFO_MAP).map((c) => (
        <SelectOption
          key={c.chainId}
          value={c.chainId}
          label={c.chainName}
        />
      ))}
    </Select>
  );
}
