import { useState } from "react";
import { Text } from "../Primitives/Text";
import { NAV_ITEMS } from "./navConfig";
import { useNavigate } from "react-router-dom";
import { shortAddress } from "../../utils/formatUtils";
import { Sheet } from "../Primitives/Sheet";
import { IconButton } from "../Button/IconButton";
import { SmallButton } from "../Button/ButtonSmall";
import { CopyButton } from "../Button/Actions/CopyButton";
import { SettingsModal } from "../Settings/SettingsModal";

interface HamburgerMenuProps {
  account: string | null;
  showTestnets: boolean;
  onToggleTestnets: () => void;
}

export function HamburgerMenu({ account, showTestnets, onToggleTestnets }: HamburgerMenuProps) {
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <IconButton aria-label="Open menu" onClick={() => setOpen(true)} size="lg">
        ☰
      </IconButton>

      <Sheet placement="bottom" open={open} onClose={() => setOpen(false)}>
        {account && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-xs)" }}>
              <Text.Body weight={600}>{shortAddress(account)}</Text.Body>
              <CopyButton value={account} />
            </div>

            <SmallButton onClick={() => { setOpen(false); setSettingsOpen(true); }}>
              ⚙ Settings
            </SmallButton>
          </div>
        )}

        {!account && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
            <SmallButton onClick={() => { setOpen(false); setSettingsOpen(true); }}>
              ⚙ Settings
            </SmallButton>
          </div>
        )}

        <div>
          {NAV_ITEMS.map((item) => (
            <div
              key={item.id}
              onClick={() => { navigate(item.path); setOpen(false); }}
              style={{ padding: "12px 0", cursor: "pointer" }}
            >
              <Text.Body weight={500}>{item.label}</Text.Body>
            </div>
          ))}
        </div>
      </Sheet>

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        showTestnets={showTestnets}
        onToggleTestnets={onToggleTestnets}
      />
    </>
  );
}
