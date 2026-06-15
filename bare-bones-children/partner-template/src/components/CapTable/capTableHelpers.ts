// Formatting + a default-class factory shared across the cap-table UI.
import { ethers } from "ethers";
import {
  type ClassParams,
  DistributionPolicy,
  VestKind,
} from "../../hooks/capTable/capTableTypes";

const ZERO = ethers.constants.AddressZero;

// Single source of truth for cap-table amount scaling. The contract NEVER scales — it stores raw
// 18-decimal base units. The frontend ALWAYS scales: inputs are entered as whole TOKEN units
// (ethers, not wei) and converted with these helpers. Reuse everywhere amounts cross the boundary.
export const TOKEN_DECIMALS = 18;

/** Whole tokens (UI input) → 18-decimal base-unit string for the contract. */
export function parseTokens(wholeTokens: string): string {
  return ethers.utils.parseUnits((wholeTokens || "0").trim(), TOKEN_DECIMALS).toString();
}

/** 18-decimal base units (from the contract) → whole-token number for display. */
export function formatTokens(baseUnits: ethers.BigNumberish): number {
  return Number(ethers.utils.formatUnits(ethers.BigNumber.from(baseUnits), TOKEN_DECIMALS));
}

export function fmtShares(n: number): string {
  return n.toLocaleString("en-US");
}

export function abbrevShares(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}k`;
  return String(n);
}

export function fmtPct(p: number): string {
  if (!isFinite(p)) return "0%";
  if (p > 0 && p < 0.1) return "<0.1%";
  return `${p.toFixed(p >= 10 ? 0 : 1)}%`;
}

export function bpsToX(bps: number): string {
  return `${(bps / 10000).toFixed(bps % 10000 === 0 ? 0 : 2)}x`;
}

export function fmtUsd(n: number): string {
  return `$${Number(n).toLocaleString("en-US")}`;
}

export function abbrevUsd(n: number): string {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (a >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n}`;
}

const SEC_YEAR = 365 * 24 * 60 * 60;
const SEC_MONTH = 30 * 24 * 60 * 60;
const SEC_DAY = 24 * 60 * 60;

export function secToDur(s: number): string {
  if (!s) return "none";
  const y = s / SEC_YEAR;
  if (y >= 1 && Number.isInteger(y)) return `${y} yr`;
  if (y >= 1) return `${y.toFixed(1)} yr`;
  const m = Math.round(s / SEC_MONTH);
  if (m >= 1) return `${m} mo`;
  return `${Math.round(s / SEC_DAY)} d`;
}

export function payoutLabel(p: number): string {
  return p <= 1 ? "Senior · 1st" : p >= 100 ? "Residual · last" : `#${p}`;
}

export function distLabel(bps: number): string {
  if (bps === 10000) return "1.0×";
  if (bps > 10000) return `+${(bps - 10000) / 100}%`;
  return `${(bps / 10000).toFixed(2)}×`;
}

export function shortAddress(a: string): string {
  return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "";
}

const ONE_YEAR = 365 * 24 * 60 * 60;

export function vestSummary(p: ClassParams): string {
  if (p.vestKind === VestKind.None) return "Fully vested";
  const yrs = (s: number) => `${(s / ONE_YEAR).toFixed(s % ONE_YEAR === 0 ? 0 : 1)}y`;
  if (p.vestKind === VestKind.Linear) {
    const cliff = p.vestCliff ? `${yrs(p.vestCliff)} cliff` : "no cliff";
    return `Linear · ${yrs(p.vestDuration)} · ${cliff}`;
  }
  return "Chunked";
}

/** A sensible default Common class for setup/createClass — the DB/DC 506(b)/(c) preset:
 *  1.0x vote weight, no vesting (founders), real equity, full governance participation. */
export function defaultCommonClass(name = "Common"): ClassParams {
  return {
    name,
    voteWeightBps: 10000,
    vestKind: VestKind.None,
    vestCliff: 0,
    vestDuration: 0,
    vestPeriod: 0,
    chunkAmount: "0",
    transferLockDuration: 0,
    transferGate: ZERO,
    payoutPriority: 1,
    distributionWeightBps: 10000,
    distributionPolicy: DistributionPolicy.VestedOnly,
    authorizedCap: "0",
    excludeFromFullyDiluted: false,
    excludeFromVotingTotal: false,
    unvestedVotes: false,
    requiresLiquidityEvent: false,
    vestingStrategy: ZERO,
    transferPolicy: ZERO,
    voteStrategy: ZERO,
  };
}

/** Standard 1-yr cliff / 4-yr linear employee vesting, applied on a Common-shaped class. */
export function standardVestingClass(name: string): ClassParams {
  return {
    ...defaultCommonClass(name),
    vestKind: VestKind.Linear,
    vestCliff: ONE_YEAR,
    vestDuration: 4 * ONE_YEAR,
    vestPeriod: 30 * 24 * 60 * 60,
  };
}
