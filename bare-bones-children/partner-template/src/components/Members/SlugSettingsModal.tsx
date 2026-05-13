import { useState } from "react";
import { SlugStatus } from "../../types/members";
import { MembersModal } from "./MembersModal";

interface SlugSettingsModalProps {
  status: SlugStatus;
  superAdmin: string;
  /** When false, the "Transfer to" input + submit button are hidden — only the
   *  current super admin can transfer the role (the contract enforces this
   *  too, but hiding the form keeps non-owners from filling out a doomed call). */
  canTransferSuperAdmin: boolean;
  onClose: () => void;
  onPause: () => void;
  onUnpause: () => void;
  onLock: () => void;
  onUnlock: () => void;
  onTransferSuperAdmin: (next: string) => void;
}

const ETH_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

const STATUS_DESC: Record<SlugStatus, string> = {
  [SlugStatus.Active]: "Permission checks run normally.",
  [SlugStatus.Paused]: "All execute() calls revert. Reversible by super admin.",
  [SlugStatus.Locked]: "Permanent freeze. Cannot be undone — only the super admin who locked the slug can ever unlock it, and only within the burn-the-bridges window.",
};

export function SlugSettingsModal({
  status, superAdmin, canTransferSuperAdmin,
  onClose, onPause, onUnpause, onLock, onUnlock, onTransferSuperAdmin,
}: SlugSettingsModalProps) {
  const [transferTo, setTransferTo] = useState("");
  const [confirmLock, setConfirmLock] = useState(false);

  const transferValid = ETH_ADDRESS_RE.test(transferTo.trim())
    && transferTo.trim().toLowerCase() !== superAdmin.toLowerCase();

  function submitTransfer() {
    if (!transferValid) return;
    onTransferSuperAdmin(transferTo.trim());
    setTransferTo("");
  }

  const footer = (
    <>
      <div className="bb-amw-foot-hint">
        Slug-level controls. Only the super admin can use these.
      </div>
      <div className="bb-amw-foot-actions">
        <button className="bb-btn-ghost bb-btn-xs" onClick={onClose}>Done</button>
      </div>
    </>
  );

  return (
    <MembersModal
      kicker="Slug settings"
      title="Authorizer controls"
      onClose={onClose}
      footer={footer}
    >
      <div className="bb-amw-body">
        <div className="bb-amw-section-head">Status</div>
        <div className="bb-amw-grid">
          <div className="bb-amw-field bb-full">
            <label>Current</label>
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "8px 12px",
              background: "var(--bb-surface-subtle)",
              border: "1px solid var(--bb-border)",
              borderRadius: 6,
              fontFamily: "var(--bb-font-mono)",
              fontSize: 13,
            }}>
              <span style={{ textTransform: "capitalize" }}>{status}</span>
              <span style={{ color: "var(--bb-text-mute)", fontSize: 11, fontFamily: "inherit" }}>
                — {STATUS_DESC[status]}
              </span>
            </div>
          </div>
        </div>

        <div className="bb-amw-grid" style={{ marginTop: 10 }}>
          <div className="bb-amw-field">
            <label>Pause / Unpause</label>
            {status === SlugStatus.Paused ? (
              <button
                className="bb-btn-primary bb-btn-xs"
                onClick={onUnpause}
                disabled={status !== SlugStatus.Paused}
              >
                Unpause
              </button>
            ) : (
              <button
                className="bb-btn-ghost bb-btn-xs"
                onClick={onPause}
                disabled={status !== SlugStatus.Active}
              >
                Pause
              </button>
            )}
          </div>
          <div className="bb-amw-field">
            <label>Lock / Unlock</label>
            {status === SlugStatus.Locked ? (
              <button
                className="bb-btn-ghost bb-btn-xs"
                onClick={onUnlock}
              >
                Attempt unlock
              </button>
            ) : (
              <>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, marginBottom: 4 }}>
                  <input
                    type="checkbox"
                    checked={confirmLock}
                    onChange={(e) => setConfirmLock(e.target.checked)}
                  />
                  I understand this is permanent
                </label>
                <button
                  className="bb-btn-ghost bb-btn-xs"
                  onClick={onLock}
                  disabled={!confirmLock || status !== SlugStatus.Active}
                  style={{ color: "var(--bb-error)" }}
                >
                  Lock slug
                </button>
              </>
            )}
          </div>
        </div>

        <div className="bb-amw-section-head">Super admin</div>
        <div className="bb-amw-grid">
          <div className="bb-amw-field bb-full">
            <label>Current</label>
            <input
              className="bb-amw-input bb-mono"
              value={superAdmin}
              readOnly
            />
          </div>
          {canTransferSuperAdmin ? (
            <div className="bb-amw-field bb-full">
              <label>Transfer to</label>
              <input
                className="bb-amw-input bb-mono"
                value={transferTo}
                onChange={(e) => setTransferTo(e.target.value)}
                placeholder="0x…"
              />
              <button
                className="bb-btn-primary bb-btn-xs"
                style={{ marginTop: 6 }}
                disabled={!transferValid}
                onClick={submitTransfer}
              >
                Transfer super admin
              </button>
              <div style={{ fontSize: 11, color: "var(--bb-text-mute)", marginTop: 4 }}>
                Atomic swap — the new address holds super admin role from the next block; the old address loses it.
              </div>
            </div>
          ) : (
            <div className="bb-amw-field bb-full">
              <div style={{ fontSize: 11, color: "var(--bb-text-mute)" }}>
                Only the current super admin can transfer this role.
              </div>
            </div>
          )}
        </div>
      </div>
    </MembersModal>
  );
}
