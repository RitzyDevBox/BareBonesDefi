// components/Header/HamburgerMenu.tsx
import { useState } from "react";
import { ThemeToggle } from "../../themes/ThemeToggle";
import { Text } from "../Primitives/Text";
import { NAV_ITEMS } from "./navConfig";
import { useNavigate } from "react-router-dom";
import { shortAddress } from "../../utils/formatUtils";
import { Sheet } from "../Primitives/Sheet";
import { IconButton } from "../Button/IconButton";

interface HamburgerMenuProps {
  account: string | null;
}

function CopyIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export function HamburgerMenu({ account }: HamburgerMenuProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const copyAddress = async () => {
    if (!account) return;
    await navigator.clipboard.writeText(account);
  };

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
            {/* Address + copy */}
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

              <IconButton
                aria-label="Copy address"
                onClick={copyAddress}
                size="sm"
                shape="circle"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--colors-text-muted)",
                }}
              >
                <CopyIcon />
              </IconButton>
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
