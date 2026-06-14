import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { ethers } from "ethers";
import "../styles/capTable.css";
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
import { CapTableSetup, CapTableView, IssueGrantModal, TransferModal } from "../components/CapTable";

// Frontend gate for showing write affordances. On-chain MTA enforces the real permission
// set; this just hides buttons a caller couldn't use. SuperAdmin / Admin (the slug owner
// surface) and the CapTableManager ops role may manage the table.
const CAP_TABLE_ADMIN_ROLE_SLUGS = new Set<string>([
  SYSTEM_ROLE_SLUG.SuperAdmin,
  SYSTEM_ROLE_SLUG.Admin,
  ethers.utils.formatBytes32String("CapTableManager"),
]);

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

  const [mode, setMode] = useState<"table" | "setup">("table");
  const [issueOpen, setIssueOpen] = useState(false);
  const [issuePrefill, setIssuePrefill] = useState<CapHolder | null>(null);
  const [transferHolder, setTransferHolder] = useState<CapHolder | null>(null);

  if (!slug) {
    return (
      <PageContainer center maxWidth={1320}>
        <Stack gap="md">
          <div className="ct-help">Select an organization to view its cap table.</div>
        </Stack>
      </PageContainer>
    );
  }

  return (
    <PageContainer center maxWidth={1320}>
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
            <div className="ct-kicker">
              {slug} · {chainId != null ? `Chain ${chainId}` : "—"} · Equity
            </div>
            <h1 style={{ margin: "4px 0 0", fontSize: 30, fontWeight: 600, color: "var(--colors-text-main)" }}>
              Cap table
            </h1>
          </div>
          {mode === "table" && state.hasTable && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span className="ct-role">
                <span className="ct-role-dot" /> Acting as <b>{isAdmin ? "Admin" : "Holder"}</b>
              </span>
              {isAdmin && (
                <button
                  className="ct-btn ct-btn-primary"
                  onClick={() => {
                    setIssuePrefill(null);
                    setIssueOpen(true);
                  }}
                  data-testid="captable-issue-grant-btn"
                >
                  + Issue grant
                </button>
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
              setMode("table");
              await refresh();
              return addr;
            }}
          />
        ) : state.loading && !state.hasTable ? (
          <div className="ct-help" data-testid="captable-loading">Loading cap table…</div>
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
