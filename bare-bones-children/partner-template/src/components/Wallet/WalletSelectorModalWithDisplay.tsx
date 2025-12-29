import { useState } from "react";
import { Box, Text } from "../BasicComponents";
import { shortAddress } from "../../utils/formatUtils";
import { WalletSelectorModal } from "./WalletSelectorModal";

interface WalletSelectorModalWithDisplayProps {
  address: string;
  onSelect: (address: string, index: number) => void;
}

export function WalletSelectorModalWithDisplay({
  address,
  onSelect,
}: WalletSelectorModalWithDisplayProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Display */}
      <Box
        onClick={() => setOpen(true)}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          cursor: "pointer",
          padding: "var(--spacing-sm)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--colors-border)",
          background: "var(--colors-surface)",
        }}
      >
        <Text.Label>Wallet</Text.Label>
        <Text.Body
          style={{
            fontSize: "0.75em",
            color: "var(--colors-text-muted)",
            margin: 0,
          }}
        >
          {shortAddress(address)}
        </Text.Body>
      </Box>

      {/* Modal */}
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
