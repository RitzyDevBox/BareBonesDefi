import { useState } from "react";
import { Text } from "../BasicComponents";
import { Row, ClickableSurface } from "../Primitives";
import { shortAddress } from "../../utils/formatUtils";
import { WalletSelectorModal } from "./WalletSelectorModal";
import { useMediaQuery, ScreenSize } from "../../hooks/useMediaQuery";
import { Tooltip } from "../Primitives/Tooltip";
import { WalletIcon } from "../../assets/icons/WalletIcon";

interface WalletSelectorModalWithDisplayProps {
  address: string;
  onSelect: (address: string, index: number) => void;
}

export function WalletSelectorModalWithDisplay({
  address,
  onSelect,
}: WalletSelectorModalWithDisplayProps) {
  const [open, setOpen] = useState(false);
  const screen = useMediaQuery();

  const isPhone = screen === ScreenSize.Phone;

  return (
    <>
      <ClickableSurface
        onClick={() => setOpen(true)}
        style={{
            padding: "var(--spacing-xs) var(--spacing-sm)",
            borderRadius: "var(--radius-md)",
        }}
        >
        <Tooltip content={address}>
            {isPhone ? (
            <WalletIcon />
            ) : (
            <Row align="center" gap="xs">
                <Text.Body
                style={{
                    fontSize: "0.75em",
                    color: "var(--colors-text-muted)",
                    whiteSpace: "nowrap",
                }}
                >
                Wallet:
                </Text.Body>

                <Text.Body
                style={{
                    fontSize: "0.8em",
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                }}
                >
                {shortAddress(address)}
                </Text.Body>
            </Row>
            )}
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
