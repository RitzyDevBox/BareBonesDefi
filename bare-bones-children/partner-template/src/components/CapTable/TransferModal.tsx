// Transfer shares you hold to another wallet. `ShareToken.transfer` is sender-scoped, so
// this only ever moves the connected holder's own shares of a single class (subject to the
// class transfer lockup / gate, enforced on-chain).
//
// Faithful port of the design's TransferModal (Designs/Bare Bones/app/captable-admin.jsx),
// simplified to a raw recipient address (no member registry).

import { useState } from "react";
import { createPortal } from "react-dom";
import { ethers } from "ethers";
import type { CapHolder } from "../../hooks/capTable/capTableTypes";
import { fmtShares } from "./capTableHelpers";

interface TransferModalProps {
  holder: CapHolder;
  onClose: () => void;
  onTransfer: (classId: number, to: string, amount: string) => Promise<unknown>;
}

export function TransferModal({ holder, onClose, onTransfer }: TransferModalProps) {
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  const amt = Number(amount) || 0;
  const validAddr = ethers.utils.isAddress(to);
  const validAmount = /^\d+$/.test(amount) && amt > 0 && amt <= holder.shares;
  const canSubmit = validAddr && validAmount && !busy;

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    try {
      await onTransfer(holder.classId, ethers.utils.getAddress(to), amount);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return createPortal(
    <div className="ig-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="ig-modal sm" data-testid="captable-transfer-modal">
        <div className="ig-head">
          <div>
            <div className="ig-kicker">Transfer</div>
            <h3>Transfer shares</h3>
          </div>
          <button type="button" className="ig-close" onClick={onClose}>✕</button>
        </div>

        <div className="ig-form" style={{ maxHeight: "64vh" }}>
          {/* holder summary */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 11,
              padding: "10px 12px",
              border: "1px solid var(--line)",
              borderRadius: 10,
              background: "var(--bg)",
            }}
          >
            <span
              className="m-avatar"
              style={{ width: 32, height: 32, fontSize: 12, background: `oklch(0.55 0.14 ${holder.avatarHue})` }}
              aria-hidden
            >
              {holder.initials}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500 }}>{holder.name}</div>
              <div style={{ fontSize: 11.5, color: "var(--text-mute)" }}>
                holds {fmtShares(holder.shares)} · {fmtShares(holder.vested)} vested
              </div>
            </div>
            <span style={{ color: "var(--text-mute)" }}>→</span>
          </div>

          <div className="field">
            <label className="ig-label">Recipient address</label>
            <input
              className="input mono"
              placeholder="0x…"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              data-testid="captable-transfer-to"
            />
            {to && !validAddr && (
              <span className="ig-recip-sub" style={{ color: "var(--error)", display: "block", marginTop: 4 }}>
                Not a valid address
              </span>
            )}
          </div>

          <div className="field">
            <label className="ig-label">Amount</label>
            <div className="input-with-unit">
              <input
                className="input mono"
                inputMode="numeric"
                placeholder="0"
                value={amount}
                onChange={(e) => {
                  const next = e.target.value.replace(/[^\d]/g, "");
                  const n = Number(next);
                  setAmount(next === "" ? "" : String(Math.min(n, holder.shares)));
                }}
                data-testid="captable-transfer-amount"
              />
              <span className="input-unit">of {fmtShares(holder.shares)}</span>
            </div>
            <input
              type="range"
              className="cts-slider"
              style={{ width: "100%", marginTop: 10 }}
              min={0}
              max={holder.shares}
              step={1}
              value={Math.min(amt, holder.shares)}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="cd-note">
            <span>ⓘ</span>
            <span>
              Vested shares transfer proportionally. The compliance (KYC) gate is <b>off</b> for v1; class transfer
              lockups are still enforced on-chain.
            </span>
          </div>
        </div>

        <div className="ig-foot">
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--text-mute)" }}>
            Routes through the share register
          </span>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button
              type="button"
              className="btn-primary"
              disabled={!canSubmit}
              style={{ opacity: canSubmit ? 1 : 0.5, cursor: canSubmit ? "pointer" : "not-allowed" }}
              onClick={submit}
              data-testid="captable-transfer-submit"
            >
              {busy ? "Transferring…" : "Transfer"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
