// Transfer shares you hold to another wallet. `ShareToken.transfer` is sender-scoped, so
// this only ever moves the connected holder's own shares of a single class (subject to the
// class transfer lockup / gate, enforced on-chain).

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

  const validAddr = ethers.utils.isAddress(to);
  const validAmount = /^\d+$/.test(amount) && Number(amount) > 0 && Number(amount) <= holder.shares;
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
    <div className="ct-modal-scrim" onClick={onClose}>
      <div className="ct-modal" onClick={(e) => e.stopPropagation()} data-testid="captable-transfer-modal">
        <div className="ct-modal-head">
          <span className="ct-modal-title">Transfer shares</span>
          <button className="ct-btn" style={{ height: 30 }} onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="ct-modal-body">
          <div className="ct-help">
            You hold <b>{fmtShares(holder.shares)}</b> shares in this class.
          </div>
          <div className="ct-field">
            <label className="ct-label">Recipient address</label>
            <input
              className="ct-input"
              placeholder="0x…"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              data-testid="captable-transfer-to"
            />
          </div>
          <div className="ct-field">
            <label className="ct-label">Shares to transfer</label>
            <input
              className="ct-input"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
              data-testid="captable-transfer-amount"
            />
          </div>
        </div>
        <div className="ct-modal-foot">
          <button className="ct-btn" onClick={onClose}>
            Cancel
          </button>
          <button className="ct-btn ct-btn-primary" disabled={!canSubmit} onClick={submit} data-testid="captable-transfer-submit">
            {busy ? "Transferring…" : "Transfer"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
