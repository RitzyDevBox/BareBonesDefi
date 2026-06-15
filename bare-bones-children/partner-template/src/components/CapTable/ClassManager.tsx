// Cap Table — admin surface: class management (full ClassParams).
//   • ClassManager — advanced page to create / retire / remove classes.
//   • ClassEditor  — modal exposing the full on-chain ClassParams.
// Ported faithfully from Designs/Bare Bones/app/captable-admin.jsx (ClassManager + ClassEditor).
// All on-chain mutations are routed through the props (onCreateClass etc.), which already
// MTA-encode and send. Class rules are fixed at creation on-chain.

import { useState } from "react";
import { createPortal } from "react-dom";
import { ethers } from "ethers";
import {
  type CapClass,
  type ClassParams,
  VestKind,
  DistributionPolicy,
  ClassStatus,
} from "../../hooks/capTable/capTableTypes";
import {
  bpsToX,
  payoutLabel,
  distLabel,
  secToDur,
  abbrevShares,
  fmtShares,
  defaultCommonClass,
  parseTokens,
} from "./capTableHelpers";

const SEC_MONTH = 30 * 24 * 60 * 60;
const SEC_DAY = 24 * 60 * 60;

interface ClassManagerProps {
  orgName: string;
  classes: CapClass[];
  onBack: () => void;
  onCreateClass: (params: ClassParams) => Promise<unknown>;
  onRetireClass: (classId: number) => Promise<unknown>;
  onRemoveClass: (classId: number) => Promise<unknown>;
}

// editor state: undefined = closed, null = new, CapClass = edit
type EditorState = undefined | null | CapClass;

export function ClassManager({
  orgName,
  classes,
  onBack,
  onCreateClass,
  onRetireClass,
  onRemoveClass,
}: ClassManagerProps) {
  const [editor, setEditor] = useState<EditorState>(undefined);

  return (
    <>
      <section className="gov-hero">
        <div className="container gov-hero-inner">
          <div>
            <div className="crumb">{orgName} · Equity · Admin</div>
            <h1>Class management</h1>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-ghost" onClick={onBack}>
              ‹ Back
            </button>
            <button
              className="btn-primary"
              data-testid="captable-class-new-btn"
              onClick={() => setEditor(null)}
            >
              + New class
            </button>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 28 }}>
        <div className="container" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="cd-note">
            <span>ℹ</span>
            <span>
              <b>Advanced.</b> Most organizations need only <b>Common</b> until they raise —
              Preferred classes are created here or by a priced round.
            </span>
          </div>

          <div className="cm-list">
            {classes.map((c) => {
              const p = c.params;
              const isPool = c.isPool;
              const retired = c.status === ClassStatus.Retired;
              // authorizedCap is 18-decimal base units on-chain → show whole tokens.
              const capNum =
                c.params.authorizedCap && c.params.authorizedCap !== "0"
                  ? Number(BigInt(c.params.authorizedCap) / 10n ** 18n)
                  : 0;
              return (
                <div
                  key={c.classId}
                  className={`cm-card${retired ? " retired" : ""}`}
                  data-testid={`captable-class-card-${c.classId}`}
                >
                  <span
                    className={`cm-card-dot${isPool ? " hatch" : ""}`}
                    style={{ background: isPool ? undefined : c.color }}
                  ></span>
                  <div className="cm-card-k">
                    <span className="cm-card-name">
                      {p.name}
                      <span className={`cm-status ${retired ? "retired" : "active"}`}>
                        {retired ? "Retired" : "Active"}
                      </span>
                    </span>
                    <div className="cm-card-params">
                      <span className="cm-chip">{bpsToX(p.voteWeightBps)} vote</span>
                      <span className="cm-chip">{payoutLabel(p.payoutPriority)}</span>
                      <span className="cm-chip">dist {distLabel(p.distributionWeightBps)}</span>
                      <span className="cm-chip">
                        {p.defaultTerms.vestKind === VestKind.None ? "no vest" : secToDur(p.defaultTerms.vestDuration)}
                        {p.defaultTerms.vestKind !== VestKind.None && p.defaultTerms.vestCliff
                          ? " / " + secToDur(p.defaultTerms.vestCliff) + " cliff"
                          : ""}
                      </span>
                      <span className="cm-chip">
                        cap {capNum === 0 ? "∞" : abbrevShares(capNum)}
                      </span>
                      <span className="cm-chip">{fmtShares(c.totalIssued)} issued</span>
                    </div>
                  </div>
                  <div className="cm-card-actions">
                    <button
                      className="cm-icon"
                      title="Edit"
                      data-testid={`captable-class-edit-${c.classId}`}
                      onClick={() => setEditor(c)}
                    >
                      ✎
                    </button>
                    {!isPool && !retired && (
                      <button
                        className="cm-icon"
                        title="Retire"
                        data-testid={`captable-class-retire-${c.classId}`}
                        onClick={() => onRetireClass(c.classId)}
                      >
                        ⊘
                      </button>
                    )}
                    {!isPool && c.totalIssued === 0 && (
                      <button
                        className="cm-icon danger"
                        title="Remove"
                        data-testid={`captable-class-remove-${c.classId}`}
                        onClick={() => onRemoveClass(c.classId)}
                      >
                        🗑
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {editor !== undefined && (
        <ClassEditor
          initial={editor}
          onClose={() => setEditor(undefined)}
          onSave={async (params) => {
            await onCreateClass(params);
            setEditor(undefined);
          }}
        />
      )}
    </>
  );
}

interface ClassEditorProps {
  initial?: CapClass | null;
  onClose: () => void;
  onSave: (params: ClassParams) => Promise<unknown>;
}

export function ClassEditor({ initial, onClose, onSave }: ClassEditorProps) {
  const isNew = !initial;
  const rawSeed: ClassParams = initial?.params ?? defaultCommonClass("Preferred B");
  // Keep share-amount fields (authorizedCap / chunkAmount) in WHOLE TOKENS in editor state for a
  // human-friendly input; on-chain they're 18-decimal base units, so convert in/out. Caps are whole
  // tokens, so integer BigInt division is exact (no decimal-point artifacts from formatUnits).
  const toWhole = (baseUnits: string) =>
    baseUnits && baseUnits !== "0" ? (BigInt(baseUnits) / 10n ** 18n).toString() : "0";
  const seed: ClassParams = {
    ...rawSeed,
    authorizedCap: toWhole(rawSeed.authorizedCap),
    defaultTerms: { ...rawSeed.defaultTerms, chunkAmount: toWhole(rawSeed.defaultTerms.chunkAmount) },
  };

  const [name, setName] = useState<string>(seed.name);
  const [p, setP] = useState<ClassParams>({ ...seed });
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof ClassParams>(k: K, v: ClassParams[K]) =>
    setP((s) => ({ ...s, [k]: v }));

  const setTerms = <K extends keyof ClassParams["defaultTerms"]>(
    k: K,
    v: ClassParams["defaultTerms"][K],
  ) => setP((s) => ({ ...s, defaultTerms: { ...s.defaultTerms, [k]: v } }));

  const onlyDigits = (s: string) => s.replace(/[^0-9]/g, "");
  const onlyNum = (s: string) => s.replace(/[^0-9.]/g, "");

  const cliffM = Math.round(p.defaultTerms.vestCliff / SEC_MONTH);
  const durM = Math.round(p.defaultTerms.vestDuration / SEC_MONTH);
  const capNum = Number(p.authorizedCap);

  const flags: Array<[keyof ClassParams, string, string]> = [
    ["excludeFromFullyDiluted", "Exclude from fully-diluted", "Synthetic / payment class — does not dilute"],
    ["excludeFromVotingTotal", "Exclude from voting total", "Counts toward neither votes nor quorum"],
    ["unvestedVotes", "Unvested votes", "Vote on owned units before vesting"],
    ["requiresLiquidityEvent", "Requires liquidity event", "RSU double-trigger"],
  ];

  async function save() {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      // Start from a sane Common base, then override every field from the form.
      const params: ClassParams = {
        ...defaultCommonClass(name.trim()),
        name: name.trim(),
        voteWeightBps: p.voteWeightBps,
        transferLockDuration: p.transferLockDuration,
        transferGate: p.transferGate,
        payoutPriority: p.payoutPriority,
        distributionWeightBps: p.distributionWeightBps,
        distributionPolicy: p.distributionPolicy,
        authorizedCap:
          p.authorizedCap && p.authorizedCap !== "0" ? parseTokens(p.authorizedCap) : "0",
        excludeFromFullyDiluted: p.excludeFromFullyDiluted,
        excludeFromVotingTotal: p.excludeFromVotingTotal,
        unvestedVotes: p.unvestedVotes,
        requiresLiquidityEvent: p.requiresLiquidityEvent,
        transferPolicy: p.transferPolicy || ethers.constants.AddressZero,
        voteStrategy: p.voteStrategy || ethers.constants.AddressZero,
        defaultTerms: {
          vestKind: p.defaultTerms.vestKind,
          vestCliff: p.defaultTerms.vestKind === VestKind.None ? 0 : p.defaultTerms.vestCliff,
          vestDuration: p.defaultTerms.vestKind === VestKind.None ? 0 : p.defaultTerms.vestDuration,
          vestPeriod: p.defaultTerms.vestKind === VestKind.None ? 0 : p.defaultTerms.vestPeriod,
          // Scale whole-token inputs back to 18-decimal base units (clean integer strings — never
          // JS Number/sci-notation, which ethers rejects e.g. "1e+29").
          chunkAmount:
            p.defaultTerms.chunkAmount && p.defaultTerms.chunkAmount !== "0"
              ? parseTokens(p.defaultTerms.chunkAmount)
              : "0",
          vestingStrategy: p.defaultTerms.vestingStrategy || ethers.constants.AddressZero,
        },
      };
      await onSave(params);
    } finally {
      setBusy(false);
    }
  }

  return createPortal(
    <div
      className="ig-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="ig-modal">
        <div className="ig-head">
          <div>
            <div className="ig-kicker">{isNew ? "New class" : "Edit class"} · ClassParams</div>
            <h3>{isNew ? "Create a share class" : "Edit " + seed.name}</h3>
          </div>
          <button className="ig-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="ig-form" style={{ maxHeight: "68vh" }}>
          <div className="ig-grid2">
            <div>
              <label className="ig-label">Class name</label>
              <input
                className="input"
                data-testid="captable-class-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="ig-label">Vote weight (×)</label>
              <div className="input-with-unit">
                <input
                  className="input mono"
                  value={p.voteWeightBps / 10000}
                  onChange={(e) =>
                    set("voteWeightBps", Math.round((parseFloat(onlyNum(e.target.value)) || 0) * 10000))
                  }
                />
                <span className="input-unit">× = {p.voteWeightBps}</span>
              </div>
            </div>
            <div>
              <label className="ig-label">Payout priority</label>
              <input
                className="input mono"
                value={p.payoutPriority}
                onChange={(e) => set("payoutPriority", Number(onlyDigits(e.target.value)) || 0)}
              />
            </div>
            <div>
              <label className="ig-label">Distribution policy</label>
              <select
                className="input ig-input"
                value={p.distributionPolicy}
                onChange={(e) => set("distributionPolicy", Number(e.target.value) as DistributionPolicy)}
              >
                <option value={DistributionPolicy.VestedOnly}>Vested only</option>
                <option value={DistributionPolicy.AccrueAndPayOnVest}>Accrue &amp; pay on vest</option>
                <option value={DistributionPolicy.Full}>Full</option>
              </select>
            </div>
            <div>
              <label className="ig-label">Vest kind</label>
              <select
                className="input ig-input"
                value={p.defaultTerms.vestKind}
                onChange={(e) => setTerms("vestKind", Number(e.target.value) as VestKind)}
              >
                <option value={VestKind.None}>None</option>
                <option value={VestKind.Linear}>Linear</option>
                <option value={VestKind.Chunked}>Chunked</option>
              </select>
            </div>
            <div>
              <label className="ig-label">Authorized cap (0 = ∞)</label>
              <div className="input-with-unit">
                <input
                  className="input mono"
                  value={capNum ? fmtShares(capNum) : "0"}
                  onChange={(e) => set("authorizedCap", onlyDigits(e.target.value) || "0")}
                />
                <span className="input-unit">tokens</span>
              </div>
            </div>

            {p.defaultTerms.vestKind !== VestKind.None && (
              <>
                <div>
                  <label className="ig-label">Cliff</label>
                  <div className="input-with-unit">
                    <input
                      className="input mono"
                      value={cliffM}
                      onChange={(e) =>
                        setTerms("vestCliff", (Number(onlyDigits(e.target.value)) || 0) * SEC_MONTH)
                      }
                    />
                    <span className="input-unit">mo</span>
                  </div>
                </div>
                <div>
                  <label className="ig-label">Duration</label>
                  <div className="input-with-unit">
                    <input
                      className="input mono"
                      value={durM}
                      onChange={(e) =>
                        setTerms("vestDuration", (Number(onlyDigits(e.target.value)) || 0) * SEC_MONTH)
                      }
                    />
                    <span className="input-unit">mo</span>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="ig-label">Transfer lockup</label>
              <div className="input-with-unit">
                <input
                  className="input mono"
                  value={Math.round(p.transferLockDuration / SEC_DAY)}
                  onChange={(e) =>
                    set("transferLockDuration", (Number(onlyDigits(e.target.value)) || 0) * SEC_DAY)
                  }
                />
                <span className="input-unit">days</span>
              </div>
            </div>
            <div>
              <label className="ig-label">Distribution weight (bps)</label>
              <input
                className="input mono"
                value={p.distributionWeightBps}
                onChange={(e) => set("distributionWeightBps", Number(onlyDigits(e.target.value)) || 0)}
              />
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--line)", paddingTop: 6 }}>
            {flags.map(([k, label, sub]) => (
              <div key={k} className="ig-flag">
                <span className="ig-flag-k">
                  {label}
                  <span>{sub}</span>
                </span>
                <div
                  className={`toggle${p[k] ? " on" : ""}`}
                  data-testid={`captable-class-flag-${k}`}
                  onClick={() => set(k, !p[k] as ClassParams[typeof k])}
                ></div>
              </div>
            ))}
          </div>
        </div>

        <div className="ig-foot">
          <span
            className="cts-foot-hint"
            style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--text-mute)" }}
          >
            Advanced · class rules are fixed at creation on-chain
          </span>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn-primary"
              data-testid="captable-class-save"
              disabled={!name.trim() || busy}
              onClick={save}
            >
              ✓ {isNew ? "Create class" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
