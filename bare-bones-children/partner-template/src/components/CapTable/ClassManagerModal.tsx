// Manage share classes: see the existing classes and create a new one (Preferred, an
// option pool, a non-voting class, etc.). Create routes through MTA.execute → ShareToken.createClass.

import { useState } from "react";
import { createPortal } from "react-dom";
import type { CapClass, ClassParams } from "../../hooks/capTable/capTableTypes";
import { VestKind } from "../../hooks/capTable/capTableTypes";
import { bpsToX } from "./capTableHelpers";
import { defaultCommonClass, standardVestingClass } from "./capTableHelpers";

interface ClassManagerModalProps {
  classes: CapClass[];
  onClose: () => void;
  onCreateClass: (params: ClassParams) => Promise<unknown>;
}

export function ClassManagerModal({ classes, onClose, onCreateClass }: ClassManagerModalProps) {
  const [name, setName] = useState("");
  const [voteX, setVoteX] = useState("1"); // vote weight multiplier
  const [vesting, setVesting] = useState<"none" | "standard">("none");
  const [busy, setBusy] = useState(false);

  const voteWeightBps = Math.round(Number(voteX || "0") * 10000);
  const canSubmit = name.trim().length > 0 && voteWeightBps >= 0 && !busy;

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    try {
      const base = vesting === "standard" ? standardVestingClass(name.trim()) : defaultCommonClass(name.trim());
      await onCreateClass({ ...base, voteWeightBps });
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return createPortal(
    <div className="ct-modal-scrim" onClick={onClose}>
      <div className="ct-modal" onClick={(e) => e.stopPropagation()} data-testid="captable-class-modal">
        <div className="ct-modal-head">
          <span className="ct-modal-title">Share classes</span>
          <button className="ct-btn" style={{ height: 30 }} onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="ct-modal-body">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {classes.map((c) => (
              <div
                key={c.classId}
                style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--colors-border)" }}
              >
                <span style={{ fontWeight: 500 }}>{c.params.name}</span>
                <span className="ct-help">
                  {bpsToX(c.params.voteWeightBps)} vote · {c.params.vestKind === VestKind.None ? "no vesting" : "vesting"}
                </span>
              </div>
            ))}
          </div>

          <div className="ct-label" style={{ marginTop: 6 }}>Create a class</div>
          <div className="ct-field">
            <label className="ct-label">Name</label>
            <input
              className="ct-input"
              placeholder="e.g. Preferred Seed"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="captable-class-name"
            />
          </div>
          <div className="ct-field">
            <label className="ct-label">Vote weight (×)</label>
            <input
              className="ct-input"
              inputMode="decimal"
              value={voteX}
              onChange={(e) => setVoteX(e.target.value.replace(/[^\d.]/g, ""))}
              data-testid="captable-class-vote"
            />
          </div>
          <div className="ct-field">
            <label className="ct-label">Vesting</label>
            <select className="ct-select" value={vesting} onChange={(e) => setVesting(e.target.value as "none" | "standard")}>
              <option value="none">None (fully vested)</option>
              <option value="standard">Standard (1-yr cliff / 4-yr)</option>
            </select>
          </div>
        </div>
        <div className="ct-modal-foot">
          <button className="ct-btn" onClick={onClose}>
            Cancel
          </button>
          <button className="ct-btn ct-btn-primary" disabled={!canSubmit} onClick={submit} data-testid="captable-class-submit">
            {busy ? "Creating…" : "Create class"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
