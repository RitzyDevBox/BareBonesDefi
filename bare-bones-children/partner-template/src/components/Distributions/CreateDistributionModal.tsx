// Create distribution — pick mode, target classes, set rate/pool, confirm & fund (MOCK).
// Ported 1:1 from Designs/Bare Bones/app/distributions-create.jsx. Mirrors
// create(slug, shareToken, classIds[], ratesPerShare[], amount).

import { useState } from "react";
import { I } from "./distIcons";
import {
  CAP_CLASSES,
  CAP_HOLDERS,
  classBasisLabel,
  classById,
  distClassBasis,
  distHolderPayout,
  fmtMoney,
  fmtRate,
  fmtShares,
  holderBasisShares,
  type DistMode,
  type Distribution,
} from "./distributionsMockData";

interface CreateDistributionModalProps {
  daoName?: string;
  onClose: () => void;
  onCreate: (draft: Partial<Distribution>) => void;
}

export function CreateDistributionModal({ daoName, onClose, onCreate }: CreateDistributionModalProps) {
  const [label, setLabel] = useState("");
  const [mode, setMode] = useState<DistMode>("prorata");
  const [classIds, setClassIds] = useState<string[]>(["common"]);
  const [pool, setPool] = useState("60000");
  const [rate, setRate] = useState("0.50");
  const token = "USDC"; // the org's single payment token (DistributionManager.paymentToken)

  // classes that actually have payable holders
  const payableClasses = CAP_CLASSES.filter((c) => distClassBasis(c.id) > 0);

  const toggleClass = (id: string) =>
    setClassIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const selectedBasis = classIds.reduce((s, cid) => s + distClassBasis(cid), 0);
  const poolN = Number(pool) || 0;
  const rateN = Number(rate) || 0;
  const derivedRate = mode === "prorata" ? (selectedBasis > 0 ? poolN / selectedBasis : 0) : rateN;
  const totalOut = mode === "prorata" ? poolN : rateN * selectedBasis;

  const eligible = CAP_HOLDERS.filter(
    (h) => classIds.includes(h.classId) && h.grantStatus === "Active" && holderBasisShares(h) > 0,
  ).sort((a, b) => holderBasisShares(b) - holderBasisShares(a));
  const previewDist: Distribution = {
    id: "preview",
    label: "",
    mode,
    classIds,
    token,
    pool: poolN,
    ratePerShare: rateN,
    status: "processing",
    recordDate: "",
    recordTime: "",
    paidHolderIds: [],
  };
  const topHolders = eligible.slice(0, 3);

  const amountOk = mode === "prorata" ? poolN > 0 : rateN > 0;
  const valid = classIds.length > 0 && selectedBasis > 0 && amountOk;
  const blockReason =
    classIds.length === 0
      ? "Pick at least one target class"
      : selectedBasis === 0
        ? "Selected classes have no payable holders"
        : !amountOk
          ? mode === "prorata"
            ? "Enter a pool amount"
            : "Enter a per-share rate"
          : null;

  const [funding, setFunding] = useState(false);
  const submit = () => {
    if (!valid) return;
    const fallback = `${classIds.map((id) => classById(id)?.name).join(" / ")} ${mode === "pershare" ? "Dividend" : "Distribution"}`;
    setFunding(true);
    setTimeout(() => {
      onCreate({
        label: label.trim() || fallback,
        mode,
        classIds,
        token,
        pool: mode === "prorata" ? poolN : Math.round(totalOut),
        ...(mode === "pershare" ? { ratePerShare: rateN } : {}),
      });
    }, 900);
  };

  return (
    <div className="modal-scrim dist-scope" onClick={onClose}>
      <div className="modal dist-create-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="modal-kicker">Distributions{daoName ? ` · ${daoName}` : ""}</div>
            <h3>New distribution</h3>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <I.X size={14} />
          </button>
        </div>

        <div className="dist-create-body">
          <div className="field full">
            <label>
              Name{" "}
              <span className="muted" style={{ textTransform: "none", letterSpacing: 0 }}>
                · optional
              </span>
            </label>
            <input className="input" placeholder="e.g. Q3 Profit Split" value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>

          {/* mode */}
          <div className="dist-field-block">
            <div className="dist-field-label">Mode</div>
            <div className="source-tiles">
              <button className={`source-tile${mode === "pershare" ? " active" : ""}`} onClick={() => setMode("pershare")}>
                <span className="source-tile-radio" />
                <span className="source-tile-k">
                  <span className="source-tile-name">Per-share dividend</span>
                  <span className="source-tile-sub">Set a fixed rate — each holder gets rate × their shares.</span>
                </span>
              </button>
              <button className={`source-tile${mode === "prorata" ? " active" : ""}`} onClick={() => setMode("prorata")}>
                <span className="source-tile-radio" />
                <span className="source-tile-k">
                  <span className="source-tile-name">Pro-rata split</span>
                  <span className="source-tile-sub">Fund a pool — we compute the per-share rate for you.</span>
                </span>
              </button>
            </div>
          </div>

          {/* target classes */}
          <div className="dist-field-block">
            <div className="dist-field-label">
              Target classes <span className="muted">· who gets paid</span>
            </div>
            <div className="dist-class-pick">
              {payableClasses.map((c) => {
                const on = classIds.includes(c.id);
                return (
                  <button key={c.id} className={`dist-class-opt${on ? " on" : ""}`} onClick={() => toggleClass(c.id)}>
                    <span className={`dist-check${on ? " on" : ""}`}>{on && <I.Check size={11} />}</span>
                    <span className="dist-class-opt-k">
                      <span className="dist-class-opt-name">
                        <span className="dist-chip-dot" style={{ background: c.color }} />
                        {c.name}
                      </span>
                      <span className="dist-class-opt-sub mono">
                        {classBasisLabel(c)} · {fmtShares(distClassBasis(c.id))} sh basis
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* rate / pool input */}
          <div className="dist-field-block">
            <div className="dist-field-label">{mode === "prorata" ? "Pool to distribute" : "Rate per share"}</div>
            {mode === "prorata" ? (
              <div className="input-with-unit">
                <input className="input mono" type="number" min="0" value={pool} onChange={(e) => setPool(e.target.value)} />
                <span className="input-unit">{token}</span>
              </div>
            ) : (
              <div className="input-with-unit">
                <input className="input mono" type="number" min="0" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} />
                <span className="input-unit">{token}/sh</span>
              </div>
            )}
            <div className="field-hint">
              {mode === "prorata" ? (
                <>
                  ≈ <b className="text mono">{fmtRate(derivedRate, token)}</b> across {fmtShares(selectedBasis)} basis shares
                </>
              ) : (
                <>
                  ≈ <b className="text mono">{fmtMoney(totalOut, token)}</b> total across {fmtShares(selectedBasis)} basis shares
                </>
              )}
            </div>
          </div>

          {/* live summary */}
          <div className="dist-summary">
            <div className="dist-summary-row">
              <span className="kicker">Total to distribute</span>
              <span className="dist-summary-v mono">{fmtMoney(totalOut, token)}</span>
            </div>
            <div className="dist-summary-row">
              <span className="kicker">Per-share rate</span>
              <span className="mono">{fmtRate(derivedRate, token)}</span>
            </div>
            <div className="dist-summary-row">
              <span className="kicker">Eligible holders</span>
              <span className="mono">{eligible.length}</span>
            </div>
            {topHolders.length > 0 && (
              <div className="dist-summary-top">
                <div className="kicker" style={{ marginBottom: 6 }}>
                  Top holders get
                </div>
                {topHolders.map((h) => (
                  <div key={h.id} className="dist-summary-holder">
                    <span className="dh-avatar sm" style={{ background: `oklch(0.7 0.12 ${h.avatarHue})` }}>
                      {h.initials}
                    </span>
                    <span className="dist-summary-holder-name">{h.name}</span>
                    <span className="mono muted small">{fmtShares(holderBasisShares(h))} sh</span>
                    <span className="mono">{fmtMoney(distHolderPayout(previewDist, h), token)}</span>
                  </div>
                ))}
                {eligible.length > topHolders.length && (
                  <div className="muted small" style={{ marginTop: 4 }}>
                    + {eligible.length - topHolders.length} more holder{eligible.length - topHolders.length === 1 ? "" : "s"}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="cd-note accent">
            <I.Info size={14} />
            <div>
              Confirming funds the pool ({token} approve + <span className="mono">create</span>), stamps the{" "}
              <b>record date</b>, and <b>locks</b> the targeted classes until every holder is paid.
            </div>
          </div>
        </div>

        <div className="modal-foot">
          {blockReason ? (
            <span className="muted small" style={{ marginRight: "auto", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <I.Info size={13} /> {blockReason}
            </span>
          ) : (
            <span className="muted small" style={{ marginRight: "auto" }} />
          )}
          <button className="btn-ghost btn-sm" onClick={onClose} disabled={funding}>
            Cancel
          </button>
          <button className="btn-primary btn-sm" disabled={!valid || funding} onClick={submit}>
            {funding ? (
              <>
                <span className="spinner sm" /> Funding…
              </>
            ) : (
              <>Fund {fmtMoney(totalOut, token)}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
