// Cap-table centerpiece: overview band → stat strip → class-grouped holder table with
// vested/unvested first-class on every row. Ported from Designs/Bare Bones/app/captable.jsx
// and wired to live on-chain state. Row actions are role-gated (isAdmin) and call back up
// to the page, which owns the modals + contract writes.

import { Fragment, useMemo, useState } from "react";
import type { CapClass, CapHolder, CapTableState } from "../../hooks/capTable/capTableTypes";
import { ClassStatus, VestKind } from "../../hooks/capTable/capTableTypes";
import {
  abbrevShares,
  bpsToX,
  fmtPct,
  fmtShares,
  vestSummary,
} from "./capTableHelpers";

interface CapTableViewProps {
  state: CapTableState;
  isAdmin: boolean;
  account: string | null;
  onSetup: () => void;
  onIssue: (holder?: CapHolder) => void;
  onTransfer: (holder: CapHolder) => void;
}

function Avatar({ holder }: { holder: CapHolder }) {
  return (
    <span className="ct-avatar" style={{ background: `hsl(${holder.avatarHue} 55% 45%)` }}>
      {holder.initials}
    </span>
  );
}

function VestBar({ holder, color }: { holder: CapHolder; color: string }) {
  const vp = holder.shares ? (holder.vested / holder.shares) * 100 : 0;
  const full = vp >= 99.9;
  const inCliff = vp < 0.1;
  return (
    <div className="ct-vestcell">
      <div className="ct-vest">
        <div className="ct-vest-fill" style={{ width: `${vp}%`, background: color }} />
      </div>
      <div className="ct-vest-label">
        {full ? (
          <span className="ct-vest-tag full">Fully vested</span>
        ) : inCliff ? (
          <span className="ct-vest-tag cliff">In cliff · 0 of {abbrevShares(holder.shares)}</span>
        ) : (
          <>
            <b>{abbrevShares(holder.vested)}</b>
            <span>
              / {abbrevShares(holder.shares)} · {Math.round(vp)}%
            </span>
          </>
        )}
      </div>
    </div>
  );
}

export function CapTableView({ state, isAdmin, account, onSetup, onIssue, onTransfer }: CapTableViewProps) {
  const { classes, holders } = state;
  const [filter, setFilter] = useState<number | "all">("all");
  const [q, setQ] = useState("");

  const issuedTotal = state.issuedTotal;
  const fdTotal = state.fullyDiluted || issuedTotal;
  const vestedTotal = state.vestedTotal;
  const unvestedTotal = issuedTotal - vestedTotal;
  const poolReserved = useMemo(() => classes.reduce((s, c) => s + (c.isPool ? c.reservedPool : 0), 0), [classes]);

  const matchQ = (h: CapHolder) =>
    !q ||
    h.name.toLowerCase().includes(q.toLowerCase()) ||
    h.role.toLowerCase().includes(q.toLowerCase()) ||
    h.address.toLowerCase().includes(q.toLowerCase());

  const fdByClass = (c: CapClass) => (c.isPool ? c.reservedPool : c.totalIssued);
  const segs = classes.map((c) => ({ c, val: fdByClass(c) })).filter((s) => s.val > 0);
  const visibleClasses = classes.filter((c) => filter === "all" || c.classId === filter);

  if (!state.hasTable && !state.loading) {
    return (
      <div className="ct-empty" data-testid="captable-empty">
        <div className="ct-empty-icon">▦</div>
        <h3>Your cap table is empty</h3>
        <p>
          This organization is formed, but no equity has been issued yet. Set up your cap table to
          define a default <b>Common</b> class, record founder allocations, and optionally reserve an
          option pool for future hires.
        </p>
        <div className="ct-empty-actions">
          {isAdmin && (
            <button className="ct-btn ct-btn-primary" onClick={onSetup} data-testid="captable-setup-cta">
              ✦ Set up cap table
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="ct-page" data-testid="captable-view">
      {/* overview band */}
      <div className="ct-overview">
        <div className="ct-overview-top">
          <div>
            <div className="ct-kicker">Fully-diluted ownership</div>
            <div className="ct-overview-h" data-testid="captable-fd-total">
              {fmtShares(fdTotal)}
              <small>
                shares · {classes.length} class{classes.length === 1 ? "" : "es"}
              </small>
            </div>
          </div>
          <div className="ct-vsplit">
            <div className="ct-vsplit-item">
              <span className="ct-vsplit-k">
                <span className="ct-swatch solid" /> Vested
              </span>
              <span className="ct-vsplit-v">{abbrevShares(vestedTotal)}</span>
            </div>
            <div className="ct-vsplit-item">
              <span className="ct-vsplit-k">
                <span className="ct-swatch faded" /> Unvested
              </span>
              <span className="ct-vsplit-v">{abbrevShares(unvestedTotal)}</span>
            </div>
            <div className="ct-vsplit-item">
              <span className="ct-vsplit-k">
                <span className="ct-swatch faded" /> Reserved
              </span>
              <span className="ct-vsplit-v">{abbrevShares(poolReserved)}</span>
            </div>
          </div>
        </div>

        <div className="ct-bar">
          {segs.map(({ c, val }) => (
            <div
              key={c.classId}
              className={`ct-bar-seg${c.isPool ? " hatch" : ""}`}
              style={{ flexBasis: `${(val / fdTotal) * 100}%`, background: c.isPool ? undefined : c.color }}
              title={`${c.params.name} · ${fmtShares(val)}`}
            />
          ))}
        </div>

        <div className="ct-legend">
          {segs.map(({ c, val }) => (
            <div key={c.classId} className="ct-legend-item">
              <span className={`ct-legend-dot${c.isPool ? " hatch" : ""}`} style={{ background: c.isPool ? undefined : c.color }} />
              <span className="ct-legend-name">{c.params.name}</span>
              <span className="ct-legend-sub">
                {fmtShares(val)} · {fmtPct((val / fdTotal) * 100)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* stat strip */}
      <div className="ct-stats">
        <div className="ct-stat">
          <div className="ct-stat-k">Issued</div>
          <div className="ct-stat-v">
            {abbrevShares(issuedTotal)}
            <small>shares</small>
          </div>
          <div className="ct-stat-sub">outstanding</div>
        </div>
        <div className="ct-stat">
          <div className="ct-stat-k">Fully-diluted</div>
          <div className="ct-stat-v">
            {abbrevShares(fdTotal)}
            <small>shares</small>
          </div>
          <div className="ct-stat-sub">incl. option pool</div>
        </div>
        <div className="ct-stat">
          <div className="ct-stat-k">Classes</div>
          <div className="ct-stat-v">{classes.length}</div>
          <div className="ct-stat-sub">share types</div>
        </div>
        <div className="ct-stat">
          <div className="ct-stat-k">Holders</div>
          <div className="ct-stat-v" data-testid="captable-holder-count">{holders.length}</div>
          <div className="ct-stat-sub">
            {holders.filter((h) => h.type === "investor").length} investors ·{" "}
            {holders.filter((h) => h.type !== "investor").length} team
          </div>
        </div>
        <div className="ct-stat">
          <div className="ct-stat-k">Option pool</div>
          <div className="ct-stat-v">{abbrevShares(poolReserved)}</div>
          <div className="ct-stat-sub">{fmtPct((poolReserved / fdTotal) * 100)} FD</div>
        </div>
      </div>

      {/* toolbar */}
      <div className="ct-toolbar">
        <div className="ct-seg">
          <button className={`ct-seg-btn${filter === "all" ? " on" : ""}`} onClick={() => setFilter("all")}>
            All classes <span className="count">{holders.length}</span>
          </button>
          {classes.map((c) => (
            <button
              key={c.classId}
              className={`ct-seg-btn${filter === c.classId ? " on" : ""}`}
              onClick={() => setFilter(c.classId)}
            >
              <span className="ct-seg-dot" style={{ background: c.isPool ? "var(--colors-text-muted)" : c.color }} />
              {c.params.name}{" "}
              <span className="count">{c.isPool ? "—" : holders.filter((h) => h.classId === c.classId).length}</span>
            </button>
          ))}
        </div>
        <div className="ct-toolbar-spacer" />
        <div className="ct-search">
          <input
            placeholder="Search holder, role, address…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            data-testid="captable-search"
          />
        </div>
      </div>

      {/* table */}
      <div className="ct-table-wrap">
        <div className="ct-table-scroll">
          <table className="ct-table">
            <thead>
              <tr>
                <th>Holder</th>
                <th>Vesting</th>
                <th className="num">Shares</th>
                <th className="num">Ownership</th>
                <th className="num">Fully-diluted</th>
                <th style={{ width: 130 }} />
              </tr>
            </thead>
            <tbody>
              {visibleClasses.map((c) => {
                const groupHolders = holders.filter((h) => h.classId === c.classId && matchQ(h));
                if (!c.isPool && groupHolders.length === 0) return null;
                const classFd = fdByClass(c);
                return (
                  <Fragment key={c.classId}>
                    <tr className="ct-grp">
                      <td colSpan={6}>
                        <div className="ct-grp-inner">
                          <span className="ct-class-dot" style={{ background: c.isPool ? "var(--colors-text-muted)" : c.color }} />
                          <span className="ct-class-name">{c.params.name}</span>
                          <span className="ct-rights">
                            <span className="ct-right-chip">{bpsToX(c.params.voteWeightBps)} vote</span>
                            <span className="ct-right-chip">priority {c.params.payoutPriority}</span>
                            <span className="ct-right-chip">vest {c.params.vestKind === VestKind.None ? "none" : vestSummary(c.params)}</span>
                            {c.status === ClassStatus.Retired && <span className="ct-right-chip">retired</span>}
                          </span>
                          <span className="ct-grp-sub">
                            <b>{fmtShares(c.isPool ? c.reservedPool : c.totalIssued)}</b> · {fmtPct((classFd / fdTotal) * 100)} FD
                          </span>
                        </div>
                      </td>
                    </tr>

                    {c.isPool ? (
                      <tr className="ct-row">
                        <td>
                          <div className="ct-reserved">
                            <span className="ct-reserved-glyph">🔒</span>
                            <div>
                              <div className="ct-reserved-name">Reserved — unissued</div>
                              <div className="ct-reserved-sub">Authorized for future hires · not owned yet</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="ct-num-dim">No grants yet</span>
                        </td>
                        <td className="num">
                          <span className="ct-num">{fmtShares(c.reservedPool)}</span>
                        </td>
                        <td className="num">
                          <span className="ct-num-dim">—</span>
                        </td>
                        <td className="num">
                          <span className="ct-num">{fmtPct((c.reservedPool / fdTotal) * 100)}</span>
                        </td>
                        <td />
                      </tr>
                    ) : (
                      groupHolders.map((h) => (
                        <tr key={h.id} className="ct-row" data-testid={`captable-row-${h.address.toLowerCase()}`}>
                          <td>
                            <div className="ct-holder">
                              <Avatar holder={h} />
                              <div className="ct-holder-k">
                                <span className="ct-holder-name">
                                  {h.name}
                                  {h.type !== "member" && h.type !== "holder" && (
                                    <span className="ct-type">{h.type}</span>
                                  )}
                                </span>
                                <span className="ct-holder-role">{h.role}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <VestBar holder={h} color={c.color} />
                          </td>
                          <td className="num">
                            <span className="ct-num">{fmtShares(h.shares)}</span>
                          </td>
                          <td className="num">
                            <span className="ct-num">{fmtPct((h.shares / (issuedTotal || 1)) * 100)}</span>
                          </td>
                          <td className="num">
                            <span className="ct-num-dim">{fmtPct((h.shares / fdTotal) * 100)}</span>
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                              {isAdmin && (
                                <button
                                  className="ct-btn"
                                  style={{ height: 28, padding: "0 8px", fontSize: 12 }}
                                  onClick={() => onIssue(h)}
                                  data-testid={`captable-issue-more-${h.address.toLowerCase()}`}
                                >
                                  Issue
                                </button>
                              )}
                              {account && h.address.toLowerCase() === account.toLowerCase() && (
                                <button
                                  className="ct-btn"
                                  style={{ height: 28, padding: "0 8px", fontSize: 12 }}
                                  onClick={() => onTransfer(h)}
                                  data-testid={`captable-transfer-${h.address.toLowerCase()}`}
                                >
                                  Transfer
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="ct-footnote">
        <span>Register is per-organization · on-chain share ledger</span>
        <span>
          {holders.length} holders · {fmtShares(issuedTotal)} issued · {fmtShares(fdTotal)} fully-diluted
        </span>
      </div>
    </div>
  );
}
