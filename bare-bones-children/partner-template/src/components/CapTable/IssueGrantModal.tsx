// Issue a grant (equity) to a person. Recipient can be picked from the org's member
// registry or entered as a raw address. The vesting schedule is a property of the chosen
// CLASS (see CAPTABLE.md), so this modal surfaces the class's vesting rather than asking
// for a per-grant schedule.

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ethers } from "ethers";
import type { CapClass, CapHolder } from "../../hooks/capTable/capTableTypes";
import type { Member } from "../../types/members";
import { vestSummary } from "./capTableHelpers";

interface IssueGrantModalProps {
  classes: CapClass[];
  members: Member[];
  prefill?: CapHolder | null;
  onClose: () => void;
  onIssue: (classId: number, to: string, amount: string) => Promise<unknown>;
}

export function IssueGrantModal({ classes, members, prefill, onClose, onIssue }: IssueGrantModalProps) {
  const issuableClasses = useMemo(() => classes.filter((c) => !c.isPool), [classes]);
  const [classId, setClassId] = useState<number>(prefill?.classId ?? issuableClasses[0]?.classId ?? 0);
  const [recipient, setRecipient] = useState<string>(prefill?.address ?? "");
  const [amount, setAmount] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const selectedClass = classes.find((c) => c.classId === classId);
  const validAddr = ethers.utils.isAddress(recipient);
  const validAmount = /^\d+$/.test(amount) && Number(amount) > 0;
  const canSubmit = validAddr && validAmount && !busy;

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    try {
      await onIssue(classId, ethers.utils.getAddress(recipient), amount);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return createPortal(
    <div className="ct-modal-scrim" onClick={onClose}>
      <div className="ct-modal" onClick={(e) => e.stopPropagation()} data-testid="captable-issue-modal">
        <div className="ct-modal-head">
          <span className="ct-modal-title">Issue grant</span>
          <button className="ct-btn" style={{ height: 30 }} onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="ct-modal-body">
          <div className="ct-field">
            <label className="ct-label">Recipient</label>
            <select
              className="ct-select"
              value={members.some((m) => m.wallet?.address?.toLowerCase() === recipient.toLowerCase()) ? recipient : ""}
              onChange={(e) => setRecipient(e.target.value)}
              data-testid="captable-issue-recipient-select"
            >
              <option value="">— pick a member or enter an address —</option>
              {members
                .filter((m) => m.wallet?.address)
                .map((m) => (
                  <option key={m.id} value={m.wallet.address}>
                    {m.name} ({String(m.accountType)})
                  </option>
                ))}
            </select>
            <input
              className="ct-input"
              placeholder="0x… wallet address"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              data-testid="captable-issue-recipient-input"
            />
            {recipient && !validAddr && <span className="ct-help" style={{ color: "var(--colors-error)" }}>Not a valid address</span>}
          </div>

          <div className="ct-field">
            <label className="ct-label">Class</label>
            <select
              className="ct-select"
              value={classId}
              onChange={(e) => setClassId(Number(e.target.value))}
              data-testid="captable-issue-class-select"
            >
              {issuableClasses.map((c) => (
                <option key={c.classId} value={c.classId}>
                  {c.params.name}
                </option>
              ))}
            </select>
            {selectedClass && (
              <span className="ct-help">
                Vesting: {vestSummary(selectedClass.params)} · vote {selectedClass.params.voteWeightBps / 10000}x
              </span>
            )}
          </div>

          <div className="ct-field">
            <label className="ct-label">Shares</label>
            <input
              className="ct-input"
              inputMode="numeric"
              placeholder="e.g. 100000"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
              data-testid="captable-issue-amount-input"
            />
          </div>
        </div>
        <div className="ct-modal-foot">
          <button className="ct-btn" onClick={onClose}>
            Cancel
          </button>
          <button className="ct-btn ct-btn-primary" disabled={!canSubmit} onClick={submit} data-testid="captable-issue-submit">
            {busy ? "Issuing…" : "Issue grant"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
