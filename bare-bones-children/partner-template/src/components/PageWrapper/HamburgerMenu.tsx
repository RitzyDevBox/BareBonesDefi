// components/Header/HamburgerMenu.tsx
import { useState } from "react";
import { ThemeToggle } from "../../themes/ThemeToggle";
import { Text } from "../Primitives/Text";
import { NAV_ITEMS } from "./navConfig";
import { useNavigate } from "react-router-dom";
import { shortAddress } from "../../utils/formatUtils";
import { Sheet } from "../Primitives/Sheet";

interface HamburgerMenuProps {
  account: string | null;
}

export function HamburgerMenu({ account }: HamburgerMenuProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      {/* Hamburger button */}
      <button
        onClick={() => setOpen(true)}
        style={{
          background: "transparent",
          border: "none",
          padding: 8,
          cursor: "pointer",
        }}
        aria-label="Open menu"
      >
        ☰
      </button>

      <Sheet placement="bottom" open={open} onClose={() => setOpen(false)}>
        {/* Wallet status */}
        {account && (
          <Text.Body weight={600}>
            {shortAddress(account)}
          </Text.Body>
        )}

        {/* Theme */}
        <div style={{ marginTop: 12 }}>
          <ThemeToggle />
        </div>

        {/* Navigation */}
        <div style={{ marginTop: 24 }}>
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
