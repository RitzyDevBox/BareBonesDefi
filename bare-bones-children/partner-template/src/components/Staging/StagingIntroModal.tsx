import { useEffect, useState } from "react";
import { Modal } from "../Modal/Modal";
import { ButtonPrimary } from "../Button/ButtonPrimary";
import { formatCountdown, useStagingResetTimer } from "../../hooks/useStagingResetTimer";
import { DEPLOYMENT_TARGET, DeploymentTarget } from "../../config/deployment";

/** Imperatively (re-)open the intro from anywhere — e.g. the "Show demo
 *  intro again" row in SettingsModal. The mounted modal subscribes to this
 *  in a useEffect; calling it before the modal mounts is a no-op (which is
 *  fine — it's only ever invoked from inside the same React tree). */
let externalOpen: (() => void) | null = null;
export function showStagingIntro(): void {
  externalOpen?.();
}

/** True when this build is either local dev or the public staging deployment
 *  — i.e. the intro modal should mount. Live (production) explicitly skips it
 *  because the demo-warning copy would be wrong there. Exported so the
 *  Settings modal can match the same gate for its "Show again" row. */
export const IS_DEMO_ENV =
  DEPLOYMENT_TARGET === DeploymentTarget.Local
  || DEPLOYMENT_TARGET === DeploymentTarget.Staging;

/** Greets visitors to a non-production build (local or staging) with a
 *  strong demo-only / no-real-PII warning, the auto-faucet behavior, and
 *  (staging only) the chain-reset countdown. On live builds the modal
 *  short-circuits to null.
 *
 *  Open state is intentionally per-page-load (plain React state, no
 *  localStorage / sessionStorage). Dismissing applies only until the next
 *  full page load — refresh / new tab / returning later reshows the
 *  warning, so a returning visitor can never accidentally miss it.
 *  Switching browser tabs and coming back doesn't remount, so the dismiss
 *  is preserved within the session. */
export function StagingIntroModal() {
  const { enabled: stagingResetEnabled, secondsUntilReset, intervalSeconds } =
    useStagingResetTimer();
  // Initialize open=true on demo envs so the modal renders immediately on
  // first paint — using a useEffect to setOpen(true) caused a brief
  // post-mount flash where the modal was absent before the effect fired.
  const [open, setOpen] = useState(IS_DEMO_ENV);

  // Wire up the imperative reopen trigger while mounted. Component is mounted
  // once at the App level so this binding is global for the session.
  useEffect(() => {
    externalOpen = () => setOpen(true);
    return () => {
      externalOpen = null;
    };
  }, []);

  if (!IS_DEMO_ENV) return null;

  const handleClose = () => {
    setOpen(false);
  };

  const intervalHours = intervalSeconds ? Math.round(intervalSeconds / 3600) : 3;
  const envLabel =
    DEPLOYMENT_TARGET === DeploymentTarget.Staging ? "staging" : "local dev";

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title="Welcome to the BareBones demo"
      maxWidth={560}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-md)" }}>
        {/* Demo-environment warning. First thing in the modal because the
            Entity Formation wizard collects legal-name + address + phone
            PII — users must understand none of it will actually be filed
            with Wyoming SOS and nothing they enter should be real. */}
        <div
          style={{
            border: "1px solid #c47800",
            borderRadius: "var(--radius-md)",
            background: "rgba(196, 120, 0, 0.08)",
            padding: "var(--spacing-md)",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "#c47800",
            }}
          >
            Demo environment · {envLabel}
          </span>
          <span style={{ lineHeight: 1.5, fontWeight: 600 }}>
            This is a demo. No real Wyoming filings will be submitted, no
            registered-agent service will be ordered, and no payment is taken.
          </span>
          <span style={{ lineHeight: 1.5 }}>
            Do <strong>not</strong> enter real personal information &mdash;
            legal names, home addresses, phone numbers, or anything else you
            wouldn&rsquo;t paste into a public test form. Treat every field as
            if it were going on a screenshot.
          </span>
        </div>

        <p style={{ margin: 0, lineHeight: 1.5 }}>
          When you connect your wallet you&rsquo;ll be <strong>auto-faucetted</strong> with
          test ETH and mock tokens. If you ever notice you&rsquo;re short on tokens later,
          open the profile menu (top-right wallet badge) and trigger the faucet manually
          from there.
        </p>

        {stagingResetEnabled && (
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
        )}

        <ButtonPrimary onClick={handleClose} fullWidth={false} style={{ alignSelf: "flex-end" }}>
          Got it
        </ButtonPrimary>
      </div>
    </Modal>
  );
}
