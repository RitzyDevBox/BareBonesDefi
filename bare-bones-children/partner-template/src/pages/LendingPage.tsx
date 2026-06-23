// Share Lending Market — page shell wired to the real stack. The cross-org order book comes from
// the subgraph ⋈ BareBonesApi metadata (useLendingMarket); the lifecycle actions are real contract
// calls (useLendingActions); a Super Admin enables their org via useLendingAdmin. The presentational
// components (header / book / cards / detail / modals) and the CSS are unchanged from the design port.
import { useCallback, useMemo, useState } from "react";
import "../styles/lending.css";
import { PageContainer } from "../components/PageWrapper/PageContainer";
import { useWalletProvider } from "../hooks/useWalletProvider";
import { useActiveOrganization } from "../providers/ActiveOrganizationProvider";
import { orgSlugFor } from "../utils/payroll/orgSlug";
import { useToastStore } from "../components/Toasts/useToastStore";
import { ToastBehavior, ToastPosition, ToastType } from "../components/Toasts/toast.types";
import { I } from "../components/Lending/lendingIcons";
import { ListingDetail } from "../components/Lending/LendingDetail";
import { LendingModals } from "../components/Lending/LendingModals";
import { EnableLendingModal } from "../components/Lending/EnableLendingModal";
import {
  OrgAvatar, StatusPill, TeaserChips,
  type LmToast, type ModalState, type RequireWallet,
} from "../components/Lending/lendingShared";
import {
  ASSET_TYPES,
  abbrevShares, abbrevUsd, bpsPct, listingPhase, loanMath, monthsLabel,
  type ActiveDao, type Listing, type Pov,
} from "../components/Lending/lendingData";
import { useLendingMarket } from "../hooks/lending/useLendingMarket";
import { useLendingActions } from "../hooks/lending/useLendingActions";
import { useLendingAdmin } from "../hooks/lending/useLendingAdmin";
import { useOrgHoldings } from "../hooks/lending/useOrgHoldings";

const prettify = (name: string): string =>
  name.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim();

function safeSlug(name: string): string | null {
  try {
    return name ? orgSlugFor(name) : null;
  } catch {
    return null;
  }
}

export function LendingPage() {
  const { account, connect } = useWalletProvider();
  const { activeOrgSlug } = useActiveOrganization();
  const { showToast } = useToastStore();

  const orgName = activeOrgSlug ?? "";
  const slugBytes = useMemo(() => safeSlug(orgName), [orgName]);
  const activeDao: ActiveDao = useMemo(
    () => ({
      id: orgName,
      name: prettify(orgName) || "Your org",
      avatar: { glyph: (orgName[0] || "?").toUpperCase(), bg: "#2b3ad6" },
      owner: account ?? undefined,
    }),
    [orgName, account],
  );

  const { listings, meta, loading, error, classesForOrg } = useLendingMarket();
  const getListing = useCallback((id: string) => listings.find((l) => l.id === id), [listings]);
  const actions = useLendingActions({
    marketAddress: meta?.marketAddress ?? "",
    decimals: meta?.decimals ?? 18,
    activeSlugBytes: slugBytes,
    getListing,
  });
  const admin = useLendingAdmin(slugBytes, orgName || null);
  const orgClasses = slugBytes ? classesForOrg(slugBytes) : [];
  // Only classes the connected wallet actually holds free shares in are pledgeable.
  const holdable = useOrgHoldings(admin.shareToken, orgClasses).filter((c) => (c.free ?? 0) > 0);

  // The mock assumed a connected lender; real wiring uses the connected wallet, and requireWallet
  // prompts a connect when needed.
  const wallet = account;
  const requireWallet: RequireWallet = (fn) => () => {
    if (!wallet) {
      void connect();
      return;
    }
    fn();
  };

  // ListingDetail's doc-link uses a small info toast — bridge it to the global toast host.
  const toast: LmToast = useMemo(() => {
    let n = 0;
    const mk =
      (type: ToastType) =>
      (title: string, opts?: { description?: string; duration?: number }) =>
        showToast({
          id: `lm-${Date.now()}-${n++}`,
          title,
          message: opts?.description,
          type,
          behavior: ToastBehavior.AutoClose,
          position: ToastPosition.Top,
          durationMs: opts?.duration ?? 4000,
        });
    return {
      success: mk(ToastType.Success),
      info: mk(ToastType.Info),
      warning: mk(ToastType.Warn),
      error: mk(ToastType.Error),
    };
  }, [showToast]);

  // List collateral is only callable once lending is enabled for the org AND the wallet holds
  // pledgeable shares — otherwise the on-chain call reverts (ShareTokenNotSet / InsufficientFree).
  const openList = requireWallet(() => {
    if (!admin.enabled) {
      toast.warning("Enable lending first", { description: "Register this org's cap table before listing collateral." });
      return;
    }
    if (holdable.length === 0) {
      toast.warning("No shares to pledge", { description: "You hold no free shares in this org's classes." });
      return;
    }
    setModal({ kind: "list" });
  });

  const [pov, setPov] = useState<Pov>(() => {
    try {
      return (localStorage.getItem("lm-pov") as Pov) || "lender";
    } catch {
      return "lender";
    }
  });
  const setPovP = (p: Pov) => {
    setPov(p);
    try {
      localStorage.setItem("lm-pov", p);
    } catch {
      /* ignore */
    }
  };

  const [tab, setTab] = useState("market");
  const [openId, setOpenId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [enableOpen, setEnableOpen] = useState(false);
  const layout: "cards" | "table" = "cards";

  const goListing = (id: string | null) => {
    setOpenId(id);
    if (id) window.scrollTo({ top: 0 });
  };

  // Market not deployed on this chain.
  if (!meta && !loading) {
    return (
      <PageContainer maxWidth={1200}>
        <div className="lm-scope">
          <div className="lm-page" style={{ padding: "28px 0 80px" }}>
            <div className="lm-empty">
              <span className="lm-empty-icon"><I.Layers size={22} /></span>
              <h4>Lending market unavailable</h4>
              <p>The Share Lending Market isn't deployed on this chain yet.</p>
            </div>
          </div>
        </div>
      </PageContainer>
    );
  }

  // selected listing detail
  if (openId) {
    const sel = listings.find((l) => l.id === openId);
    if (!sel) {
      goListing(null);
      return null;
    }
    return (
      <PageContainer maxWidth={1200}>
        <div className="lm-scope">
          <div className="lm-page" style={{ padding: "8px 0 80px" }}>
            <ListingDetail
              listing={sel}
              pov={pov}
              wallet={wallet}
              activeDao={activeDao}
              onBack={() => goListing(null)}
              actions={actions}
              requireWallet={requireWallet}
              openModal={(kind) => setModal({ kind, listingId: sel.id })}
              toast={toast}
            />
          </div>
          {modal && (
            <LendingModals
              modal={modal}
              listing={listings.find((l) => l.id === modal.listingId) ?? null}
              activeDao={activeDao}
              onClose={() => setModal(null)}
              actions={actions}
              orgClasses={holdable}
            />
          )}
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth={1200}>
      <div className="lm-scope">
        <div className="lm-page" style={{ padding: "8px 0 80px" }}>
          <MarketHeader
            pov={pov}
            setPov={(p) => {
              setPovP(p);
              setTab(p === "lender" ? "market" : "mylistings");
            }}
            listings={listings}
            onList={openList}
          />

          {error && (
            <div className="pay-banner pay-banner-warn" style={{ gridTemplateColumns: "auto 1fr" }}>
              <I.Alert size={14} /><div>{error}</div>
            </div>
          )}
          {pov === "borrower" && slugBytes && !admin.checking && !admin.enabled && (
            <div className="pay-banner" style={{ gridTemplateColumns: "auto 1fr auto" }}>
              <I.Lock size={14} />
              <div><b>Lending isn't enabled for {activeDao.name}.</b> A Super Admin registers the cap table and allows the market to lock collateral.</div>
              <button className="pay-banner-act" onClick={requireWallet(() => setEnableOpen(true))}>Enable lending</button>
            </div>
          )}
          {loading && listings.length === 0 ? (
            <div className="muted small" style={{ padding: "8px 2px" }}>Loading the market…</div>
          ) : (
            <MarketBook
              listings={listings}
              pov={pov}
              tab={tab}
              setTab={setTab}
              activeDao={activeDao}
              layout={layout}
              onOpen={goListing}
              onList={openList}
            />
          )}
        </div>
        {modal && modal.kind === "list" && (
          <LendingModals modal={modal} listing={null} activeDao={activeDao} onClose={() => setModal(null)} actions={actions} orgClasses={holdable} />
        )}
        {enableOpen && <EnableLendingModal admin={admin} orgName={activeDao.name} onClose={() => setEnableOpen(false)} />}
      </div>
    </PageContainer>
  );
}

// ===================================================================
// Header: title + POV toggle + market stats
// ===================================================================
function MarketHeader({
  pov, setPov, listings, onList,
}: {
  pov: Pov; setPov: (p: Pov) => void; listings: Listing[]; onList: () => void;
}) {
  const open = listings.filter((l) => listingPhase(l) === "open");
  const active = listings.filter((l) => ["funded", "grace", "defaulted"].includes(listingPhase(l)));
  const openVol = open.reduce((s, l) => s + l.wantAmount, 0);
  const activeVol = active.reduce((s, l) => s + (l.loan ? loanMath(l.loan)!.principal : 0), 0);
  const rates = open.flatMap((l) => l.quotes.filter((q) => q.status === "pending").map((q) => q.rateBps));
  const bestRate = rates.length ? Math.min(...rates) : null;

  return (
    <>
      <div className="gov-hero lm-hero" style={{ padding: "8px 0 4px", border: 0 }}>
        <div className="lm-hero-inner">
          <div>
            <div className="crumb">Markets / Share Lending</div>
            <h1>Borrow against your shares.</h1>
            <div className="lm-hero-sub">
              A global, peer-to-peer order book. Any organization pledges a tranche of its SPV shares into escrow and posts an ask; eligible lenders compete with quotes. Pledge ≠ sale — only a default transfers the shares.
            </div>
          </div>
          <div className="lm-hero-r">
            <div className="lm-pov" role="tablist" aria-label="Point of view">
              <button className={`lm-pov-btn${pov === "lender" ? " on" : ""}`} onClick={() => setPov("lender")} role="tab" aria-selected={pov === "lender"}>
                <span className="lm-pov-dot" />Lend
              </button>
              <button className={`lm-pov-btn${pov === "borrower" ? " on" : ""}`} onClick={() => setPov("borrower")} role="tab" aria-selected={pov === "borrower"}>
                <span className="lm-pov-dot" />Borrow
              </button>
            </div>
            {pov === "borrower" && (
              <button className="btn-primary btn-sm" onClick={onList}><I.Plus size={13} /> List collateral</button>
            )}
          </div>
        </div>
      </div>

      <div className="lm-stats">
        <div className="lm-stat">
          <div className="lm-stat-k">Open listings</div>
          <div className="lm-stat-v">{open.length}<small>seeking quotes</small></div>
        </div>
        <div className="lm-stat">
          <div className="lm-stat-k">Open ask volume</div>
          <div className="lm-stat-v mono">{abbrevUsd(openVol)}</div>
        </div>
        <div className="lm-stat">
          <div className="lm-stat-k">Active loans</div>
          <div className="lm-stat-v">{active.length}<small>{abbrevUsd(activeVol)} principal</small></div>
        </div>
        <div className="lm-stat">
          <div className="lm-stat-k">Best open quote</div>
          <div className="lm-stat-v mono">{bestRate != null ? bpsPct(bestRate) : "—"}</div>
        </div>
      </div>
    </>
  );
}

// ===================================================================
// Book: tabs + cards/table
// ===================================================================
function MarketBook({
  listings, pov, tab, setTab, activeDao, layout, onOpen, onList,
}: {
  listings: Listing[]; pov: Pov; tab: string; setTab: (t: string) => void;
  activeDao: ActiveDao; layout: "cards" | "table"; onOpen: (id: string) => void; onList: () => void;
}) {
  const phaseOf = (l: Listing) => listingPhase(l);
  let tabs: { id: string; label: string; count: number }[];
  let filtered: Listing[];
  if (pov === "lender") {
    const market = listings.filter((l) => phaseOf(l) === "open");
    const myQuotes = listings.filter((l) => l.quotes.some((q) => q.mine && ["pending", "accepted"].includes(q.status)));
    const myLoans = listings.filter((l) => l.loan && l.loan.mine);
    tabs = [
      { id: "market", label: "Open market", count: market.length },
      { id: "myquotes", label: "My quotes", count: myQuotes.length },
      { id: "myloans", label: "My loans", count: myLoans.length },
    ];
    filtered = tab === "myquotes" ? myQuotes : tab === "myloans" ? myLoans : market;
  } else {
    const mine = listings.filter((l) => l.borrowerOrgId === activeDao.id);
    const activeM = mine.filter((l) => !["repaid", "foreclosed"].includes(l.status));
    const closedM = mine.filter((l) => ["repaid", "foreclosed"].includes(l.status));
    tabs = [
      { id: "mylistings", label: "My listings", count: activeM.length },
      { id: "closed", label: "Closed", count: closedM.length },
    ];
    filtered = tab === "closed" ? closedM : activeM;
    if (!["mylistings", "closed"].includes(tab)) filtered = activeM;
  }

  // attention strip — past-due loans relevant to this POV
  const attn =
    pov === "lender"
      ? listings.filter((l) => l.loan && l.loan.mine && ["grace", "defaulted"].includes(phaseOf(l)))
      : listings.filter((l) => l.borrowerOrgId === activeDao.id && ["grace", "defaulted"].includes(phaseOf(l)));
  const nDefault = attn.filter((l) => phaseOf(l) === "defaulted").length;
  const nGrace = attn.filter((l) => phaseOf(l) === "grace").length;

  return (
    <>
      {attn.length > 0 && (
        <div className="pay-banner pay-banner-warn" style={{ gridTemplateColumns: "auto 1fr auto" }}>
          <I.Alert size={14} />
          <div>
            <b>{attn.length} loan{attn.length === 1 ? "" : "s"} past due.</b>{" "}
            {pov === "lender" ? (
              <>
                {nDefault > 0 && <>{nDefault} claimable now</>}
                {nDefault > 0 && nGrace > 0 && " · "}
                {nGrace > 0 && <>{nGrace} in remission</>} — claim the collateral, or wait out the grace period.
              </>
            ) : (
              <>Repay before the remission period ends to release your pledged shares and avoid foreclosure.</>
            )}
          </div>
          <button className="pay-banner-act" onClick={() => setTab(pov === "lender" ? "myloans" : "mylistings")}>View</button>
        </div>
      )}
      <div className="tabs" style={{ marginBottom: 4 }}>
        {tabs.map((t) => (
          <button key={t.id} className={`tab${tab === t.id ? " active" : ""}`} onClick={() => setTab(t.id)}>
            {t.label}<span className="count">{t.count}</span>
          </button>
        ))}
      </div>

      {pov === "borrower" && (
        <div className="muted small" style={{ marginTop: -6 }}>
          Viewing as <b style={{ color: "var(--text)" }}>{activeDao.name}</b> — switch org from the context pill in the nav.
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="lm-empty">
          <span className="lm-empty-icon"><I.Layers size={22} /></span>
          <h4>{pov === "borrower" ? "No listings yet" : tab === "myquotes" ? "No active quotes" : tab === "myloans" ? "No loans funded" : "Market is quiet"}</h4>
          <p>
            {pov === "borrower"
              ? `${activeDao.name} hasn't pledged any collateral. List a tranche of shares to start borrowing.`
              : tab === "myquotes"
              ? "Browse the open market and post a quote to appear here."
              : tab === "myloans"
              ? "Quotes you fund become loans and show here."
              : "No open listings right now. Check back soon."}
          </p>
          {pov === "borrower" && <button className="btn-primary btn-sm" onClick={onList} style={{ marginTop: 6 }}><I.Plus size={13} /> List collateral</button>}
        </div>
      ) : layout === "table" ? (
        <div className="panel" style={{ padding: 0 }}>
          <div className="lm-table panel-table">
            <div className="lm-thead">
              <div>Asset / Borrower</div>
              <div>Type</div>
              <div className="lm-tnum">Amount</div>
              <div className="lm-tnum">Rate</div>
              <div className="lm-tnum">Term</div>
              <div>Status</div>
              <div className="lm-tgo" aria-hidden />
            </div>
            {filtered.map((l) => <ListingTableRow key={l.id} listing={l} onOpen={() => onOpen(l.id)} />)}
          </div>
        </div>
      ) : (
        <div className="lm-cards">
          {filtered.map((l) => <ListingCard key={l.id} listing={l} onOpen={() => onOpen(l.id)} />)}
        </div>
      )}
    </>
  );
}

// ---------- card ----------
function ListingCard({ listing: l, onOpen }: { listing: Listing; onOpen: () => void }) {
  const phase = listingPhase(l);
  const pending = l.quotes.filter((q) => q.status === "pending");
  const best = pending.length ? Math.min(...pending.map((q) => q.rateBps)) : null;
  const m = l.loan ? loanMath(l.loan) : null;
  const askPhase = phase === "open" || phase === "matched";

  return (
    <button className="lm-card" onClick={onOpen}>
      <div className="lm-card-top">
        <div className="lm-org">
          <OrgAvatar org={l.borrower} size={32} />
          <div className="lm-org-k">
            <span className="lm-org-name">{l.borrower.name}</span>
            <span className="lm-org-sub">Listed {l.postedAt}</span>
          </div>
        </div>
        <StatusPill phase={phase} />
      </div>

      <div>
        <div className="lm-card-title">{l.asset}</div>
        <div className="lm-card-asset-sub">{l.assetSub}</div>
      </div>

      <div className="lm-terms">
        <div className="lm-term">
          <div className="lm-term-k">{askPhase ? "Ask" : "Principal"}</div>
          <div className="lm-term-v mono">{abbrevUsd(askPhase ? l.wantAmount : m!.principal)}</div>
        </div>
        <div className="lm-term">
          <div className="lm-term-k">{askPhase ? "Max rate" : "Rate"}</div>
          <div className="lm-term-v mono">{bpsPct(askPhase ? l.maxRateBps : l.loan!.rateBps)}</div>
        </div>
        <div className="lm-term">
          <div className="lm-term-k">Term</div>
          <div className="lm-term-v mono">{monthsLabel(l.termMonths)}</div>
        </div>
      </div>

      <div className="lm-collat-row">
        <span className="lm-class-chip"><span className="lm-class-dot" style={{ background: l.classColor }} />{l.classId}</span>
        <span className="muted mono" style={{ fontSize: 12 }}>{abbrevShares(l.pledgedShares)} units pledged</span>
      </div>

      <TeaserChips teaser={l.teaser} assetType={l.assetType} />

      <div className="lm-card-foot">
        {phase === "open" ? (
          <span className="lm-foot-meta">{pending.length} quote{pending.length === 1 ? "" : "s"}{best != null && <> · best <b>{bpsPct(best)}</b></>}</span>
        ) : phase === "grace" ? (
          <span className="lm-foot-meta" style={{ color: "var(--warn)" }}>Grace ends in <b>{m!.daysToForeclose}d</b></span>
        ) : phase === "defaulted" ? (
          <span className="lm-foot-meta" style={{ color: "var(--error)" }}>Foreclosable now</span>
        ) : phase === "funded" ? (
          <span className="lm-foot-meta">Matures in <b>{m!.daysToMaturity}d</b></span>
        ) : (
          <span className="lm-foot-meta">{l.loan ? l.loan.lender.name : "—"}</span>
        )}
        <span className="pillar-cta" style={{ color: "var(--accent)" }}>View <I.Arrow size={12} /></span>
      </div>
    </button>
  );
}

// ---------- table row ----------
function ListingTableRow({ listing: l, onOpen }: { listing: Listing; onOpen: () => void }) {
  const phase = listingPhase(l);
  const m = l.loan ? loanMath(l.loan) : null;
  const askPhase = phase === "open" || phase === "matched";
  return (
    <button className="lm-trow" onClick={onOpen}>
      <div className="lm-org">
        <OrgAvatar org={l.borrower} size={30} />
        <div className="lm-org-k">
          <span className="lm-org-name" style={{ fontSize: 14 }}>{l.asset}</span>
          <span className="lm-org-sub">{l.borrower.name}</span>
        </div>
      </div>
      <div className="small muted">{ASSET_TYPES[l.assetType]}</div>
      <div className="lm-tnum">{abbrevUsd(askPhase ? l.wantAmount : m!.principal)}</div>
      <div className="lm-tnum">{bpsPct(askPhase ? l.maxRateBps : l.loan!.rateBps)}</div>
      <div className="lm-tnum">{monthsLabel(l.termMonths)}</div>
      <div><StatusPill phase={phase} /></div>
      <div className="lm-tgo"><I.Arrow size={14} /></div>
    </button>
  );
}
