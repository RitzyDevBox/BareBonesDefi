import { CHAIN_INFO_MAP } from "../../constants/misc";
import { ImageWithFallback } from "../ImageWithFallback";
import { DropdownAlignment, Select, SelectOption } from "../Select";


interface ChainSelectorProps {
  chainId: number | null;
  onChainChange: (chainId: number) => void;
}

export function ChainSelector({
  chainId,
  onChainChange,
}: ChainSelectorProps) {
  const chains = Object.values(CHAIN_INFO_MAP);

  const isUnknownChain =
    chainId !== null && !CHAIN_INFO_MAP[chainId];

  return (
    <Select
      value={isUnknownChain ? null : chainId}
      onChange={onChainChange}
      placeholder="Select chain"
      style={{ width: 56 }}
      dropdownAlignment={DropdownAlignment.RIGHT}
      renderValue={(opt) => {
        // ----------------
        // Unknown chain
        // ----------------
        if (isUnknownChain) {
          return (
            <ImageWithFallback
              fallbackText="!"
              title="Unknown network"
            />
          );
        }

        if (!opt) return null;

        const { label, logoUrl } = opt.props as {
          label?: string;
          logoUrl?: string;
        };

        return (
          <ImageWithFallback
            src={logoUrl}
            fallbackText={label ?? "?"}
            title={label}
          />
        );
      }}
    >
      {chains.map((c) => (
        <SelectOption
          key={c.chainId}
          value={c.chainId}
          label={c.chainName}
          //logoUrl={c.logoUrl}
        />
      ))}
    </Select>
  );
}
