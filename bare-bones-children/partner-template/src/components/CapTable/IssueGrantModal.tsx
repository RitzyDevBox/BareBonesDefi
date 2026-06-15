// Issue a grant (equity) to a person. Recipient can be picked from the org's member
// registry (RecipientPicker combobox) or entered as a raw 0x address. The vesting
// schedule is a property of the chosen CLASS (see CAPTABLE.md), so this modal surfaces
// the class's vesting read-only rather than asking for a per-grant schedule.
//
// Faithful port of Designs/Bare Bones/app/captable-grant.jsx (IssueGrantModal +
// RecipientPicker + the right-hand vesting/summary preview).

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ethers } from "ethers";
import type { CapClass, CapHolder, VestingTerms } from "../../hooks/capTable/capTableTypes";
import { VestKind } from "../../hooks/capTable/capTableTypes";
import type { Member } from "../../types/members";
import { abbrevShares, fmtPct, fmtShares, parseTokens, shortAddress, vestSummary } from "./capTableHelpers";

const SEC_MONTH = 30 * 24 * 60 * 60;

interface IssueGrantModalProps {
  classes: CapClass[];
  members: Member[];
  prefill?: CapHolder | null;
  onClose: () => void;
  onIssue: (classId: number, to: string, amount: string) => Promise<unknown>;
  /** Optional: issue with a per-grant vesting override (the deal differs from the class default). */
  onIssueWithTerms?: (
    classId: number,
    to: string,
    amount: string,
    terms: VestingTerms,
  ) => Promise<unknown>;
}

/** Recipient combobox: pick a registered member, or fall back to a raw address typed
 *  into the search box. Mirrors the design's RecipientPicker (ig-recip / ig-menu). */
function RecipientPicker({
  members,
  selected,
  rawAddress,
  onPickMember,
  onTypeAddress,
}: {
  members: Member[];
  selected: Member | null;
  rawAddress: string;
  onPickMember: (m: Member) => void;
  onTypeAddress: (addr: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return members
      .filter((m) => m.wallet?.address)
      .filter(
        (m) =>
          !needle ||
          m.name.toLowerCase().includes(needle) ||
          String(m.accountType).toLowerCase().includes(needle) ||
          m.wallet.address.toLowerCase().includes(needle),
      );
  }, [members, q]);

  const typedIsAddress = ethers.utils.isAddress(q.trim());

  return (
    <div className="ig-recip" ref={ref}>
      <button type="button" className={`ig-recip-btn${open ? " open" : ""}`} onClick={() => setOpen((o) => !o)}>
        {selected ? (
          <>
            <span
              className="m-avatar"
              style={{ width: 30, height: 30, fontSize: 11, background: `oklch(0.55 0.14 ${selected.avatarHue})` }}
              aria-hidden
            >
              {selected.initials}
            </span>
            <span className="ig-recip-k">
              <span className="ig-recip-name">{selected.name}</span>
              <span className="ig-recip-sub">{String(selected.accountType)}</span>
            </span>
          </>
        ) : rawAddress && ethers.utils.isAddress(rawAddress) ? (
          <>
            <span
              className="m-avatar"
              style={{ width: 30, height: 30, fontSize: 11, background: "var(--bg-elev-2)", color: "var(--text-dim)" }}
              aria-hidden
            >
              0x
            </span>
            <span className="ig-recip-k">
              <span className="ig-recip-name">{shortAddress(rawAddress)}</span>
              <span className="ig-recip-sub">Raw address</span>
            </span>
          </>
        ) : (
          <span className="ig-recip-ph">Select a recipient…</span>
        )}
        <span style={{ marginLeft: "auto", color: "var(--text-mute)" }}>▾</span>
      </button>
      {open && (
        <div className="ig-menu">
          <div className="ig-search" style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px 8px" }}>
            <span style={{ color: "var(--text-mute)" }}>⌕</span>
            <input
              autoFocus
              placeholder="Search members or paste 0x address…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ flex: 1, border: 0, background: "transparent", outline: "none", color: "var(--text)", fontSize: 13 }}
            />
          </div>
          {typedIsAddress && (
            <button
              type="button"
              className="ig-opt"
              onClick={() => {
                onTypeAddress(ethers.utils.getAddress(q.trim()));
                setOpen(false);
                setQ("");
              }}
            >
              <span
                className="m-avatar"
                style={{ width: 28, height: 28, fontSize: 10, background: "var(--bg-elev-2)", color: "var(--text-dim)" }}
                aria-hidden
              >
                0x
              </span>
              <span className="ig-opt-k">
                <span className="ig-opt-name">Use {shortAddress(q.trim())}</span>
                <span className="ig-opt-sub">Raw wallet address</span>
              </span>
            </button>
          )}
          {list.map((m) => (
            <button
              type="button"
              key={m.id}
              className="ig-opt"
              onClick={() => {
                onPickMember(m);
                setOpen(false);
                setQ("");
              }}
            >
              <span
                className="m-avatar"
                style={{ width: 28, height: 28, fontSize: 10, background: `oklch(0.55 0.14 ${m.avatarHue})` }}
                aria-hidden
              >
                {m.initials}
              </span>
              <span className="ig-opt-k">
                <span className="ig-opt-name">{m.name}</span>
                <span className="ig-opt-sub">{m.email || shortAddress(m.wallet.address)}</span>
              </span>
              <span className="ig-opt-tag">{String(m.accountType)}</span>
            </button>
          ))}
          {list.length === 0 && !typedIsAddress && (
            <div className="ig-opt-sub" style={{ padding: "8px 10px" }}>
              No members match — paste a 0x address to issue to a raw wallet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function IssueGrantModal({
  classes,
  members,
  prefill,
  onClose,
  onIssue,
  onIssueWithTerms,
}: IssueGrantModalProps) {
  const issuableClasses = useMemo(() => classes.filter((c) => !c.isPool), [classes]);

  const [classId, setClassId] = useState<number>(prefill?.classId ?? issuableClasses[0]?.classId ?? 0);
  // recipient is tracked as a raw address string; a picked member also sets selectedMember
  const [recipient, setRecipient] = useState<string>(prefill?.address ?? "");
  const [selectedMember, setSelectedMember] = useState<Member | null>(
    prefill ? members.find((m) => m.wallet?.address?.toLowerCase() === prefill.address.toLowerCase()) ?? null : null,
  );
  const [amount, setAmount] = useState<string>("");
  const [busy, setBusy] = useState(false);

  // Per-grant vesting override (off → inherit the class default). Prefilled with a standard
  // 1yr-cliff / 4yr-linear so a custom grant starts from a sensible schedule.
  const [override, setOverride] = useState(false);
  const [ovKind, setOvKind] = useState<VestKind>(VestKind.Linear);
  const [ovCliffM, setOvCliffM] = useState("12");
  const [ovDurM, setOvDurM] = useState("48");
  const [ovPeriodM, setOvPeriodM] = useState("1");
  const [ovChunk, setOvChunk] = useState("");

  const selectedClass = classes.find((c) => c.classId === classId);
  const validAddr = ethers.utils.isAddress(recipient);
  const validAmount = /^\d+$/.test(amount) && Number(amount) > 0;
  const canSubmit = validAddr && validAmount && !busy;

  // The terms this grant will actually use — the override when on (and supported), else the class
  // default. Drives both the preview and submit. chunkAmount is scaled to base units for the chain.
  const overrideTerms: VestingTerms = useMemo(
    () => ({
      vestKind: ovKind,
      vestCliff: ovKind === VestKind.Linear ? Math.round(Number(ovCliffM || "0") * SEC_MONTH) : 0,
      vestDuration: ovKind === VestKind.Linear ? Math.round(Number(ovDurM || "0") * SEC_MONTH) : 0,
      vestPeriod: ovKind === VestKind.Chunked ? Math.round(Number(ovPeriodM || "0") * SEC_MONTH) : 0,
      chunkAmount: ovKind === VestKind.Chunked ? parseTokens(ovChunk || "0") : "0",
      vestingStrategy: ethers.constants.AddressZero,
    }),
    [ovKind, ovCliffM, ovDurM, ovPeriodM, ovChunk],
  );
  const canOverride = !!onIssueWithTerms;
  const effectiveTerms =
    override && canOverride ? overrideTerms : selectedClass?.params.defaultTerms;

  // fully-diluted across all classes/holders (from totalIssued + reservedPool)
  const fdTotal = useMemo(
    () => classes.reduce((acc, c) => acc + c.totalIssued + c.reservedPool, 0),
    [classes],
  );
  const grantSize = Number(amount) || 0;
  const newFd = fdTotal + grantSize;

  function pickMember(m: Member) {
    setSelectedMember(m);
    setRecipient(m.wallet.address);
  }
  function typeRawAddress(addr: string) {
    setSelectedMember(null);
    setRecipient(addr);
  }

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    try {
      const to = ethers.utils.getAddress(recipient);
      if (override && canOverride) {
        await onIssueWithTerms!(classId, to, amount, overrideTerms);
      } else {
        await onIssue(classId, to, amount);
      }
      onClose();
    } finally {
      setBusy(false);
    }
  }

  const recipientLabel = selectedMember
    ? selectedMember.name
    : validAddr
      ? shortAddress(recipient)
      : "—";

  return createPortal(
    <div className="ig-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="ig-modal" data-testid="captable-issue-modal">
        <div className="ig-head">
          <div>
            <div className="ig-kicker">New grant</div>
            <h3>Issue a grant</h3>
          </div>
          <button type="button" className="ig-close" onClick={onClose}>✕</button>
        </div>

        <div className="ig-body">
          {/* left: form */}
          <div className="ig-form">
            <div>
              <label className="ig-label">Recipient</label>
              <RecipientPicker
                members={members}
                selected={selectedMember}
                rawAddress={recipient}
                onPickMember={pickMember}
                onTypeAddress={typeRawAddress}
              />
              {/* raw-address text input (always present per spec) */}
              <input
                className="input mono"
                style={{ marginTop: 8, width: "100%" }}
                placeholder="0x… wallet address"
                value={recipient}
                onChange={(e) => {
                  setRecipient(e.target.value);
                  setSelectedMember(null);
                }}
                data-testid="captable-issue-recipient-input"
              />
              {recipient && !validAddr && (
                <span className="ig-recip-sub" style={{ color: "var(--error)", display: "block", marginTop: 4 }}>
                  Not a valid address
                </span>
              )}
            </div>

            <div className="ig-grid2">
              <div>
                <label className="ig-label">Class</label>
                <select
                  className="input ig-input"
                  value={classId}
                  onChange={(e) => setClassId(Number(e.target.value))}
                  data-testid="captable-issue-class-select"
                >
                  {issuableClasses.map((c) => (
                    <option key={c.classId} value={c.classId}>
                      {c.params.name} · {c.params.voteWeightBps / 10000}× vote
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="ig-label">Amount (tokens)</label>
                <div className="input-with-unit">
                  <input
                    className="input mono"
                    inputMode="numeric"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
                    data-testid="captable-issue-amount-input"
                  />
                  <span className="input-unit">tokens</span>
                </div>
              </div>
            </div>

            <div>
              <label className="ig-label">Vesting</label>
              <div className="cd-note">
                <span>ⓘ</span>
                <span>
                  {selectedClass ? (
                    <>
                      Default for <b>{selectedClass.params.name}</b>:{" "}
                      <b>{vestSummary(selectedClass.params.defaultTerms)}</b>. Vesting is per-grant —
                      override it below if this deal differs.
                    </>
                  ) : (
                    "Select a class to see its default vesting schedule."
                  )}
                </span>
              </div>
              {canOverride && (
                <>
                  <label
                    style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, fontSize: 13 }}
                  >
                    <input
                      type="checkbox"
                      data-testid="captable-issue-override-vesting"
                      checked={override}
                      onChange={(e) => setOverride(e.target.checked)}
                    />
                    Override vesting for this grant
                  </label>
                  {override && (
                    <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                      <select
                        className="input ig-input"
                        data-testid="captable-issue-override-kind"
                        value={ovKind}
                        onChange={(e) => setOvKind(Number(e.target.value) as VestKind)}
                      >
                        <option value={VestKind.None}>No vesting (fully vested)</option>
                        <option value={VestKind.Linear}>Linear</option>
                        <option value={VestKind.Chunked}>Chunked</option>
                      </select>
                      {ovKind === VestKind.Linear && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                          <label className="ig-label">
                            Cliff (months)
                            <input
                              className="input ig-input"
                              inputMode="numeric"
                              value={ovCliffM}
                              onChange={(e) => setOvCliffM(e.target.value.replace(/[^0-9]/g, ""))}
                            />
                          </label>
                          <label className="ig-label">
                            Duration (months)
                            <input
                              className="input ig-input"
                              inputMode="numeric"
                              value={ovDurM}
                              onChange={(e) => setOvDurM(e.target.value.replace(/[^0-9]/g, ""))}
                            />
                          </label>
                        </div>
                      )}
                      {ovKind === VestKind.Chunked && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                          <label className="ig-label">
                            Period (months)
                            <input
                              className="input ig-input"
                              inputMode="numeric"
                              value={ovPeriodM}
                              onChange={(e) => setOvPeriodM(e.target.value.replace(/[^0-9]/g, ""))}
                            />
                          </label>
                          <label className="ig-label">
                            Chunk (tokens)
                            <input
                              className="input ig-input"
                              inputMode="numeric"
                              value={ovChunk}
                              onChange={(e) => setOvChunk(e.target.value.replace(/[^0-9]/g, ""))}
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* right: summary / vesting preview */}
          <div className="ig-side">
            <div className="ig-chart-wrap" style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 12, padding: 14 }}>
              <div className="ig-chart-title" style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <b style={{ fontSize: 13 }}>Vesting preview</b>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-mute)" }}>
                  {effectiveTerms ? vestSummary(effectiveTerms) : "—"}
                </span>
              </div>
              <div className="ig-stat-rows">
                <div className="ig-stat-row">
                  <span className="ig-stat-k">Grant size</span>
                  <span className="ig-stat-v big">{grantSize ? fmtShares(grantSize) : "—"}</span>
                </div>
                <div className="ig-stat-row">
                  <span className="ig-stat-k">Recipient</span>
                  <span className="ig-stat-v">{recipientLabel}</span>
                </div>
                <div className="ig-stat-row">
                  <span className="ig-stat-k">Class</span>
                  <span className="ig-stat-v" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    {selectedClass && (
                      <span style={{ width: 9, height: 9, borderRadius: 2, background: selectedClass.color }} />
                    )}
                    {selectedClass ? selectedClass.params.name : "—"}
                  </span>
                </div>
                <div className="ig-stat-row">
                  <span className="ig-stat-k">Vesting</span>
                  <span className="ig-stat-v">{effectiveTerms ? vestSummary(effectiveTerms) : "—"}</span>
                </div>
                <div className="ig-stat-row">
                  <span className="ig-stat-k">Ownership (fully-diluted)</span>
                  <span className="ig-stat-v">{grantSize && newFd ? fmtPct((grantSize / newFd) * 100) : "—"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="ig-foot">
          <span
            className="cts-foot-hint"
            style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--text-mute)", display: "inline-flex", gap: 7, alignItems: "center" }}
          >
            ⛨ Issues on-chain · routes through governance
          </span>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button
              type="button"
              className="btn-primary"
              disabled={!canSubmit}
              style={{ opacity: canSubmit ? 1 : 0.5, cursor: canSubmit ? "pointer" : "not-allowed" }}
              onClick={submit}
              data-testid="captable-issue-submit"
            >
              {busy ? "Issuing…" : `✓ Issue grant${grantSize ? ` · ${abbrevShares(grantSize)}` : ""}`}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
