// Offboarding: clawback unvested shares (vested kept) or cancel the whole grant.
//
// Faithful port of the design's ClawbackModal (Designs/Bare Bones/app/captable-admin.jsx):
// the vested/unvested split visual, the legend, the clawback/cancel mode toggle, and the
// danger confirm action.

import { useState } from "react";
import { createPortal } from "react-dom";
import type { CapHolder } from "../../hooks/capTable/capTableTypes";
import { abbrevShares, fmtShares } from "./capTableHelpers";

interface ClawbackModalProps {
  holder: CapHolder;
  onClose: () => void;
  onClawback: () => Promise<unknown>; // clawback unvested
  onCancelGrant: () => Promise<unknown>; // cancel whole grant
}

type Mode = "clawback" | "cancel";

export function ClawbackModal({ holder, onClose, onClawback, onCancelGrant }: ClawbackModalProps) {
  const unvested = Math.max(0, holder.shares - holder.vested);
  const [mode, setMode] = useState<Mode>(unvested > 0 ? "clawback" : "cancel");
  const [busy, setBusy] = useState(false);

  const vp = holder.shares ? (holder.vested / holder.shares) * 100 : 0;
  const firstName = holder.name.split(" ")[0];

  async function confirm() {
    if (busy) return;
    setBusy(true);
    try {
      await (mode === "clawback" ? onClawback() : onCancelGrant());
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return createPortal(
    <div className="ig-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="ig-modal sm" data-testid="captable-clawback-modal">
        <div className="ig-head">
          <div>
            <div className="ig-kicker">Offboarding · {holder.name}</div>
            <h3>Clawback &amp; cancel</h3>
          </div>
          <button type="button" className="ig-close" onClick={onClose}>✕</button>
        </div>

        <div className="ig-form" style={{ maxHeight: "64vh" }}>
          {/* vested / unvested split */}
          <div className="cb-split">
            <div className="cb-split-seg" style={{ flexBasis: `${vp}%`, background: "var(--success)" }}>
              {vp > 12 ? "vested" : ""}
            </div>
            <div
              className="cb-split-seg"
              style={{ flexBasis: `${100 - vp}%`, background: "color-mix(in oklab, var(--error) 70%, var(--bg-elev-2))" }}
            >
              {100 - vp > 12 ? "unvested" : ""}
            </div>
          </div>

          <div className="cb-legend">
            <div className="cb-leg">
              <span className="cb-leg-k">
                <span className="cb-leg-dot" style={{ background: "var(--success)" }} />
                Vested · kept
              </span>
              <div className="cb-leg-v">{fmtShares(holder.vested)}</div>
              <div className="cb-leg-sub">stays with {firstName}</div>
            </div>
            <div className="cb-leg">
              <span className="cb-leg-k">
                <span className="cb-leg-dot" style={{ background: "var(--error)" }} />
                Unvested · returned
              </span>
              <div className="cb-leg-v">{fmtShares(unvested)}</div>
              <div className="cb-leg-sub">reclaimed to the register</div>
            </div>
          </div>

          <div className="cb-mode">
            <button
              type="button"
              className={`cb-mode-btn${mode === "clawback" ? " on" : ""}`}
              disabled={unvested === 0}
              style={{ opacity: unvested === 0 ? 0.4 : 1 }}
              onClick={() => setMode("clawback")}
              data-testid="captable-clawback-mode-clawback"
            >
              Clawback unvested
            </button>
            <button
              type="button"
              className={`cb-mode-btn danger${mode === "cancel" ? " on" : ""}`}
              onClick={() => setMode("cancel")}
              data-testid="captable-clawback-mode-cancel"
            >
              Cancel entire grant
            </button>
          </div>

          <div className="cd-note">
            <span>⚠</span>
            <span>
              {mode === "clawback" ? (
                <>
                  Reclaims the <b>{fmtShares(unvested)}</b> unvested shares; {firstName} keeps{" "}
                  <b>{fmtShares(holder.vested)}</b> vested.
                </>
              ) : (
                <>
                  Cancels the whole grant — all <b>{fmtShares(holder.shares)}</b> shares are reclaimed and the grant is
                  marked <b>Cancelled</b>.
                </>
              )}
            </span>
          </div>
        </div>

        <div className="ig-foot">
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--text-mute)" }}>
            Routes through governance
          </span>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button
              type="button"
              className="btn-ghost danger"
              disabled={busy}
              onClick={confirm}
              data-testid="captable-clawback-confirm"
            >
              {busy
                ? "Working…"
                : mode === "clawback"
                  ? `↩ Clawback ${abbrevShares(unvested)}`
                  : "🗑 Cancel grant"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
