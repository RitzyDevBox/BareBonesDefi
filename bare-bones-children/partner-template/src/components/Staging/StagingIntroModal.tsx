import { useEffect, useState } from "react";
import { Modal } from "../Modal/Modal";
import { ButtonPrimary } from "../Button/ButtonPrimary";
import { formatCountdown, useStagingResetTimer } from "../../hooks/useStagingResetTimer";

const SEEN_FLAG_KEY = "barebones-staging-intro-seen";

function hasSeenIntro(): boolean {
  try {
    return window.localStorage.getItem(SEEN_FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

function markIntroSeen(): void {
  try {
    window.localStorage.setItem(SEEN_FLAG_KEY, "1");
  } catch {
    // Storage disabled (Safari private mode etc.) — modal will reappear next
    // visit, which is mildly annoying but not broken.
  }
}

/** Greets first-time visitors to the staging deployment with the auto-faucet
 *  + 3h chain-reset facts. Only ever rendered on staging — on local dev or
 *  prod (none yet) it short-circuits to null. */
export function StagingIntroModal() {
  const { enabled, secondsUntilReset, intervalSeconds } = useStagingResetTimer();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    if (!hasSeenIntro()) setOpen(true);
  }, [enabled]);

  if (!enabled) return null;

  const handleClose = () => {
    markIntroSeen();
    setOpen(false);
  };

  const intervalHours = intervalSeconds ? Math.round(intervalSeconds / 3600) : 3;

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title="Welcome to BareBones staging"
      maxWidth={520}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-md)" }}>
        <p style={{ margin: 0, lineHeight: 1.5 }}>
          When you connect your wallet you&rsquo;ll be <strong>auto-faucetted</strong> with
          test ETH and mock tokens. If you ever notice you&rsquo;re short on tokens later,
          open the profile menu (top-right wallet badge) and trigger the faucet manually
          from there.
        </p>

        <div
          style={{
            border: "1px solid var(--colors-border)",
            borderRadius: "var(--radius-md)",
            background: "var(--colors-surface-2, var(--colors-surface))",
            padding: "var(--spacing-md)",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: "var(--colors-text-muted)",
            }}
          >
            Chain reset
          </span>
          <span style={{ lineHeight: 1.5 }}>
            The staging chain resets every <strong>{intervalHours} hours</strong> back to a
            clean post-deploy state. Next reset in{" "}
            <strong style={{ fontVariantNumeric: "tabular-nums" }}>
              {formatCountdown(secondsUntilReset)}
            </strong>
            .
          </span>
          <span style={{ fontSize: 13, color: "var(--colors-text-muted)", lineHeight: 1.5 }}>
            Your wallet&rsquo;s tracked nonce is preserved across resets, so you don&rsquo;t
            need to clear MetaMask&rsquo;s activity tab.
          </span>
        </div>

        <ButtonPrimary onClick={handleClose} fullWidth={false} style={{ alignSelf: "flex-end" }}>
          Got it
        </ButtonPrimary>
      </div>
    </Modal>
  );
}
