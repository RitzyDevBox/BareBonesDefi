import { useState } from "react";
import { ClickableSurface } from "../Primitives";
import { WalletSelectorModal } from "./WalletSelectorModal";
import { useMediaQuery, ScreenSize } from "../../hooks/useMediaQuery";
import { Tooltip } from "../Primitives/Tooltip";
import { WalletIcon } from "../../assets/icons/WalletIcon";
import { WalletAddressDisplay } from "./WalletAddressDisplay";

interface WalletSelectorModalWithDisplayProps {
  address: string;
  onSelect: (address: string, index: number) => void;
  isDisabled?: boolean;
}

export function WalletSelectorModalWithDisplay({
  address,
  onSelect,
  isDisabled = false,
}: WalletSelectorModalWithDisplayProps) {
  const [open, setOpen] = useState(false);
  const screen = useMediaQuery();

  const isPhone = screen === ScreenSize.Phone;

  return (
    <>
      <ClickableSurface
        onClick={() => {
          if (isDisabled) return;
          setOpen(true);
        }}
        style={{
          padding: "var(--spacing-xs) var(--spacing-sm)",
          borderRadius: "var(--radius-md)",
        }}
      >
        <Tooltip content={address}>
          {isPhone ? <WalletIcon /> : <WalletAddressDisplay address={address} />}
        </Tooltip>
      </ClickableSurface>

      <WalletSelectorModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onSelect={(addr, idx) => {
          onSelect(addr, idx);
          setOpen(false);
        }}
      />
    </>
  );
}
