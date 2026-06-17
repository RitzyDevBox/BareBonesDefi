// Fundraising — record a post-money SAFE. This logs the instrument on the Convertibles
// singleton (via MTA.execute); it converts into shares later at a priced round (that flow
// is not built yet — see CAPTABLE.md). Investor + amount + cap + discount.

import { useState } from "react";
import { createPortal } from "react-dom";
import { isHexAddress, normalizeAddress } from "../../utils/address";
import type { CapClass } from "../../hooks/capTable/capTableTypes";

interface RaiseModalProps {
  classes: CapClass[];
  onClose: () => void;
  onRecordSafe: (
    investor: string,
    principal: string,
    cap: string,
    discountBps: number,
    targetClassId: number,
  ) => Promise<unknown>;
}

export function RaiseModal({ classes, onClose, onRecordSafe }: RaiseModalProps) {
  const targetable = classes.filter((c) => !c.isPool);
  const [investor, setInvestor] = useState("");
  const [principal, setPrincipal] = useState("");
  const [cap, setCap] = useState("");
  const [discountPct, setDiscountPct] = useState("0");
  const [targetClassId, setTargetClassId] = useState<number>(targetable[0]?.classId ?? 0);
  const [busy, setBusy] = useState(false);

  const validAddr = isHexAddress(investor);
  const validNums = /^\d+$/.test(principal) && Number(principal) > 0 && /^\d+$/.test(cap) && Number(cap) > 0;
  const canSubmit = validAddr && validNums && !busy;

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    try {
      const discountBps = Math.round(Number(discountPct || "0") * 100);
      await onRecordSafe(normalizeAddress(investor), principal, cap, discountBps, targetClassId);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return createPortal(
    <div className="ct-modal-scrim" onClick={onClose}>
      <div className="ct-modal" onClick={(e) => e.stopPropagation()} data-testid="captable-raise-modal">
        <div className="ct-modal-head">
          <span className="ct-modal-title">Record a SAFE</span>
          <button className="ct-btn" style={{ height: 30 }} onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="ct-modal-body">
          <div className="ct-help">
            Logs a post-money SAFE. It converts into shares later at a priced round.
          </div>
          <div className="ct-field">
            <label className="ct-label">Investor address</label>
            <input
              className="ct-input"
              placeholder="0x…"
              value={investor}
              onChange={(e) => setInvestor(e.target.value)}
              data-testid="captable-raise-investor"
            />
          </div>
          <div className="ct-field">
            <label className="ct-label">Principal (USD)</label>
            <input
              className="ct-input"
              inputMode="numeric"
              placeholder="e.g. 250000"
              value={principal}
              onChange={(e) => setPrincipal(e.target.value.replace(/[^\d]/g, ""))}
              data-testid="captable-raise-principal"
            />
          </div>
          <div className="ct-field">
            <label className="ct-label">Valuation cap (USD)</label>
            <input
              className="ct-input"
              inputMode="numeric"
              placeholder="e.g. 5000000"
              value={cap}
              onChange={(e) => setCap(e.target.value.replace(/[^\d]/g, ""))}
              data-testid="captable-raise-cap"
            />
          </div>
          <div className="ct-field">
            <label className="ct-label">Discount (%)</label>
            <input
              className="ct-input"
              inputMode="decimal"
              value={discountPct}
              onChange={(e) => setDiscountPct(e.target.value.replace(/[^\d.]/g, ""))}
            />
          </div>
          <div className="ct-field">
            <label className="ct-label">Converts into class</label>
            <select className="ct-select" value={targetClassId} onChange={(e) => setTargetClassId(Number(e.target.value))}>
              {targetable.map((c) => (
                <option key={c.classId} value={c.classId}>
                  {c.params.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="ct-modal-foot">
          <button className="ct-btn" onClick={onClose}>
            Cancel
          </button>
          <button className="ct-btn ct-btn-primary" disabled={!canSubmit} onClick={submit} data-testid="captable-raise-submit">
            {busy ? "Recording…" : "Record SAFE"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
