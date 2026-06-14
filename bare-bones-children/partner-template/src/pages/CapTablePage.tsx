import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { ethers } from "ethers";
import "../styles/capTable.css";
import "../styles/capTableSurfaces.css";
import { PageContainer } from "../components/PageWrapper/PageContainer";
import { Stack } from "../components/Primitives";
import { useWalletProvider } from "../hooks/useWalletProvider";
import { useReadProvider } from "../hooks/useReadProvider";
import { useMtaState } from "../hooks/auth/useMtaState";
import { useActiveOrganization } from "../providers/ActiveOrganizationProvider";
import { DEFAULT_CHAIN_ID, getBareBonesConfiguration } from "../constants/misc";
import { SYSTEM_ROLE_SLUG } from "../constants/mtaRoles";
import { fetchOrganizationInfo } from "../hooks/payroll/useOrganizationRegistry";
import type { OrganizationModel } from "../models/payments";
import { useCapTable } from "../hooks/capTable/useCapTable";
import { useCapTableActions } from "../hooks/capTable/useCapTableActions";
import type { CapHolder } from "../hooks/capTable/capTableTypes";
import {
  CapTableSetup,
  CapTableView,
  IssueGrantModal,
  TransferModal,
  FundraisingView,
  ClassManager,
} from "../components/CapTable";

// Frontend gate for showing write affordances. On-chain MTA enforces the real permission set;
// this just hides buttons a caller couldn't use. SuperAdmin / Admin (the slug-owner surface) and
// the CapTableManager ops role may manage the table.
const CAP_TABLE_ADMIN_ROLE_SLUGS = new Set<string>([
  SYSTEM_ROLE_SLUG.SuperAdmin,
  SYSTEM_ROLE_SLUG.Admin,
  ethers.utils.formatBytes32String("CapTableManager"),
]);

type CapTableMode = "table" | "setup" | "raise" | "classes";

export function CapTablePage() {
  const { organizationId } = useParams<{ organizationId?: string }>();
  const { activeOrgSlug } = useActiveOrganization();
  const slug = (organizationId ?? activeOrgSlug ?? "").trim();

  const { account, chainId } = useWalletProvider();
  const readProvider = useReadProvider();
  const config = useMemo(() => getBareBonesConfiguration(chainId ?? DEFAULT_CHAIN_ID), [chainId]);

  const mtaState = useMtaState(slug);

  const [orgInfo, setOrgInfo] = useState<OrganizationModel | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!readProvider || !config.payrollManagerAddress || !slug) {
      setOrgInfo(null);
      return;
    }
    void fetchOrganizationInfo(readProvider, config.payrollManagerAddress, slug).then((info) => {
      if (!cancelled) setOrgInfo(info);
    });
    return () => {
      cancelled = true;
    };
  }, [readProvider, config.payrollManagerAddress, slug]);

  const owner = orgInfo?.exists ? orgInfo.owner : null;
  const { state, refresh } = useCapTable(slug, owner, mtaState.members);
  const actions = useCapTableActions(slug, state.shareTokenAddress);

  const isAdmin = useMemo(() => {
    if (!account) return false;
    if (orgInfo?.exists && orgInfo.owner.toLowerCase() === account.toLowerCase()) return true;
    const me = mtaState.members.find((m) => m.wallet?.address?.toLowerCase() === account.toLowerCase());
    if (!me) return false;
    return me.roles.some((s) => CAP_TABLE_ADMIN_ROLE_SLUGS.has(s));
  }, [account, orgInfo, mtaState.members]);

  const [mode, setMode] = useState<CapTableMode>("table");
  const [issueOpen, setIssueOpen] = useState(false);
  const [issuePrefill, setIssuePrefill] = useState<CapHolder | null>(null);
  const [transferHolder, setTransferHolder] = useState<CapHolder | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  const backToTable = async () => {
    setMode("table");
    await refresh();
  };

  if (!slug) {
    return (
      <PageContainer maxWidth={1440}>
        <Stack gap="md">
          <div className="ct-help">Select an organization to view its cap table.</div>
        </Stack>
      </PageContainer>
    );
  }

  // Full-page surfaces (their own gov-hero header).
  if (mode === "raise") {
    return (
      <PageContainer maxWidth={1440}>
        <FundraisingView
          orgName={slug}
          classes={state.classes}
          holders={state.holders}
          members={mtaState.members}
          fullyDiluted={state.fullyDiluted || state.issuedTotal}
          onBack={backToTable}
          onRecordSafe={(investor, principal, cap, discountBps, targetClassId) =>
            actions.recordSafe(investor, principal, cap, discountBps, targetClassId)
          }
          onRecordNote={(investor, principal, cap, discountBps, interestRateBps, maturityUnix, targetClassId) =>
            actions.recordNote(investor, principal, cap, discountBps, interestRateBps, maturityUnix, targetClassId)
          }
          onOpenRound={(pricePerShare, preConversionShares) => actions.openRound(pricePerShare, preConversionShares)}
          onConvertSafes={(roundId, ids) => actions.convertSafes(roundId, ids)}
        />
      </PageContainer>
    );
  }
  if (mode === "classes") {
    return (
      <PageContainer maxWidth={1440}>
        <ClassManager
          orgName={slug}
          classes={state.classes}
          onBack={backToTable}
          onCreateClass={(params) => actions.createClass(params)}
          onRetireClass={(classId) => actions.retireClass(classId)}
          onRemoveClass={(classId) => actions.removeClass(classId)}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth={1440}>
      <Stack gap="lg">
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div className="crumb">
              {slug} · {chainId != null ? `Chain ${chainId}` : "—"} · Equity
            </div>
            <h1 style={{ margin: "4px 0 0", fontSize: 30, fontWeight: 600, color: "var(--colors-text-main)" }}>
              Cap table
            </h1>
          </div>
          {mode === "table" && state.hasTable && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span className="ct-role">
                <span className="ct-role-dot" /> Acting as <b>{isAdmin ? "Super Admin" : "Holder"}</b>
              </span>
              {isAdmin && (
                <>
                  <button className="btn-ghost" onClick={() => setMode("classes")} data-testid="captable-classes-btn">
                    Classes
                  </button>
                  <button className="btn-ghost" onClick={() => setMode("raise")} data-testid="captable-raise-btn">
                    Raise
                  </button>
                  <button
                    className="btn-primary"
                    onClick={() => {
                      setIssuePrefill(null);
                      setIssueOpen(true);
                    }}
                    data-testid="captable-issue-grant-btn"
                  >
                    + Issue grant
                  </button>
                  <div style={{ position: "relative" }} ref={menuRef}>
                    <button
                      className="icon-btn"
                      onClick={() => setMenuOpen((o) => !o)}
                      aria-label="More cap-table actions"
                      data-testid="captable-overflow-btn"
                    >
                      ⋯
                    </button>
                    {menuOpen && (
                      <div className="menu" style={{ top: "calc(100% + 6px)", right: 0, minWidth: 220 }} role="menu">
                        <button
                          className="menu-item"
                          onClick={() => {
                            setMenuOpen(false);
                            const header = "Holder,Class,Shares,Vested\n";
                            const rows = state.holders
                              .map((h) => {
                                const cls = state.classes.find((c) => c.classId === h.classId);
                                return `${h.name},${cls?.params.name ?? h.classId},${h.shares},${h.vested}`;
                              })
                              .join("\n");
                            const blob = new Blob([header + rows], { type: "text/csv" });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `${slug}-cap-table.csv`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                          data-testid="captable-export-csv"
                        >
                          Export CSV
                        </button>
                        <button className="menu-item" disabled style={{ opacity: 0.5 }}>
                          Ownership snapshot (PDF) <span className="mi-sub">soon</span>
                        </button>
                        <div className="menu-sep" />
                        <button
                          className="menu-item"
                          onClick={() => {
                            setMenuOpen(false);
                            setMode("setup");
                          }}
                          data-testid="captable-open-setup"
                        >
                          Open setup wizard
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {state.error && (
          <div className="ct-help" style={{ color: "var(--colors-error)" }} data-testid="captable-error">
            {state.error}
          </div>
        )}

        {mode === "setup" ? (
          <CapTableSetup
            orgSlug={slug}
            members={mtaState.members}
            onCancel={() => setMode("table")}
            onComplete={async (cfg) => {
              const addr = await actions.deployCapTable(cfg);
              await backToTable();
              return addr;
            }}
          />
        ) : state.loading && !state.hasTable ? (
          <div className="ct-help" data-testid="captable-loading">
            Loading cap table…
          </div>
        ) : (
          <CapTableView
            state={state}
            isAdmin={isAdmin}
            account={account}
            onSetup={() => setMode("setup")}
            onIssue={(holder) => {
              setIssuePrefill(holder ?? null);
              setIssueOpen(true);
            }}
            onTransfer={(holder) => setTransferHolder(holder)}
          />
        )}
      </Stack>

      {issueOpen && (
        <IssueGrantModal
          classes={state.classes}
          members={mtaState.members}
          prefill={issuePrefill}
          onClose={() => setIssueOpen(false)}
          onIssue={(classId, to, amount) => actions.issueGrant(classId, to, amount)}
        />
      )}
      {transferHolder && (
        <TransferModal
          holder={transferHolder}
          onClose={() => setTransferHolder(null)}
          onTransfer={(classId, to, amount) => actions.transferShares(classId, to, amount)}
        />
      )}
    </PageContainer>
  );
}
