// Two-step "Enable lending" workflow. Enabling an org for the market is two MTA-gated transactions:
//   1. setShareToken(slug, shareToken) — point the market at the org's cap table (so it can read
//      balances + know which ShareToken to lock against).
//   2. ShareToken.setLocker(market, true) — allow the market to lock/seize collateral (the pledge
//      on list, and the seize on foreclosure).
// Shown as a StepTimeline so the second signature isn't a mystery mid-flow.
import { useState } from "react";
import { Modal } from "./lendingShared";
import { I } from "./lendingIcons";
import { StepTimeline, type TimelineStep } from "../StepTimeline/StepTimeline";
import type { UseLendingAdmin } from "../../hooks/lending/useLendingAdmin";

export function EnableLendingModal({
  admin, orgName, onClose,
}: {
  admin: UseLendingAdmin; orgName: string; onClose: () => void;
}) {
  // step: 0 = before register, 1 = register done / before lock, 2 = both done
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(false);
  const [failed, setFailed] = useState(false);

  const steps: TimelineStep[] = [
    {
      key: "register",
      label: "Register cap table",
      sub: "setShareToken — point the market at this org's ShareToken",
      state: step > 0 ? "done" : running ? "active" : "pending",
    },
    {
      key: "lock",
      label: "Allow collateral lock",
      sub: "setLocker — let the market lock shares on a pledge & seize them on default",
      state: step > 1 ? "done" : step === 1 && running ? "active" : "pending",
    },
  ];

  const run = async () => {
    setRunning(true);
    setFailed(false);
    try {
      if (step < 1) {
        const ok1 = await admin.registerCapTable();
        if (!ok1) { setFailed(true); setRunning(false); return; }
        setStep(1);
      }
      const ok2 = await admin.allowCollateralLock();
      if (!ok2) { setFailed(true); setRunning(false); return; }
      setStep(2);
      setRunning(false);
    } catch {
      setFailed(true);
      setRunning(false);
    }
  };

  const done = step >= 2;
  // An on-chain check failure (RPC down, wrong chain, ABI/selector mismatch) is NOT the same as a
  // genuinely-missing cap table — show the real reason for the former so it isn't misdiagnosed.
  const checkError = !admin.checking && admin.error ? admin.error : null;
  // Can't enable lending without a cap table to point the market at. When the org has no resolvable
  // ShareToken, `registerCapTable` would no-op (no tx, no wallet prompt) — so block it up front with a
  // clear reason instead of a phantom "rejected" failure.
  const noCapTable = !admin.checking && !admin.error && !admin.shareToken;
  const primaryLabel = done ? "Done" : failed ? "Retry" : step === 1 ? "Resume — sign step 2" : running ? "Confirm in wallet…" : "Enable — 2 signatures";

  return (
    <Modal title="Enable lending" onClose={onClose} width={480}>
      <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="muted small">
          One-time setup so <b style={{ color: "var(--text)" }}>{orgName}</b> can pledge shares as collateral. Two wallet signatures — both go through the org's MTA, so you must be a Super Admin.
        </div>
        {checkError ? (
          <div className="pay-banner pay-banner-warn" style={{ gridTemplateColumns: "auto 1fr" }}>
            <I.Alert size={14} />
            <div><b>Couldn't read lending status on-chain.</b> This isn't a missing cap table — the status check failed. Check that your wallet is on the right network, then retry. <span className="muted small" style={{ display: "block", marginTop: 4, wordBreak: "break-word" }}>{checkError}</span></div>
          </div>
        ) : noCapTable ? (
          <div className="pay-banner pay-banner-warn" style={{ gridTemplateColumns: "auto 1fr" }}>
            <I.Alert size={14} />
            <div><b>No cap table found for {orgName}.</b> Lending pledges shares from the org's ShareToken, so set up the <b>cap table</b> first (create a share class and issue shares on the Cap Table tab), then come back to enable lending. {admin.checking ? "" : "If you just created it, give the subgraph a few seconds to index and reopen this."}</div>
          </div>
        ) : (
          <>
            <StepTimeline steps={steps} testIdPrefix="enable-lending-step" />
            {failed && (
              <div className="pay-banner pay-banner-warn" style={{ gridTemplateColumns: "auto 1fr" }}>
                <I.Alert size={14} /><div>That step didn't complete (rejected or reverted). You can retry from where it stopped.</div>
              </div>
            )}
          </>
        )}
        {done && (
          <div className="pay-banner pay-banner-ok" style={{ gridTemplateColumns: "auto 1fr" }}>
            <I.CheckC size={14} /><div><b>Lending enabled.</b> {orgName} can now list collateral.</div>
          </div>
        )}
      </div>
      <div className="modal-foot">
        <button className="btn-ghost" onClick={onClose}>{done || noCapTable || checkError ? "Close" : "Cancel"}</button>
        {!done && !noCapTable && !checkError && (
          <button className="btn-primary" onClick={run} disabled={running}>
            <I.Lock size={14} /> {primaryLabel}
          </button>
        )}
      </div>
    </Modal>
  );
}
