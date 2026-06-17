// Distributions — a second mode of the Payments surface, alongside Payroll.
// Ported 1:1 from Designs/Bare Bones/app/distributions.jsx. Pays shareholders by ownership.
//   List   : active (processing) runs hoisted as cards + historic table.
//   Detail : record date, pool, progress bar, "Process next batch", holder table, Reclaim / Cancel.
// Wrapped in `.dist-scope` so the design's generic class names don't collide with the app's globals.

import { useState } from "react";
import "../../styles/distributionsSurfaces.css";
import { I } from "./distIcons";
import { CreateDistributionModal } from "./CreateDistributionModal";
import { useDistributionData } from "../../hooks/distributions/useDistributionData";
import { useDistributionActions, type CreateStep } from "../../hooks/distributions/useDistributionActions";
import { useWalletProvider } from "../../hooks/useWalletProvider";
import {
  DIST_STATUS_TONE,
  DIST_STATUS_LABEL,
  classById,
  classBasisLabel,
  classWeightX,
  fmtWeightPct,
  holderRawShares,
  distClassNames,
  distEligibleHolders,
  distHolderCounts,
  distHolderPayout,
  distIsPaid,
  distPaidAmount,
  distRate,
  distTotalToDistribute,
  fmtMoney,
  fmtRate,
  fmtShares,
  shortHex,
  type CapClass,
  type CapHolder,
  type Distribution,
} from "./distributionsMockData";

interface DistributionsViewProps {
  slug: string;
  isAdmin: boolean;
  daoName?: string;
}

export function DistributionsView({ slug, isAdmin, daoName }: DistributionsViewProps) {
  const data = useDistributionData(slug);
  const { account } = useWalletProvider();
  const actions = useDistributionActions(slug, data.shareTokenAddress);
  const dists = data.distributions;
  const [openId, setOpenId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const createDist = async (
    draft: { classIds: string[]; rates: string[]; pool: string; label: string },
    onStep?: (s: CreateStep) => void,
  ) => {
    const ok = await actions.createDistribution(
      draft.classIds.map(Number),
      draft.rates,
      draft.pool,
      draft.label,
      onStep,
    );
    if (ok) {
      data.refresh();
      setCreateOpen(false);
    }
    return ok;
  };

  let body;
  if (openId) {
    const sel = dists.find((d) => d.id === openId);
    if (!sel) {
      setOpenId(null);
      return null;
    }
    body = (
      <DistributionDetail
        isAdmin={isAdmin}
        dist={sel}
        holders={data.holders}
        classes={data.classes}
        account={account}
        actions={actions}
        onRefresh={data.refresh}
        onBack={() => setOpenId(null)}
      />
    );
  } else {
    body = (
      <>
        <DistributionsList
          dists={dists}
          holders={data.holders}
          classes={data.classes}
          onOpen={setOpenId}
          onCreate={() => setCreateOpen(true)}
          isAdmin={isAdmin}
        />
        {createOpen && (
          <CreateDistributionModal
            daoName={daoName}
            classes={data.classes}
            holders={data.holders}
            onClose={() => setCreateOpen(false)}
            onCreate={createDist}
          />
        )}
      </>
    );
  }

  return <div className="dist-scope">{body}</div>;
}

// =================================================================
// List — active processing runs hoisted, historic table below
// =================================================================
function DistributionsList({
  dists,
  holders,
  classes,
  onOpen,
  onCreate,
  isAdmin,
}: {
  dists: Distribution[];
  holders: CapHolder[];
  classes: CapClass[];
  onOpen: (id: string) => void;
  onCreate: () => void;
  isAdmin: boolean;
}) {
  const active = dists.filter((d) => d.status === "processing");
  const historic = dists.filter((d) => d.status !== "processing");

  return (
    <>
      <div className="dist-intro">
        <div className="dist-intro-k">
          <span className="kicker">Distributions</span>
          <div className="dist-intro-title">Pay shareholders by ownership</div>
          <div className="muted small">
            A dividend, profit split, or return of capital — funded once, split across the targeted share classes,
            and pushed out automatically. No one has to claim.
          </div>
        </div>
        {isAdmin && (
          <button
            className="btn-primary btn-sm"
            onClick={onCreate}
            disabled={active.length > 0}
            title={active.length > 0 ? "Finish or cancel the in-progress distribution first (one per org at a time)." : undefined}
          >
            <I.Plus size={13} /> New distribution
          </button>
        )}
      </div>

      {active.length > 0 && (
        <div className="panel">
          <div className="panel-head">
            <span className="kicker">In progress</span>
            <span className="muted small">{active.length} processing · classes locked</span>
          </div>
          <div className="panel-body">
            <div className="prl-active-grid">
              {active.map((d) => (
                <DistributionActiveCard key={d.id} dist={d} holders={holders} classes={classes} onOpen={() => onOpen(d.id)} />
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="panel">
        <div className="panel-head">
          <span className="kicker">All distributions</span>
          <span className="muted small">{historic.length} closed</span>
        </div>
        <div className="dh-table panel-table dist-list-table" role="table" aria-label="Distributions">
          <div className="dh-head dist-list-head" role="row">
            <div className="dh-cell">Distribution</div>
            <div className="dh-cell">Record date</div>
            <div className="dh-cell">Classes</div>
            <div className="dh-cell dh-num">Amount</div>
            <div className="dh-cell">Status</div>
            <div className="dh-cell dh-go" aria-hidden />
          </div>
          {historic.length === 0 && (
            <div className="dh-empty">
              <div className="muted">No closed distributions yet.</div>
            </div>
          )}
          {historic.map((d) => {
            const tone = DIST_STATUS_TONE[d.status];
            return (
              <button key={d.id} className="dh-row dist-list-row" onClick={() => onOpen(d.id)} role="row">
                <div className="dh-cell">
                  <div className="dist-list-name">{d.label}</div>
                  <div className="muted small">{d.mode === "pershare" ? "Per-share dividend" : "Pro-rata split"}</div>
                </div>
                <div className="dh-cell mono small muted">{d.recordDate}</div>
                <div className="dh-cell">
                  <div className="dist-chips">
                    {d.classIds.map((cid) => (
                      <span key={cid} className="dist-chip">
                        <span className="dist-chip-dot" style={{ background: classById(classes, cid)?.color }} />
                        {classById(classes, cid)?.name}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="dh-cell dh-num mono">
                  {fmtMoney(d.status === "cancelled" ? d.pool : distTotalToDistribute(d, holders, classes), d.token)}
                </div>
                <div className="dh-cell">
                  <span className={`pay-status pay-status-${tone}`}>
                    <span className="pay-status-dot" />
                    {DIST_STATUS_LABEL[d.status]}
                  </span>
                </div>
                <div className="dh-cell dh-go">
                  <I.Arrow size={12} />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

function DistributionActiveCard({
  dist,
  holders,
  classes,
  onOpen,
}: {
  dist: Distribution;
  holders: CapHolder[];
  classes: CapClass[];
  onOpen: () => void;
}) {
  const { paid, total } = distHolderCounts(dist, holders, classes);
  const pct = total ? Math.round((paid / total) * 100) : 0;
  const paidAmt = distPaidAmount(dist, holders, classes);
  return (
    <button className="prl-active-card prl-tone-info" onClick={onOpen}>
      <div className="prl-active-top">
        <div>
          <div className="prl-active-cycle">{dist.label}</div>
          <div className="muted small">
            Record date · {dist.recordDate} · {dist.recordTime}
          </div>
        </div>
        <span className="pay-status pay-status-info">
          <span className="pay-status-dot" />
          Processing
        </span>
      </div>

      <div className="dist-progress-wrap">
        <div className="dist-progress">
          <div className="dist-progress-bar" style={{ width: `${pct}%` }} />
        </div>
        <div className="dist-progress-meta">
          <span className="mono">
            {paid} / {total} holders paid
          </span>
          <span className="mono">
            {fmtMoney(paidAmt, dist.token)} / {fmtMoney(distTotalToDistribute(dist, holders, classes), dist.token)}
          </span>
        </div>
      </div>

      <div className="prl-active-grid-meta">
        <div>
          <div className="kicker">Classes</div>
          <div className="dist-chips" style={{ marginTop: 4 }}>
            {dist.classIds.map((cid) => (
              <span key={cid} className="dist-chip">
                <span className="dist-chip-dot" style={{ background: classById(classes, cid)?.color }} />
                {classById(classes, cid)?.name}
              </span>
            ))}
          </div>
        </div>
        <div>
          <div className="kicker">{dist.mode === "pershare" ? "Rate" : "Pool"}</div>
          <div className="prl-active-v mono">
            {dist.mode === "pershare" ? fmtRate(distRate(dist, holders, classes), dist.token) : fmtMoney(dist.pool, dist.token)}
          </div>
        </div>
      </div>
      <div className="prl-active-cta">
        Process distribution <I.Arrow size={12} />
      </div>
    </button>
  );
}

// =================================================================
// Detail / process
// =================================================================
function DistributionDetail({
  isAdmin,
  dist,
  holders,
  classes,
  account,
  actions,
  onRefresh,
  onBack,
}: {
  isAdmin: boolean;
  dist: Distribution;
  holders: CapHolder[];
  classes: CapClass[];
  account: string | null;
  actions: ReturnType<typeof useDistributionActions>;
  onRefresh: () => void;
  onBack: () => void;
}) {
  const [processing, setProcessing] = useState(false);
  const eligible = distEligibleHolders(dist, holders, classes);
  const { paid, total } = distHolderCounts(dist, holders, classes);
  const pct = total ? Math.round((paid / total) * 100) : 0;
  const paidAmt = distPaidAmount(dist, holders, classes);
  const totalAmt = distTotalToDistribute(dist, holders, classes);
  const tone = DIST_STATUS_TONE[dist.status];
  const isProcessing = dist.status === "processing";
  const leftover = Math.max(0, dist.pool - totalAmt);

  const statusDesc = {
    processing: "Funded & paying out. Targeted classes are locked until every holder is paid.",
    done: "All holders paid. Classes auto-unlocked.",
    cancelled: "Cancelled — classes unlocked and the unpaid remainder refunded.",
  }[dist.status];

  const processNext = async () => {
    if (!isProcessing) return;
    setProcessing(true);
    try {
      const tx = await actions.processChunk(Number(dist.id), 50);
      if (tx) {
        await tx.wait?.();
        onRefresh();
      }
    } finally {
      setProcessing(false);
    }
  };

  const cancel = async () => {
    await actions.cancel(Number(dist.id));
    onRefresh();
  };
  // "Reclaim" now = withdraw the unspent pool from the org treasury back to the connected wallet
  // (the unspent funds never left the treasury, so it's a plain treasury withdrawal).
  const reclaim = async () => {
    await actions.withdraw(account!, String(leftover));
    onRefresh();
  };

  return (
    <>
      <div className="prl-detail-back">
        <button className="btn-ghost btn-sm" onClick={onBack}>
          <I.Arrow size={12} style={{ transform: "scaleX(-1)" }} /> All distributions
        </button>
        <span className="muted small">/ {dist.label}</span>
      </div>

      <div className={`pr-status-card pr-status-${tone}`}>
        <div className="pr-status-l">
          <div className="kicker">Record date</div>
          <div className="pr-status-cycle">{dist.recordDate}</div>
          <div className="muted small">{dist.recordTime} · payouts computed as of this instant</div>
        </div>
        <div className="pr-status-m">
          <div className="kicker">Status</div>
          <div className={`pay-status pay-status-${tone} pay-status-lg`}>
            <span className="pay-status-dot" />
            {DIST_STATUS_LABEL[dist.status]}
          </div>
          <div className="muted small">{statusDesc}</div>
        </div>
        <div className="pr-status-r">
          <div className="kicker">{dist.status === "cancelled" ? "Refunded" : isProcessing ? "Paid so far" : "Total paid"}</div>
          <div className="pr-status-total mono">
            {dist.status === "cancelled" ? fmtMoney(dist.refunded, dist.token) : fmtMoney(paidAmt, dist.token)}
          </div>
          <div className="muted small">
            of {fmtMoney(totalAmt, dist.token)} · {paid} / {total} holders
          </div>
        </div>

        {isProcessing && (
          <div className="pr-status-actions">
            <button className="btn-ghost btn-sm danger" onClick={cancel} disabled={!isAdmin || processing}>
              Cancel
            </button>
            <button className="btn-primary btn-sm" onClick={processNext} disabled={processing || paid >= total}>
              {processing ? (
                <>
                  <span className="spinner sm" /> Processing…
                </>
              ) : (
                <>
                  <I.Play size={12} /> Process next batch
                </>
              )}
            </button>
          </div>
        )}
        {dist.status === "done" && leftover > 0 && (dist.reclaimed || 0) === 0 && (
          <div className="pr-status-actions">
            <button className="btn-ghost btn-sm" onClick={reclaim} disabled={!isAdmin}>
              <I.Undo size={12} /> Reclaim {fmtMoney(leftover, dist.token)}
            </button>
          </div>
        )}
      </div>

      {/* run config summary */}
      <div className="dist-meta-grid">
        <div className="dist-meta-cell">
          <div className="kicker">Mode</div>
          <div className="dist-meta-v">{dist.mode === "pershare" ? "Per-share dividend" : "Pro-rata split"}</div>
        </div>
        <div className="dist-meta-cell">
          <div className="kicker">{dist.mode === "pershare" ? "Rate" : "Pool funded"}</div>
          <div className="dist-meta-v mono">
            {dist.mode === "pershare" ? fmtRate(distRate(dist, holders, classes), dist.token) : fmtMoney(dist.pool, dist.token)}
          </div>
        </div>
        <div className="dist-meta-cell">
          <div className="kicker">Basis</div>
          <div className="dist-meta-v">
            {dist.classIds.length === 1 ? classBasisLabel(classById(classes, dist.classIds[0])) : "Per class policy"}
          </div>
        </div>
        <div className="dist-meta-cell">
          <div className="kicker">Derived rate</div>
          <div className="dist-meta-v mono">{fmtRate(distRate(dist, holders, classes), dist.token)}</div>
        </div>
      </div>

      {isProcessing && (
        <div className="pay-banner pay-banner-warn">
          <I.Lock size={14} />
          <div>
            <b>{distClassNames(dist, classes)} locked.</b> No transfers, issuance, or clawbacks on{" "}
            {dist.classIds.length > 1 ? "these classes" : "this class"} until the distribution finishes.
          </div>
        </div>
      )}

      {/* progress */}
      {(isProcessing || dist.status === "done") && (
        <div className="panel">
          <div className="panel-head">
            <span className="kicker">Chunked processing</span>
            <span className="muted small mono">
              {paid} / {total} holders paid
            </span>
          </div>
          <div className="panel-body">
            <div className="dist-progress dist-progress-lg">
              <div className="dist-progress-bar" style={{ width: `${pct}%` }} />
            </div>
            <div className="dist-progress-meta" style={{ marginTop: 10 }}>
              <span className="muted small">
                {isProcessing ? "Large cap tables pay out over multiple transactions — resumable." : "All batches processed."}
              </span>
              <span className="mono small">
                {fmtMoney(paidAmt, dist.token)} / {fmtMoney(totalAmt, dist.token)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* holder payout table */}
      <div className="panel">
        <div className="panel-head">
          <span className="kicker">Holder payouts</span>
          <span className="muted small">
            {total} eligible holder{total === 1 ? "" : "s"} · {distClassNames(dist, classes)}
          </span>
        </div>
        <DistributionHolderTable dist={dist} holders={eligible} classes={classes} allHolders={holders} />
      </div>
    </>
  );
}

function DistributionHolderTable({
  dist,
  holders,
  classes,
  allHolders,
}: {
  dist: Distribution;
  holders: CapHolder[];
  classes: CapClass[];
  allHolders: CapHolder[];
}) {
  const sorted = [...holders].sort((a, b) => distHolderPayout(dist, b, allHolders, classes) - distHolderPayout(dist, a, allHolders, classes));
  return (
    <div className="dh-table panel-table" role="table" aria-label="Holder payouts">
      <div className="dh-head" role="row">
        <div className="dh-cell">Holder</div>
        <div className="dh-cell">Class</div>
        <div className="dh-cell dh-num">Basis shares</div>
        <div className="dh-cell dh-num">Payout</div>
        <div className="dh-cell dh-stat">Status</div>
      </div>
      {sorted.map((h) => {
        const cls = classById(classes, h.classId);
        const payout = distHolderPayout(dist, h, allHolders, classes);
        const isPaid = distIsPaid(dist, h);
        const settled = dist.status === "cancelled" ? false : isPaid;
        return (
          <div key={h.id} className="dh-row" role="row">
            <div className="dh-cell">
              <div className="dh-holder">
                <span className="dh-avatar" style={{ background: `oklch(0.7 0.12 ${h.avatarHue})` }}>
                  {h.initials}
                </span>
                <div className="dh-holder-k">
                  <span className="dh-holder-name">{h.name}</span>
                  <span className="dh-holder-sub mono small muted">{shortHex(h.address, 6, 4)}</span>
                </div>
              </div>
            </div>
            <div className="dh-cell">
              <span className="dist-chip">
                <span className="dist-chip-dot" style={{ background: cls?.color }} />
                {cls?.name}
                {classWeightX(cls) !== 1 && (
                  <span className="dist-weight-chip" title="Economic distribution weight">
                    {fmtWeightPct(classWeightX(cls))}
                  </span>
                )}
              </span>
            </div>
            <div className="dh-cell dh-num mono">{fmtShares(holderRawShares(h, classes))}</div>
            <div className="dh-cell dh-num mono">{fmtMoney(payout, dist.token)}</div>
            <div className="dh-cell dh-stat">
              {dist.status === "cancelled" ? (
                <span className="dh-pill dh-pill-skip">Refunded</span>
              ) : settled ? (
                <span className="dh-pill dh-pill-paid">
                  <I.Check size={11} /> Paid
                </span>
              ) : (
                <span className="dh-pill dh-pill-pending">Pending</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
