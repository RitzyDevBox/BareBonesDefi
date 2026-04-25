import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { useWalletProvider } from "../../hooks/useWalletProvider";
import { useReadProvider } from "../../hooks/useReadProvider";
import { useTxRefresh } from "../../providers/TxRefreshProvider";
import { CHAIN_INFO_MAP, DEFAULT_CHAIN_ID, getBareBonesConfiguration } from "../../constants/misc";
import PayrollManagerABI from "../../abis/paymentPipelines/PayrollManager.abi.json";
import {
  fetchOrganizationEarningsCodes,
  type OrganizationEarningsCodeView,
} from "../../utils/payroll/fetchPayrollViews";
import { PayrollEarningsManager } from "../PayrollEarningsManager";
import { RuleType } from "../PayrollEarningsManager/ruleTypes";
import {
  formatEarningsCodeIdLabel,
  formatEarningsCodeName,
  isSystemEarningsCodeId,
} from "../../utils/payroll/earningsCodeDisplay";
import { shortAddress } from "../../utils/formatUtils";
import { CopyButton } from "../Button/Actions/CopyButton";
import { buildExplorerAddressLink } from "../../utils/explorerLinks";

interface EarningsViewProps {
  slug: string;
  isAdmin: boolean;
}

function ruleTypeFromAddress(rule: string, addrs: Record<string, string>): RuleType | null {
  const a = (rule || "").toLowerCase();
  if (a === addrs.hourly) return RuleType.Hourly;
  if (a === addrs.weekly) return RuleType.Weekly;
  if (a === addrs.oneTime) return RuleType.OneTime;
  if (a === addrs.salary) return RuleType.Salary;
  return null;
}

function ruleTypeLabel(rt: RuleType | null): string {
  if (rt === RuleType.Hourly) return "Hourly";
  if (rt === RuleType.Weekly) return "Weekly";
  if (rt === RuleType.OneTime) return "One-time";
  if (rt === RuleType.Salary) return "Salary";
  return "Custom";
}

function ruleTypeClass(rt: RuleType | null): string {
  if (rt === RuleType.Hourly) return "bb-ec-rule-hourly";
  if (rt === RuleType.Weekly) return "bb-ec-rule-weekly";
  if (rt === RuleType.OneTime) return "bb-ec-rule-oneTime";
  if (rt === RuleType.Salary) return "bb-ec-rule-salary";
  return "";
}

interface EarningCardProps {
  code: OrganizationEarningsCodeView;
  rt: RuleType | null;
  system: boolean;
  explorerUrl: string | null;
  canEdit: boolean;
  onEdit?: (code: OrganizationEarningsCodeView) => void;
}

function EarningCodeCard({ code, rt, system, explorerUrl, canEdit, onEdit }: EarningCardProps) {
  const name = useMemo(() => formatEarningsCodeName(code.name), [code.name]);
  const idLabel = useMemo(() => formatEarningsCodeIdLabel(code.earningsCodeId), [code.earningsCodeId]);
  const ruleAddrShort = useMemo(() => shortAddress(code.rule), [code.rule]);
  const explorerLink = explorerUrl ? buildExplorerAddressLink(code.rule, explorerUrl) : null;

  return (
    <div className={`bb-ec-card${!code.isActive ? " bb-inactive" : ""}`}>
      <div className="bb-ec-card-top">
        <div className={`bb-ec-card-rule ${ruleTypeClass(rt)}`}>{ruleTypeLabel(rt)}</div>
        {system ? (
          <span className="bb-ec-state bb-ec-state-system">System</span>
        ) : code.isActive ? (
          <span className="bb-ec-state bb-ec-state-active">Active</span>
        ) : (
          <span className="bb-ec-state bb-ec-state-inactive">Inactive</span>
        )}
      </div>
      <div className="bb-ec-card-name">{name || "Unnamed code"}</div>
      <div className="bb-ec-card-id">{idLabel}</div>
      <div className="bb-ec-card-note" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span>Rule</span>
        <span className="bb-mono bb-small" style={{ color: "var(--bb-text)" }}>{ruleAddrShort}</span>
        <CopyButton value={code.rule} ariaLabel="Copy rule contract address" />
        {explorerLink && (
          <a
            href={explorerLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "var(--bb-accent)",
              fontSize: 11,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
            title="View on explorer"
          >
            ↗ Scan
          </a>
        )}
      </div>
      {!system && onEdit && (
        <div className="bb-ec-card-bot">
          <span className="bb-muted bb-small">User-defined</span>
          <div className="bb-ec-card-actions">
            <button
              type="button"
              className="bb-icon-btn-sm"
              onClick={() => onEdit(code)}
              disabled={!canEdit}
              aria-label={`Edit ${name || "earnings code"}`}
              title="Edit earnings code"
            >
              ✎
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function EarningsView({ slug, isAdmin }: EarningsViewProps) {
  const { chainId } = useWalletProvider();
  const provider = useReadProvider();
  const { version } = useTxRefresh();
  const chainIdOrDefault = chainId ?? DEFAULT_CHAIN_ID;
  const [loading, setLoading] = useState(false);
  const [earningsCodes, setEarningsCodes] = useState<OrganizationEarningsCodeView[]>([]);

  const [modalMode, setModalMode] = useState<"register" | "edit">("register");
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<OrganizationEarningsCodeView | null>(null);

  const config = useMemo(() => getBareBonesConfiguration(chainIdOrDefault), [chainIdOrDefault]);
  const payrollManagerAddress = config?.payrollManagerAddress;

  const explorerUrl = useMemo(() => {
    return CHAIN_INFO_MAP[chainIdOrDefault]?.blockExplorerUrls?.[0] ?? null;
  }, [chainIdOrDefault]);

  const ruleAddrs = useMemo(
    () => ({
      hourly: (config?.hoursRuleAddress ?? "").toLowerCase(),
      weekly: (config?.weeklyScheduleRuleAddress ?? "").toLowerCase(),
      oneTime: (config?.oneTimePaymentAddress ?? "").toLowerCase(),
      salary: (config?.salaryPerSecondRuleAddress ?? "").toLowerCase(),
    }),
    [config],
  );

  useEffect(() => {
    let cancelled = false;
    if (!slug || !provider || !payrollManagerAddress) return;

    setLoading(true);
    setEarningsCodes([]);
    (async () => {
      try {
        const contract = new ethers.Contract(payrollManagerAddress, PayrollManagerABI as any, provider);
        const slugBytes = ethers.utils.formatBytes32String(slug);
        const org = await contract.organizations(slugBytes);
        if (cancelled) return;
        if (!org.exists) {
          setEarningsCodes([]);
          return;
        }
        const rows = await fetchOrganizationEarningsCodes(provider, payrollManagerAddress, slug);
        if (!cancelled) setEarningsCodes(rows);
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load earnings", err);
          setEarningsCodes([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, provider, payrollManagerAddress, version]);

  const enriched = useMemo(
    () =>
      earningsCodes.map((c) => ({
        view: c,
        rt: ruleTypeFromAddress(c.rule, ruleAddrs),
        system: isSystemEarningsCodeId(c.earningsCodeId),
      })),
    [earningsCodes, ruleAddrs],
  );

  const userCodes = useMemo(() => enriched.filter((row) => !row.system), [enriched]);
  const systemCodes = useMemo(() => enriched.filter((row) => row.system), [enriched]);

  function openRegister() {
    setEditTarget(null);
    setModalMode("register");
    setModalOpen(true);
  }

  function openEdit(code: OrganizationEarningsCodeView) {
    setEditTarget(code);
    setModalMode("edit");
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
  }

  return (
    <>
      <div className="bb-panel" style={{ marginBottom: 16 }}>
        <div className="bb-panel-toolbar">
          <div className="bb-panel-toolbar-l">
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em" }}>
                User earnings codes
              </h3>
              <div className="bb-muted bb-small">
                {loading ? "loading…" : `${userCodes.length} registered`}
                {isAdmin ? " · admin" : ""}
              </div>
            </div>
          </div>
          <div className="bb-panel-toolbar-r">
            <button
              type="button"
              className="bb-btn-primary bb-btn-sm"
              onClick={openRegister}
              disabled={!isAdmin}
            >
              + Add Earning
            </button>
          </div>
        </div>
        <div style={{ padding: 14 }}>
          <div className="bb-ec-grid">
            {!loading && userCodes.length === 0 && (
              <div className="bb-ec-empty">
                No user earnings codes registered yet. Click "Add Earning" to register one.
              </div>
            )}
            {userCodes.map(({ view, rt }) => (
              <EarningCodeCard
                key={view.earningsCodeId.toString()}
                code={view}
                rt={rt}
                system={false}
                explorerUrl={explorerUrl}
                canEdit={isAdmin}
                onEdit={openEdit}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="bb-panel">
        <div className="bb-panel-toolbar">
          <div className="bb-panel-toolbar-l">
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em" }}>
                System earnings codes
              </h3>
              <div className="bb-muted bb-small">
                Governance-managed · read-only · {systemCodes.length} shown
              </div>
            </div>
          </div>
        </div>
        <div style={{ padding: 14 }}>
          <div className="bb-ec-grid">
            {!loading && systemCodes.length === 0 && (
              <div className="bb-ec-empty">No system earnings codes available on this chain.</div>
            )}
            {systemCodes.map(({ view, rt }) => (
              <EarningCodeCard
                key={view.earningsCodeId.toString()}
                code={view}
                rt={rt}
                system={true}
                explorerUrl={explorerUrl}
                canEdit={false}
              />
            ))}
          </div>
        </div>
      </div>

      <PayrollEarningsManager
        slug={slug}
        canEdit={isAdmin}
        isOpen={modalOpen}
        onClose={closeModal}
        mode={modalMode}
        target={editTarget}
      />
    </>
  );
}
