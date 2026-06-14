// Cap Table — Fundraising surface (full-page). Faithful port of
// Designs/Bare Bones/app/captable-fundraising.jsx.
//
// Pick-an-instrument is the core interaction:
//   SAFE · Convertible note · Priced round (primary) + RBF / Profit interest (advanced)
// SAFEs/notes are *recorded* (don't issue shares now); a priced round issues
// Preferred immediately AND converts outstanding SAFEs/notes into the round.
//
// Layout, section copy and CSS class names mirror the design. Write callbacks
// (onRecordSafe / onRecordNote / onOpenRound / onConvertSafes) handle 18-decimal
// scaling + encoding internally, so amounts are passed as plain strings.

import { useState } from "react";
import { ethers } from "ethers";
import {
  abbrevShares,
  abbrevUsd,
  fmtPct,
  fmtShares,
  fmtUsd,
} from "./capTableHelpers";
import type {
  CapClass,
  CapHolder,
} from "../../hooks/capTable/capTableTypes";
import type { Member } from "../../types/members";

// ── outstanding-instrument view model (on-chain listing not wired yet) ──
export interface FundInstrument {
  id: number;
  kind: "safe" | "note";
  investor: string;
  investorShort: string;
  avatarHue: number;
  amount: number;
  valCap: number;
  discount: number;
  interest?: number;
  date?: string;
}

export interface FundraisingViewProps {
  orgName: string;
  classes: CapClass[];
  holders: CapHolder[];
  /** onboarded members/investors — to pick the SAFE/note investor wallet */
  members: Member[];
  /** pre-money fully-diluted shares (whole tokens) */
  fullyDiluted: number;
  /** outstanding SAFEs/notes; default [] (empty state rendered faithfully) */
  instruments?: FundInstrument[];
  onBack: () => void;
  // write callbacks — already handle 18-decimal scaling / encoding internally:
  onRecordSafe: (
    investor: string,
    principalUsd: string,
    capUsd: string,
    discountBps: number,
    targetClassId: number,
  ) => Promise<unknown>;
  onRecordNote: (
    investor: string,
    principalUsd: string,
    capUsd: string,
    discountBps: number,
    interestRateBps: number,
    maturityUnix: number,
    targetClassId: number,
  ) => Promise<unknown>;
  /** preConversionShares = whole tokens */
  onOpenRound: (
    pricePerShare: string,
    preConversionShares: string,
  ) => Promise<unknown>;
  onConvertSafes: (roundId: number, ids: number[]) => Promise<unknown>;
}

// ── instrument type catalog — drives the picker. tier 1 = primary, 2 = advanced ──
type InstrumentTypeId = "safe" | "note" | "round" | "rbf" | "profit";
interface InstrumentType {
  id: InstrumentTypeId;
  tier: 1 | 2;
  name: string;
  sub: string;
  blurb: string;
  fields: string[];
  issues: boolean;
}

const INSTRUMENT_TYPES: InstrumentType[] = [
  {
    id: "safe",
    tier: 1,
    name: "SAFE",
    sub: "Simple Agreement for Future Equity",
    blurb:
      "The most common early instrument. Money now, shares later — converts in your next priced round at a valuation cap and/or discount. No interest, no maturity.",
    fields: ["valuation cap", "discount"],
    issues: false,
  },
  {
    id: "note",
    tier: 1,
    name: "Convertible note",
    sub: "A loan that converts to equity",
    blurb:
      "Like a SAFE, but a debt instrument: it accrues interest and has a maturity date. Converts in the next round (or can be repaid).",
    fields: ["valuation cap", "discount", "interest", "maturity"],
    issues: false,
  },
  {
    id: "round",
    tier: 1,
    name: "Priced round",
    sub: "Sell shares at a set price",
    blurb:
      "An actual equity sale at a fixed price per share into a new Preferred class. Issues shares immediately — and converts any outstanding SAFEs and notes.",
    fields: ["price per share", "new Preferred class"],
    issues: true,
  },
  {
    id: "rbf",
    tier: 2,
    name: "Revenue-based financing",
    sub: "Repaid from revenue",
    blurb:
      "Capital repaid as a fixed percentage of revenue up to a cap. Not equity — no dilution.",
    fields: ["revenue share %", "repayment cap"],
    issues: false,
  },
  {
    id: "profit",
    tier: 2,
    name: "Profit interest",
    sub: "Share of future profits",
    blurb:
      "A profits-only interest (e.g. LLC) with a threshold value, distributed via distribution weight — not a share sale.",
    fields: ["threshold", "distribution weight"],
    issues: false,
  },
];

// Letter/glyph stand-ins for icons (no icon library).
const INST_ICON: Record<InstrumentTypeId, string> = {
  safe: "✎",
  note: "🧾",
  round: "$",
  rbf: "⚡",
  profit: "✦",
};

// ── conversion math (ported from the design's instConversion helper) ──
interface Conversion {
  principal: number;
  capPrice: number;
  discPrice: number;
  convPrice: number;
  via: "cap" | "discount" | "price";
  shares: number;
}

function instConversion(
  inst: FundInstrument,
  price: number,
  fdPreShares: number,
): Conversion {
  const principal = inst.amount;
  const capPrice = inst.valCap ? inst.valCap / fdPreShares : Infinity;
  const discPrice = inst.discount ? price * (1 - inst.discount / 100) : price;
  const via: Conversion["via"] =
    capPrice <= discPrice ? "cap" : inst.discount ? "discount" : "price";
  const convPrice = Math.min(capPrice, discPrice);
  const shares = convPrice > 0 ? Math.round(principal / convPrice) : 0;
  return { principal, capPrice, discPrice, convPrice, via, shares };
}

type Mode = "pick" | "safe" | "note" | "round" | "rbf" | "profit";

const CaretBack = () => (
  <span style={{ display: "inline-block", transform: "rotate(90deg)" }}>‹</span>
);

// ── instrument record form (SAFE / note / RBF / profit) ──
interface InstrumentFormProps {
  type: InstrumentType;
  classes: CapClass[];
  members: Member[];
  onCancel: () => void;
  onRecordSafe: FundraisingViewProps["onRecordSafe"];
  onRecordNote: FundraisingViewProps["onRecordNote"];
}

function InstrumentForm({
  type,
  classes,
  members,
  onCancel,
  onRecordSafe,
  onRecordNote,
}: InstrumentFormProps) {
  const icon = INST_ICON[type.id];
  const targetable = classes.filter((c) => !c.isPool);
  const targetClassId = targetable[0]?.classId ?? 0;

  const [investor, setInvestor] = useState("");
  const [amount, setAmount] = useState("");
  const [valCap, setValCap] = useState(
    type.id === "safe" ? "12000000" : type.id === "note" ? "15000000" : "",
  );
  const [discount, setDiscount] = useState(
    type.id === "safe" ? "20" : type.id === "note" ? "15" : "",
  );
  const [interest, setInterest] = useState("6");
  const [maturity, setMaturity] = useState("24");
  const [revShare, setRevShare] = useState("8");
  const [repayCap, setRepayCap] = useState("1.5");
  const [threshold, setThreshold] = useState("");
  const [distWeight, setDistWeight] = useState("108");
  const [busy, setBusy] = useState(false);

  const num = (e: React.ChangeEvent<HTMLInputElement>) =>
    e.target.value.replace(/[^0-9.]/g, "");

  const wireable = type.id === "safe" || type.id === "note";
  // The investor is recorded on-chain, so it must be a wallet address (the SAFE/note holder).
  // Pick an onboarded Member/Investor from the dropdown, or paste a raw 0x address.
  const validInvestor = ethers.utils.isAddress(investor.trim());
  const valid = validInvestor && Number(amount) > 0;
  const canSubmit = valid && !busy;

  async function record() {
    if (!canSubmit) return;
    setBusy(true);
    try {
      const investorAddr = ethers.utils.getAddress(investor.trim());
      if (type.id === "safe") {
        const discountBps = Math.round((Number(discount) || 0) * 100);
        await onRecordSafe(investorAddr, amount, valCap || "0", discountBps, targetClassId);
      } else if (type.id === "note") {
        const discountBps = Math.round((Number(discount) || 0) * 100);
        const interestRateBps = Math.round((Number(interest) || 0) * 100);
        const months = Number(maturity) || 0;
        const maturityUnix = Math.floor(Date.now() / 1000) + months * 30 * 86400;
        await onRecordNote(
          investorAddr,
          amount,
          valCap || "0",
          discountBps,
          interestRateBps,
          maturityUnix,
          targetClassId,
        );
      }
      // rbf / profit have no contract wiring yet — just return to the picker.
      onCancel();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="cts">
      <div className="cts-top">
        <button className="cts-back" onClick={onCancel}>
          <CaretBack /> Back to instruments
        </button>
      </div>

      <div className="cts-body">
        <div className="cts-main">
          <div>
            <div
              className="pw-kicker"
              style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              {icon} {type.sub}
            </div>
            <h2 className="cts-h">Record a {type.name}</h2>
            <p className="cts-sub">{type.blurb}</p>
          </div>

          <div className="cts-class-card">
            <div className="cts-field-grid">
              <div className="field full">
                <label>Investor wallet</label>
                {members.filter((m) => m.wallet?.address).length > 0 && (
                  <select
                    className="input"
                    value={members.some((m) => m.wallet?.address?.toLowerCase() === investor.toLowerCase()) ? investor : ""}
                    onChange={(e) => e.target.value && setInvestor(e.target.value)}
                    data-testid="captable-raise-investor-select"
                    style={{ marginBottom: 8 }}
                  >
                    <option value="">— pick an onboarded member / investor —</option>
                    {members
                      .filter((m) => m.wallet?.address)
                      .map((m) => (
                        <option key={m.id} value={m.wallet.address}>
                          {m.name} ({String(m.accountType)})
                        </option>
                      ))}
                  </select>
                )}
                <input
                  className="input mono"
                  placeholder="0x… investor wallet address"
                  value={investor}
                  onChange={(e) => setInvestor(e.target.value)}
                  data-testid="captable-raise-investor"
                />
                {investor.trim() && !validInvestor && <span className="field-err">Enter a valid wallet address (or pick a member above).</span>}
              </div>
              <div className="field">
                <label>Amount</label>
                <div className="input-with-unit">
                  <input
                    className="input mono"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => setAmount(num(e))}
                    data-testid="captable-raise-amount"
                  />
                  <span className="input-unit">USD</span>
                </div>
              </div>

              {(type.id === "safe" || type.id === "note") && (
                <>
                  <div className="field">
                    <label>Valuation cap</label>
                    <div className="input-with-unit">
                      <input
                        className="input mono"
                        value={valCap}
                        onChange={(e) => setValCap(num(e))}
                      />
                      <span className="input-unit">USD</span>
                    </div>
                  </div>
                  <div className="field">
                    <label>Discount</label>
                    <div className="input-with-unit">
                      <input
                        className="input mono"
                        value={discount}
                        onChange={(e) => setDiscount(num(e))}
                      />
                      <span className="input-unit">%</span>
                    </div>
                  </div>
                </>
              )}

              {type.id === "note" && (
                <>
                  <div className="field">
                    <label>Interest rate</label>
                    <div className="input-with-unit">
                      <input
                        className="input mono"
                        value={interest}
                        onChange={(e) => setInterest(num(e))}
                      />
                      <span className="input-unit">% / yr</span>
                    </div>
                  </div>
                  <div className="field">
                    <label>Maturity</label>
                    <div className="input-with-unit">
                      <input
                        className="input mono"
                        value={maturity}
                        onChange={(e) => setMaturity(num(e))}
                      />
                      <span className="input-unit">months</span>
                    </div>
                  </div>
                </>
              )}

              {type.id === "rbf" && (
                <>
                  <div className="field">
                    <label>Revenue share</label>
                    <div className="input-with-unit">
                      <input
                        className="input mono"
                        value={revShare}
                        onChange={(e) => setRevShare(num(e))}
                      />
                      <span className="input-unit">% of rev</span>
                    </div>
                  </div>
                  <div className="field">
                    <label>Repayment cap</label>
                    <div className="input-with-unit">
                      <input
                        className="input mono"
                        value={repayCap}
                        onChange={(e) => setRepayCap(num(e))}
                      />
                      <span className="input-unit">× principal</span>
                    </div>
                  </div>
                </>
              )}

              {type.id === "profit" && (
                <>
                  <div className="field">
                    <label>Threshold value</label>
                    <div className="input-with-unit">
                      <input
                        className="input mono"
                        value={threshold}
                        onChange={(e) => setThreshold(num(e))}
                      />
                      <span className="input-unit">USD</span>
                    </div>
                  </div>
                  <div className="field">
                    <label>Distribution weight</label>
                    <div className="input-with-unit">
                      <input
                        className="input mono"
                        value={distWeight}
                        onChange={(e) => setDistWeight(num(e))}
                      />
                      <span className="input-unit">
                        % · bps {Math.round(Number(distWeight) * 100)}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="cd-note accent">
              <span>ℹ</span>
              <span>
                {type.issues ? (
                  <>
                    This <b>issues shares immediately</b>.
                  </>
                ) : (
                  <>
                    A {type.name} <b>doesn't issue shares now</b> — it's recorded
                    as an outstanding instrument
                    {type.id === "safe" || type.id === "note" ? (
                      <>
                        {" "}
                        and converts in your next priced round at the better of
                        cap or discount.
                      </>
                    ) : (
                      "."
                    )}
                  </>
                )}
              </span>
            </div>
          </div>

          <div className="cd-note">
            <span>🛡</span>
            <span>
              A <b>CapTableManager</b> can record this; minting/conversion of real
              equity routes through governance. Recording logs the instrument — it
              doesn't move equity.
            </span>
          </div>
          {!wireable && (
            <div className="cd-note">
              <span>•</span>
              <span>
                On-chain wiring for {type.name.toLowerCase()} isn't available yet —
                submitting returns to the instrument picker.
              </span>
            </div>
          )}
        </div>

        <div className="cts-aside">
          <div className="cts-card">
            <span className="cts-card-k">Summary</span>
            <span className="cts-card-v" style={{ fontSize: 22 }}>
              {amount ? abbrevUsd(Number(amount)) : "$0"}
            </span>
            <div className="cts-leg">
              <div className="cts-leg-row">
                <span
                  className="cts-leg-name"
                  style={{ color: "var(--text-mute)" }}
                >
                  Instrument
                </span>
                <span className="cts-leg-val">{type.name}</span>
              </div>
              {(type.id === "safe" || type.id === "note") && (
                <>
                  <div className="cts-leg-row">
                    <span
                      className="cts-leg-name"
                      style={{ color: "var(--text-mute)" }}
                    >
                      Valuation cap
                    </span>
                    <span className="cts-leg-val">
                      {valCap ? abbrevUsd(Number(valCap)) : "—"}
                    </span>
                  </div>
                  <div className="cts-leg-row">
                    <span
                      className="cts-leg-name"
                      style={{ color: "var(--text-mute)" }}
                    >
                      Discount
                    </span>
                    <span className="cts-leg-val">{discount || 0}%</span>
                  </div>
                </>
              )}
              {type.id === "note" && (
                <div className="cts-leg-row">
                  <span
                    className="cts-leg-name"
                    style={{ color: "var(--text-mute)" }}
                  >
                    Interest
                  </span>
                  <span className="cts-leg-val">
                    {interest || 0}% · {maturity}mo
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="cts-foot">
        <span className="cts-foot-hint">✎ Recorded to the instrument register</span>
        <div className="cts-foot-actions">
          <button className="btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="btn-primary"
            disabled={!canSubmit}
            style={{
              opacity: canSubmit ? 1 : 0.5,
              cursor: canSubmit ? "pointer" : "not-allowed",
            }}
            onClick={record}
            data-testid="captable-raise-submit"
          >
            ✓ {busy ? "Recording…" : `Record ${type.name}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── priced round (3 steps, with conversion) ──
const NEW_COLOR = "oklch(0.7 0.13 300)";

interface PricedRoundFlowProps {
  orgName: string;
  instruments: FundInstrument[];
  fdPreShares: number;
  onCancel: () => void;
  onOpenRound: FundraisingViewProps["onOpenRound"];
  onConvertSafes: FundraisingViewProps["onConvertSafes"];
}

function PricedRoundFlow({
  orgName,
  instruments,
  fdPreShares,
  onCancel,
  onOpenRound,
  onConvertSafes,
}: PricedRoundFlowProps) {
  const STEPS = ["Round terms", "Convert instruments", "Review & issue"];
  const [step, setStep] = useState(0);
  const [price, setPrice] = useState(2);
  const [className, setClassName] = useState("Preferred A");
  const [leadInvestor, setLeadInvestor] = useState("Lighthouse Capital");
  const [leadAmount, setLeadAmount] = useState(3000000);
  const [busy, setBusy] = useState(false);

  const outstanding = instruments.filter(
    (i) => i.kind === "safe" || i.kind === "note",
  );
  const [included, setIncluded] = useState<Record<number, boolean>>(() =>
    outstanding.reduce<Record<number, boolean>>((m, i) => {
      m[i.id] = true;
      return m;
    }, {}),
  );

  const conv = outstanding.map((i) => ({
    inst: i,
    ...instConversion(i, price, fdPreShares),
    on: !!included[i.id],
  }));
  const convShares = conv.filter((c) => c.on).reduce((s, c) => s + c.shares, 0);
  const leadShares =
    leadAmount > 0 && price > 0 ? Math.round(leadAmount / price) : 0;
  const roundShares = convShares + leadShares;
  const postFD = fdPreShares + roundShares;
  const newMoney =
    leadAmount + conv.filter((c) => c.on).reduce((s, c) => s + c.principal, 0);

  async function commit() {
    if (busy) return;
    setBusy(true);
    try {
      await onOpenRound(String(price), String(fdPreShares));
      const includedIds = conv.filter((c) => c.on).map((c) => c.inst.id);
      await onConvertSafes(0, includedIds);
      onCancel();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="cts">
      <div className="cts-top">
        <button className="cts-back" onClick={onCancel}>
          <CaretBack /> Back to instruments
        </button>
        <div className="cts-acting">
          <span
            className="pw-kicker"
            style={{ display: "inline-flex", gap: 7, alignItems: "center" }}
          >
            $ Priced round
          </span>
        </div>
      </div>

      <div className="pw-steps">
        {STEPS.map((s, i) => (
          <div
            key={i}
            style={{ display: "contents" }}
          >
            <button
              className={`pw-step${i === step ? " active" : ""}${
                i < step ? " done" : ""
              }`}
              disabled={i > step}
              onClick={() => i <= step && setStep(i)}
            >
              <span className="pw-step-num">{i < step ? "✓" : i + 1}</span>
              {s}
            </button>
            {i < STEPS.length - 1 && (
              <span className={`pw-step-sep${i < step ? " done" : ""}`}></span>
            )}
          </div>
        ))}
      </div>

      <div className="cts-body">
        <div className="cts-main">
          {step === 0 && (
            <>
              <div>
                <div className="pw-kicker">Step 1 · Terms</div>
                <h2 className="cts-h">Set the round terms</h2>
                <p className="cts-sub">
                  A priced round sells shares at a fixed price into a new
                  Preferred class and issues immediately. Pre-money fully-diluted:{" "}
                  <b style={{ color: "var(--text)" }}>{fmtShares(fdPreShares)}</b>{" "}
                  shares.
                </p>
              </div>
              <div className="cts-class-card">
                <div className="cts-field-grid">
                  <div className="field">
                    <label>Price per share</label>
                    <div className="input-with-unit">
                      <input
                        className="input mono"
                        value={price}
                        onChange={(e) =>
                          setPrice(
                            Number(e.target.value.replace(/[^0-9.]/g, "")) || 0,
                          )
                        }
                      />
                      <span className="input-unit">USD</span>
                    </div>
                  </div>
                  <div className="field">
                    <label>New class name</label>
                    <input
                      className="input"
                      value={className}
                      onChange={(e) => setClassName(e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label>Lead investor</label>
                    <input
                      className="input"
                      value={leadInvestor}
                      onChange={(e) => setLeadInvestor(e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label>New money (lead)</label>
                    <div className="input-with-unit">
                      <input
                        className="input mono"
                        value={leadAmount ? fmtShares(leadAmount) : ""}
                        placeholder="0"
                        onChange={(e) =>
                          setLeadAmount(
                            Number(e.target.value.replace(/[^0-9]/g, "")),
                          )
                        }
                      />
                      <span className="input-unit">USD</span>
                    </div>
                  </div>
                </div>
                <div className="cd-note">
                  <span>ℹ</span>
                  <span>
                    Implied pre-money valuation{" "}
                    <b>{abbrevUsd(Math.round(price * fdPreShares))}</b> at{" "}
                    {fmtUsd(price)}/share. Lead buys{" "}
                    <b>{fmtShares(leadShares)}</b> shares.
                  </span>
                </div>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div>
                <div className="pw-kicker">Step 2 · Conversion</div>
                <h2 className="cts-h">Convert outstanding instruments</h2>
                <p className="cts-sub">
                  Each SAFE/note converts at the{" "}
                  <b style={{ color: "var(--text)" }}>better of</b> its valuation
                  cap or discount. Toggle any off to exclude it from this round.
                </p>
              </div>
              <div className="cts-alloc">
                <div className="fund-conv-head">
                  <span></span>
                  <span>Instrument</span>
                  <span className="num">Principal</span>
                  <span>Conv. price</span>
                  <span></span>
                  <span className="num">Shares</span>
                </div>
                {conv.length === 0 ? (
                  <div className="fund-conv-row">
                    <span></span>
                    <span style={{ color: "var(--text-mute)" }}>
                      No outstanding instruments to convert.
                    </span>
                  </div>
                ) : (
                  conv.map((c) => (
                    <div
                      key={c.inst.id}
                      className={`fund-conv-row${c.on ? "" : " off"}`}
                    >
                      <span
                        className={`fund-check${c.on ? " on" : ""}`}
                        onClick={() =>
                          setIncluded((m) => ({
                            ...m,
                            [c.inst.id]: !m[c.inst.id],
                          }))
                        }
                      >
                        {c.on && "✓"}
                      </span>
                      <div className="cts-alloc-who">
                        <span
                          className="m-avatar"
                          style={{
                            width: 28,
                            height: 28,
                            background: `oklch(0.55 0.14 ${c.inst.avatarHue})`,
                            fontSize: 10,
                            display: "inline-grid",
                            placeItems: "center",
                            borderRadius: "50%",
                            color: "#fff",
                            fontWeight: 600,
                          }}
                        >
                          {c.inst.investorShort}
                        </span>
                        <div className="cts-alloc-k">
                          <span className="cts-alloc-name">
                            {c.inst.investor}
                          </span>
                          <span className="cts-alloc-role">
                            <span className={`fund-kind ${c.inst.kind}`}>
                              {c.inst.kind}
                            </span>{" "}
                            cap {abbrevUsd(c.inst.valCap)} · {c.inst.discount}%
                            off
                          </span>
                        </div>
                      </div>
                      <span className="num mono" style={{ fontSize: 13 }}>
                        {abbrevUsd(c.principal)}
                      </span>
                      <span className="fund-conv-price">
                        {fmtUsd(Number(c.convPrice.toFixed(3)))}
                        <span className="fund-conv-via">{c.via}</span>
                      </span>
                      <span></span>
                      <span
                        className="num mono"
                        style={{
                          fontSize: 13,
                          color: c.on ? "var(--text)" : "var(--text-mute)",
                        }}
                      >
                        {fmtShares(c.shares)}
                      </span>
                    </div>
                  ))
                )}
                <div className="cts-alloc-foot">
                  <span className="k">
                    {conv.filter((c) => c.on).length} converting
                  </span>
                  <div
                    style={{ display: "flex", gap: 18, alignItems: "baseline" }}
                  >
                    <span className="k">New shares</span>
                    <span className="v">{fmtShares(roundShares)}</span>
                  </div>
                </div>
              </div>
              <div className="cd-note accent">
                <span>✦</span>
                <span>
                  Converted holders receive <b>{className}</b> shares fully
                  vested. Lead adds <b>{fmtShares(leadShares)}</b>; conversions
                  add <b>{fmtShares(convShares)}</b>.
                </span>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <div className="pw-kicker">Step 3 · Review</div>
                <h2 className="cts-h">Post-round ownership</h2>
                <p className="cts-sub">
                  Confirming issues{" "}
                  <b style={{ color: "var(--text)" }}>{className}</b> to the lead
                  and converted holders, and marks those instruments converted on{" "}
                  {orgName}'s register.
                </p>
              </div>
              <div className="cts-review-grid">
                <div className="cts-review-cell">
                  <span className="cts-card-k">New money</span>
                  <span className="cts-card-v" style={{ fontSize: 20 }}>
                    {abbrevUsd(newMoney)}
                  </span>
                </div>
                <div className="cts-review-cell">
                  <span className="cts-card-k">Shares issued</span>
                  <span className="cts-card-v" style={{ fontSize: 20 }}>
                    {abbrevShares(roundShares)}
                  </span>
                </div>
                <div className="cts-review-cell">
                  <span className="cts-card-k">Post-round FD</span>
                  <span className="cts-card-v" style={{ fontSize: 20 }}>
                    {abbrevShares(postFD)}
                  </span>
                </div>
              </div>
              <div className="cd-note accent">
                <span>🛡</span>
                <span>
                  {className} ranks <b>senior</b> (payout priority 1, 1×
                  non-participating). {conv.filter((c) => c.on).length} instrument
                  {conv.filter((c) => c.on).length === 1 ? "" : "s"} convert;
                  remaining stay outstanding.
                </span>
              </div>
            </>
          )}
        </div>

        <div className="cts-aside">
          <div className="cts-card">
            <span className="cts-card-k">
              {step === 2 ? "Post-round FD" : "Round so far"}
            </span>
            <span className="cts-card-v">
              {abbrevShares(roundShares)}
              <small>new shares</small>
            </span>
            <div className="cts-leg">
              <div className="cts-leg-row">
                <span
                  className="cts-leg-dot"
                  style={{ background: NEW_COLOR }}
                ></span>
                <span className="cts-leg-name">{className}</span>
                <span className="cts-leg-val">
                  {postFD > 0 ? fmtPct((roundShares / postFD) * 100) : "0%"}
                </span>
              </div>
              <div className="cts-leg-row">
                <span
                  className="cts-leg-name"
                  style={{ color: "var(--text-mute)" }}
                >
                  New money
                </span>
                <span className="cts-leg-val">{abbrevUsd(newMoney)}</span>
              </div>
              <div className="cts-leg-row">
                <span
                  className="cts-leg-name"
                  style={{ color: "var(--text-mute)" }}
                >
                  Price / share
                </span>
                <span className="cts-leg-val">{fmtUsd(price)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="cts-foot">
        <span className="cts-foot-hint">$ Issues shares on confirm</span>
        <div className="cts-foot-actions">
          {step > 0 && (
            <button className="btn-ghost" onClick={() => setStep((s) => s - 1)}>
              Back
            </button>
          )}
          {step < 2 ? (
            <button
              className="btn-primary"
              onClick={() => setStep((s) => s + 1)}
            >
              Continue →
            </button>
          ) : (
            <button className="btn-primary" disabled={busy} onClick={commit}>
              ✓ {busy ? "Issuing…" : "Confirm & issue round"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── top-level fundraising view ──
export function FundraisingView(props: FundraisingViewProps) {
  const {
    orgName,
    classes,
    members,
    fullyDiluted,
    instruments = [],
    onBack,
    onRecordSafe,
    onRecordNote,
    onOpenRound,
    onConvertSafes,
  } = props;
  // `holders` is part of the public prop contract (post-round split rendering)
  // but the wired flow derives everything from `fullyDiluted`, so it's unused here.

  const [mode, setMode] = useState<Mode>("pick");

  const primary = INSTRUMENT_TYPES.filter((t) => t.tier === 1);
  const secondary = INSTRUMENT_TYPES.filter((t) => t.tier === 2);

  const fdPreShares = fullyDiluted;
  const outstanding = instruments;
  const outTotal = outstanding.reduce((s, i) => s + i.amount, 0);

  if (mode === "round") {
    return (
      <section className="section" style={{ paddingTop: 28 }}>
        <div className="container">
          <PricedRoundFlow
            orgName={orgName}
            instruments={instruments}
            fdPreShares={fdPreShares}
            onCancel={() => setMode("pick")}
            onOpenRound={onOpenRound}
            onConvertSafes={onConvertSafes}
          />
        </div>
      </section>
    );
  }

  if (mode === "safe" || mode === "note" || mode === "rbf" || mode === "profit") {
    const t = INSTRUMENT_TYPES.find((x) => x.id === mode);
    if (t) {
      return (
        <section className="section" style={{ paddingTop: 28 }}>
          <div className="container">
            <InstrumentForm
              type={t}
              classes={classes}
              members={members}
              onCancel={() => setMode("pick")}
              onRecordSafe={onRecordSafe}
              onRecordNote={onRecordNote}
            />
          </div>
        </section>
      );
    }
  }

  return (
    <>
      <section className="gov-hero">
        <div className="container gov-hero-inner">
          <div>
            <div className="crumb">{orgName} · Equity · Fundraising</div>
            <h1>Raise capital</h1>
          </div>
          <button className="btn-ghost" onClick={onBack}>
            <CaretBack /> Back to cap table
          </button>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 28 }}>
        <div className="container">
          <div className="fund">
            <p className="fund-lead cts-sub" style={{ margin: 0 }}>
              Pick an instrument. SAFEs and notes are recorded now and convert
              later; a priced round issues Preferred immediately and converts
              outstanding instruments.
            </p>

            <div>
              <div className="fund-section-k">Primary instruments</div>
              <div className="pw-methods">
                {primary.map((t) => (
                  <button
                    key={t.id}
                    className="pw-method"
                    onClick={() => setMode(t.id as Mode)}
                    data-testid={`captable-raise-pick-${t.id}`}
                  >
                    <span className="pw-method-icon">{INST_ICON[t.id]}</span>
                    <span className="pw-method-k">
                      <span className="pw-method-name">{t.name}</span>
                      <span className="pw-method-sub">{t.blurb}</span>
                    </span>
                    <span className="pw-method-cta">
                      {t.issues ? "Issues shares" : "Record"} →
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="fund-section-k">
                Alternative structures · advanced
              </div>
              <div className="fund-secondary">
                {secondary.map((t) => (
                  <button
                    key={t.id}
                    className="pw-type"
                    onClick={() => setMode(t.id as Mode)}
                    data-testid={`captable-raise-pick-${t.id}`}
                  >
                    <span className="pw-type-icon">{INST_ICON[t.id]}</span>
                    <span className="pw-type-k">
                      <span className="pw-type-name">{t.name}</span>
                      <span className="pw-type-sub">{t.blurb}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="fund-section-k">Outstanding instruments</div>
              {outstanding.length === 0 ? (
                <div className="fund-out-summary">
                  <span>No outstanding instruments.</span>
                </div>
              ) : (
                <div className="fund-out">
                  {outstanding.map((i) => (
                    <div key={i.id} className="fund-inst">
                      <span
                        className="m-avatar"
                        style={{
                          width: 34,
                          height: 34,
                          background: `oklch(0.55 0.14 ${i.avatarHue})`,
                          fontSize: 12,
                          display: "inline-grid",
                          placeItems: "center",
                          borderRadius: "50%",
                          color: "#fff",
                          fontWeight: 600,
                        }}
                      >
                        {i.investorShort}
                      </span>
                      <div className="fund-inst-k">
                        <span className="fund-inst-name">
                          {i.investor}{" "}
                          <span className={`fund-kind ${i.kind}`}>{i.kind}</span>
                        </span>
                        <span className="fund-inst-terms">
                          <span>
                            cap <b>{abbrevUsd(i.valCap)}</b>
                          </span>
                          <span>
                            disc <b>{i.discount}%</b>
                          </span>
                          {i.kind === "note" && (
                            <span>
                              int <b>{i.interest}%</b>
                            </span>
                          )}
                          {i.date && <span>· {i.date}</span>}
                        </span>
                      </div>
                      <span className="fund-inst-amt">
                        {abbrevUsd(i.amount)}
                        <small>
                          {i.kind === "safe" ? "post-money" : "principal"}
                        </small>
                      </span>
                    </div>
                  ))}
                  <div className="fund-out-summary">
                    <span>
                      <b>{outstanding.length}</b> outstanding ·{" "}
                      <b>{abbrevUsd(outTotal)}</b> raised on SAFEs/notes
                    </span>
                    <button
                      className="btn-primary btn-sm"
                      onClick={() => setMode("round")}
                    >
                      $ Open priced round to convert
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
