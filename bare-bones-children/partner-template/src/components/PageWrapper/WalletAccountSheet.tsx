import { useState } from "react";
import { Modal } from "../Modal/Modal";
import { Sheet } from "../Primitives/Sheet";
import { CHAIN_INFO_MAP } from "../../constants/misc";
import { ImageWithFallback } from "../ImageWithFallback";
import { CopyButton } from "../Button/Actions/CopyButton";
import { shortAddress } from "../../utils/formatUtils";
import { useActiveOrganization } from "../../providers/ActiveOrganizationProvider";
import { DaoAvatar } from "../Header/DaoAvatar";
import { ScreenSize, useMediaQuery } from "../../hooks/useMediaQuery";
import { buildExplorerAddressLink } from "../../utils/explorerLinks";
import { faucetAnvil } from "../../utils/faucetUtils";
import { toastStore } from "../Toasts/toast.store";
import { ToastBehavior, ToastPosition, ToastType } from "../Toasts/toast.types";
import { useApiAuth } from "../../hooks/useApiAuth";

interface WalletAccountSheetProps {
  open: boolean;
  onClose: () => void;
  account: string;
  chainId: number | null;
  onChainChange: (chainId: number) => void;
  showTestnets: boolean;
  onCreateOrganization: () => void;
  onDisconnect: () => void | Promise<void>;
}

type SubPicker = "none" | "chain" | "organization";

/**
 * Wallet "Connected" panel modeled on the design's WalletModal:
 *   Hero (avatar + address + chain dot)
 *   Network row     →  opens chain sub-picker
 *   Organization row →  opens org sub-picker
 *   View on explorer + Disconnect actions
 *
 * Renders as a centered Modal on tablet+ and a bottom Sheet on phone — both
 * keep the same content + interaction model. Sub-pickers (network / org)
 * stack on top using the same pattern.
 */
export function WalletAccountSheet({
  open,
  onClose,
  account,
  chainId,
  onChainChange,
  showTestnets,
  onCreateOrganization,
  onDisconnect,
}: WalletAccountSheetProps) {
  const screen = useMediaQuery({ phoneMax: 600 });
  const isPhone = screen === ScreenSize.Phone;

  const [subPicker, setSubPicker] = useState<SubPicker>("none");
  const [faucetBusy, setFaucetBusy] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [emailDraft, setEmailDraft] = useState("");

  const { activeOrgSlug, setActiveOrgSlug, accessibleOrgs, loadingOrgs } = useActiveOrganization();
  const { user, isSignedIn, loading: apiAuthLoading, signIn, signOut, setEmail } = useApiAuth();

  const allChains = Object.values(CHAIN_INFO_MAP);
  const visibleChains = showTestnets ? allChains : allChains.filter((c) => !c.testnet);
  const currentChain = chainId != null ? CHAIN_INFO_MAP[chainId] ?? null : null;
  const explorerBase = currentChain?.blockExplorerUrls?.[0];
  const explorerLink = explorerBase ? buildExplorerAddressLink(account, explorerBase) : null;

  function closeAll() {
    setSubPicker("none");
    onClose();
  }

  async function handleFaucet() {
    if (chainId == null || faucetBusy) return;
    setFaucetBusy(true);
    try {
      await faucetAnvil(account, chainId);
      toastStore.show({
        id: `faucet-${Date.now()}`,
        title: "Test ETH delivered",
        message: "Topped your account up to 100 ETH.",
        type: ToastType.Success,
        behavior: ToastBehavior.AutoClose,
        durationMs: 4000,
        position: ToastPosition.Top,
      });
    } catch (err) {
      toastStore.show({
        id: `faucet-err-${Date.now()}`,
        title: "Faucet failed",
        message: err instanceof Error ? err.message : "Unknown error",
        type: ToastType.Error,
        behavior: ToastBehavior.AutoClose,
        durationMs: 6000,
        position: ToastPosition.Top,
      });
    } finally {
      setFaucetBusy(false);
    }
  }

  const heroSection = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        padding: "10px 0 18px",
        gap: 12,
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background:
            "conic-gradient(from 210deg, #6b8cff, var(--bb-accent), #ff8fb3, #6b8cff)",
        }}
      />
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          fontFamily: "var(--bb-font-mono)",
          fontSize: 14,
          padding: "8px 12px",
          border: "1px solid var(--bb-line)",
          borderRadius: 8,
          background: "var(--bb-bg)",
        }}
      >
        <span>{shortAddress(account)}</span>
        <CopyButton value={account} ariaLabel="Copy address" />
      </div>
      {currentChain ? (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: "var(--bb-text-mute)",
            fontSize: 13,
            fontFamily: "var(--bb-font-mono)",
          }}
        >
          {currentChain.logoUrl ? (
            <ImageWithFallback
              src={currentChain.logoUrl}
              fallbackText={currentChain.chainName[0]}
              size={14}
            />
          ) : (
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "var(--bb-accent)",
              }}
            />
          )}
          <span>
            {currentChain.chainName}
            {currentChain.testnet ? " · testnet" : ""}
          </span>
        </div>
      ) : null}
    </div>
  );

  const summaryRow = (
    label: string,
    value: React.ReactNode,
    onClick: () => void,
    disabled?: boolean,
  ) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        width: "100%",
        padding: "12px 14px",
        border: "1px solid var(--bb-line)",
        borderRadius: 10,
        background: "var(--bb-bg-elev-2)",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.6 : 1,
        textAlign: "left",
        color: "var(--bb-text)",
        fontFamily: "inherit",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: 1 }}>
        <span
          className="bb-mono"
          style={{
            fontSize: 10,
            color: "var(--bb-text-mute)",
            textTransform: "uppercase",
            letterSpacing: ".12em",
          }}
        >
          {label}
        </span>
        <span style={{ fontSize: 14, fontWeight: 500, minWidth: 0 }}>{value}</span>
      </div>
      <span
        aria-hidden
        style={{
          color: "var(--bb-text-mute)",
          fontSize: 14,
          flexShrink: 0,
        }}
      >
        ›
      </span>
    </button>
  );

  const networkValue = currentChain ? (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      {currentChain.logoUrl ? (
        <ImageWithFallback
          src={currentChain.logoUrl}
          fallbackText={currentChain.chainName[0]}
          size={20}
        />
      ) : (
        <span
          style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: "var(--bb-accent)",
          }}
        />
      )}
      {currentChain.chainName}
    </span>
  ) : (
    <span style={{ color: "var(--bb-text-mute)" }}>Unknown</span>
  );

  const orgValue = activeOrgSlug ? (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>
      <DaoAvatar slug={activeOrgSlug} size={20} />
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {activeOrgSlug}
      </span>
    </span>
  ) : (
    <span style={{ color: "var(--bb-text-mute)" }}>No organization</span>
  );

  // Identity row — three states (see `identityRow` below):
  //   - not signed in: tap to start SIWE
  //   - signed in, display: shows email (or "Click to add email"); tap → edit
  //   - signed in, editing: inline input + Save / Cancel
  function startEditingEmail() {
    setEmailDraft(user?.email ?? "");
    setEditingEmail(true);
  }

  function cancelEditingEmail() {
    setEditingEmail(false);
    setEmailDraft("");
  }

  async function saveEmail() {
    const trimmed = emailDraft.trim();
    try {
      await setEmail(trimmed === "" ? null : trimmed);
      setEditingEmail(false);
      setEmailDraft("");
    } catch {
      toastStore.show({
        id: `email-err-${Date.now()}`,
        title: "Couldn't save email",
        message: "Check the address format and try again.",
        type: ToastType.Error,
        behavior: ToastBehavior.AutoClose,
        durationMs: 5000,
        position: ToastPosition.Top,
      });
    }
  }

  // Sub-styles for the inline-edit variant of the identity row. Built to
  // visually match `summaryRow` so the row looks like the existing Network /
  // Organization rows when not editing, and stays the same shape when it is.
  const identityEditRowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 12,
    width: "100%",
    padding: "10px 12px",
    border: "1px solid var(--bb-line)",
    borderRadius: 10,
    background: "var(--bb-bg-elev-2)",
  };

  const emailInputStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: "6px 8px",
    fontSize: 14,
    color: "var(--bb-text)",
    background: "var(--bb-bg)",
    border: "1px solid var(--bb-line)",
    borderRadius: 6,
    fontFamily: "inherit",
    outline: "none",
  };

  const identityRow: React.ReactNode = (() => {
    if (!isSignedIn) {
      return summaryRow(
        "Account",
        <span style={{ color: "var(--bb-text-mute)" }}>
          {apiAuthLoading ? "Signing in…" : "Sign in with wallet"}
        </span>,
        () => signIn(),
        apiAuthLoading,
      );
    }
    if (editingEmail) {
      return (
        <div style={identityEditRowStyle}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, flex: 1 }}>
            <span
              className="bb-mono"
              style={{
                fontSize: 10,
                color: "var(--bb-text-mute)",
                textTransform: "uppercase",
                letterSpacing: ".12em",
              }}
            >
              Email
            </span>
            <input
              type="email"
              autoFocus
              value={emailDraft}
              placeholder="you@example.com"
              onChange={(e) => setEmailDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void saveEmail();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  cancelEditingEmail();
                }
              }}
              disabled={apiAuthLoading}
              style={emailInputStyle}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
            <button
              type="button"
              className="bb-btn-ghost"
              onClick={() => void saveEmail()}
              disabled={apiAuthLoading}
              style={{ padding: "4px 10px", fontSize: 12 }}
            >
              Save
            </button>
            <button
              type="button"
              className="bb-btn-ghost"
              onClick={cancelEditingEmail}
              disabled={apiAuthLoading}
              style={{ padding: "4px 10px", fontSize: 12 }}
            >
              Cancel
            </button>
          </div>
        </div>
      );
    }
    return summaryRow(
      "Email",
      user?.email ? (
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {user.email}
        </span>
      ) : (
        <span style={{ color: "var(--bb-text-mute)" }}>Click to add email</span>
      ),
      startEditingEmail,
      apiAuthLoading,
    );
  })();

  const mainBody = (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {heroSection}

      {identityRow}
      {summaryRow("Network", networkValue, () => setSubPicker("chain"))}
      {summaryRow("Organization", orgValue, () => setSubPicker("organization"))}

      {currentChain?.testnet && (
        <button
          type="button"
          className="bb-btn-ghost"
          onClick={handleFaucet}
          disabled={faucetBusy}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          {faucetBusy ? "Topping up…" : "Get test ETH (100)"}
        </button>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 4 }}>
        {explorerLink ? (
          <a
            className="bb-btn-ghost"
            href={explorerLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{ justifyContent: "center", textDecoration: "none" }}
          >
            ↗ View on explorer
          </a>
        ) : (
          <button
            type="button"
            className="bb-btn-ghost"
            disabled
            style={{ justifyContent: "center" }}
            title="No block explorer for this network"
          >
            ↗ View on explorer
          </button>
        )}
        <button
          type="button"
          className="bb-btn-ghost"
          onClick={async () => {
            // Sign out of the API session at the same time as disconnecting
            // the wallet. The JWT is bound to this wallet anyway, so leaving
            // it in storage would just be stale.
            signOut();
            await onDisconnect();
            closeAll();
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            color: "var(--bb-error)",
            borderColor: "color-mix(in oklab, var(--bb-error) 40%, var(--bb-line))",
          }}
        >
          {/* Inline icon mirrors the design's I.Disconnect (door + outward arrow)
              instead of the U+23FB power glyph that tofu'd on most fonts. */}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9 12h12" />
            <path d="M17 8l4 4-4 4" />
            <path d="M13 4H5v16h8" />
          </svg>
          Disconnect
        </button>
      </div>
    </div>
  );

  const chainPickerBody = (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {visibleChains.length === 0 && (
        <div className="bb-stg-child-empty" style={{ margin: 0 }}>
          <span>No networks</span>
        </div>
      )}
      {visibleChains.map((c) => {
        const checked = c.chainId === chainId;
        return (
          <button
            key={c.chainId}
            role="menuitemradio"
            aria-checked={checked}
            className={`bb-dao-item${checked ? " bb-checked" : ""}`}
            onClick={() => {
              onChainChange(c.chainId);
              setSubPicker("none");
            }}
          >
            {c.logoUrl ? (
              <ImageWithFallback
                src={c.logoUrl}
                fallbackText={c.chainName[0]}
                size={26}
                style={{ flexShrink: 0 }}
              />
            ) : (
              <span
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  background: "var(--bb-line)",
                  flexShrink: 0,
                }}
              />
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
              <div className="bb-dao-item-name">{c.chainName}</div>
              <div className="bb-dao-item-sub">
                chain {c.chainId}
                {c.testnet ? " · testnet" : ""}
              </div>
            </div>
            <span className="bb-check">✓</span>
          </button>
        );
      })}
    </div>
  );

  const orgPickerBody = (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {!loadingOrgs && accessibleOrgs.length === 0 && (
        <div className="bb-stg-child-empty" style={{ margin: 0 }}>
          <span>No organizations yet — create one to get started.</span>
        </div>
      )}
      {accessibleOrgs.map((slug) => {
        const checked = slug === activeOrgSlug;
        return (
          <button
            key={slug}
            role="menuitemradio"
            aria-checked={checked}
            className={`bb-dao-item${checked ? " bb-checked" : ""}`}
            onClick={() => {
              setActiveOrgSlug(slug);
              setSubPicker("none");
            }}
          >
            <DaoAvatar slug={slug} size={26} />
            <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
              <div className="bb-dao-item-name">{slug}</div>
              <div className="bb-dao-item-sub">organization</div>
            </div>
            <span className="bb-check">✓</span>
          </button>
        );
      })}
      <button
        type="button"
        className="bb-dao-create"
        onClick={() => {
          setSubPicker("none");
          onCreateOrganization();
          onClose();
        }}
      >
        <span className="bb-dao-create-icon">+</span>
        <div style={{ minWidth: 0 }}>
          <div className="bb-dao-item-name">Create new DAO</div>
          <div className="bb-dao-item-sub bb-dao-item-sub-wrap">
            Deploy governor, timelock & token wiring — or just register an organization
          </div>
        </div>
      </button>
    </div>
  );

  // Adaptive container — Sheet on phone (slides from bottom), Modal on tablet+.
  function renderShell(
    isOpen: boolean,
    title: string,
    onCloseShell: () => void,
    body: React.ReactNode,
  ) {
    if (isPhone) {
      if (!isOpen) return null;
      return (
        <Sheet open={isOpen} onClose={onCloseShell} placement="bottom">
          <div style={{ marginBottom: 12, fontSize: 16, fontWeight: 500 }}>{title}</div>
          {body}
        </Sheet>
      );
    }
    return (
      <Modal isOpen={isOpen} onClose={onCloseShell} title={title} width={460}>
        {body}
      </Modal>
    );
  }

  return (
    <>
      {renderShell(
        open && subPicker === "none",
        "Connected wallet",
        closeAll,
        mainBody,
      )}
      {renderShell(
        open && subPicker === "chain",
        "Choose network",
        () => setSubPicker("none"),
        chainPickerBody,
      )}
      {renderShell(
        open && subPicker === "organization",
        "Choose organization",
        () => setSubPicker("none"),
        orgPickerBody,
      )}
    </>
  );
}
