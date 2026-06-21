// Share Lending Market — shared bits: prototype-style Modal + Field, the small
// presentational atoms (OrgAvatar / StatusPill / TeaserChips), and the action /
// toast types threaded through the mock. Ported from Designs/Bare Bones/app/lending*.jsx.
import type { ReactNode } from "react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { I } from "./lendingIcons";
import { ASSET_TYPES, LISTING_STATUS } from "./lendingData";
import type { ListingPhase, Org, Teaser } from "./lendingData";

// ── toast adapter shape (mapped onto the app's toast store by LendingPage) ──
export type LmToastFn = (title: string, opts?: { description?: string; duration?: number }) => void;
export interface LmToast {
  success: LmToastFn;
  info: LmToastFn;
  warning: LmToastFn;
  error: LmToastFn;
}

// ── lifecycle action surface (all local-state mutations — nothing on-chain) ──
export interface QuoteDraft {
  amount: number;
  rateBps: number;
  termMonths: number;
  expiryDays: number;
}
export interface ListDraft {
  asset: string;
  assetSub: string;
  assetType: string;
  classId: string;
  /** Numeric on-chain class index the shares are pledged from (the collateral class). */
  classIdNum: number;
  pledgedShares: number;
  valuePerShare: number;
  wantAmount: number;
  maxRateBps: number;
  termMonths: number;
  requireDeposit: boolean;
  depositAmount: number;
  mediator: string;
  lien: string;
  title: string;
  rented: boolean;
  rentRate: string;
  occupancy: string;
  noi: string;
  appraisal: string;
  docLink: string;
  docHash: string;
}
export interface LendingActions {
  postQuote: (id: string, draft: QuoteDraft) => void;
  withdrawQuote: (id: string, qid: string) => void;
  acceptQuote: (id: string, qid: string) => void;
  declineQuote: (id: string, qid: string) => void;
  fundLoan: (id: string) => void;
  repayLoan: (id: string) => void;
  foreclose: (id: string) => void;
  forfeitDeposit: (id: string) => void;
  listCollateral: (draft: ListDraft) => void;
  release: (id: string, label: string) => void;
}
export type RequireWallet = (fn: () => void) => () => void;

export type ModalKind = "quote" | "fund" | "repay" | "foreclose" | "dispute" | "list";
export interface ModalState {
  kind: ModalKind;
  listingId?: string;
}

// ── prototype-style modal (scrim / head / body / foot) ──
export function Modal({
  title,
  onClose,
  width = 440,
  children,
}: {
  title: string;
  onClose: () => void;
  width?: number;
  children: ReactNode;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div className="lm-scope">
      <div
        className="modal-scrim"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="modal" style={{ maxWidth: width }} onMouseDown={(e) => e.stopPropagation()}>
          <div className="modal-head">
            <h3>{title}</h3>
            <button className="modal-close" onClick={onClose} aria-label="Close">
              <I.Close size={16} />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function Field({
  label,
  hint,
  children,
  full,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
  full?: boolean;
}) {
  return (
    <div className={`field${full ? " full" : ""}`}>
      <label>{label}</label>
      {children}
      {hint && <div className="field-hint">{hint}</div>}
    </div>
  );
}

export const parseNum = (s: string | number): number => {
  const n = Number(String(s).replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : n;
};

// ── presentational atoms ──
export function OrgAvatar({ org, size = 30 }: { org: Org; size?: number }) {
  return (
    <span
      className="lm-org-av"
      style={{ width: size, height: size, background: org.bg, fontSize: size * 0.42 }}
    >
      {org.glyph}
    </span>
  );
}

export function StatusPill({ phase, lg }: { phase: ListingPhase; lg?: boolean }) {
  const s = LISTING_STATUS[phase] || LISTING_STATUS.open;
  return (
    <span className={`pay-status pay-status-${s.tone}${lg ? " pay-status-lg" : ""}`}>
      <span className="pay-status-dot" />
      {s.label}
    </span>
  );
}

export function TeaserChips({ teaser, assetType }: { teaser: Teaser; assetType: string }) {
  return (
    <div className="lm-chips">
      <span className="lm-chip">
        <I.Layers size={12} />
        {ASSET_TYPES[assetType]}
      </span>
      {teaser.rented && (
        <span className="lm-chip good">
          <I.Check size={12} />
          Leased · {teaser.occupancy}
        </span>
      )}
      <span className="lm-chip">
        <I.Shield size={12} />
        {teaser.lien}
      </span>
    </div>
  );
}
