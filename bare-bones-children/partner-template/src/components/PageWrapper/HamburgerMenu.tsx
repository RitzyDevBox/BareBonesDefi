// components/Header/HamburgerMenu.tsx
import { useState } from "react";
import { ThemeToggle } from "../../themes/ThemeToggle";
import { Text } from "../Primitives/Text";
import { NAV_ITEMS } from "./navConfig";
import { useNavigate } from "react-router-dom";
import { shortAddress } from "../../utils/formatUtils";
import { Sheet } from "../Primitives/Sheet";
import { IconButton } from "../Button/IconButton";
import { CopyButton } from "../Button/Actions/CopyButton";

interface HamburgerMenuProps {
  account: string | null;
}

export function HamburgerMenu({ account }: HamburgerMenuProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <IconButton
        aria-label="Open menu"
        onClick={() => setOpen(true)}
        size="lg"
      >
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
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--spacing-xs)",
              }}
            >
              <Text.Body weight={600}>
                {shortAddress(account)}
              </Text.Body>

              <CopyButton value={account}/>
            </div>

            {/* Theme toggle */}
            <ThemeToggle />
          </div>
        )}

        {/* Navigation */}
        <div>
          {NAV_ITEMS.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                navigate(item.path);
                setOpen(false);
              }}
              style={{
                padding: "12px 0",
                cursor: "pointer",
              }}
            >
              <Text.Body weight={500}>{item.label}</Text.Body>
            </div>
          ))}
        </div>
      </Sheet>
    </>
  );
}
