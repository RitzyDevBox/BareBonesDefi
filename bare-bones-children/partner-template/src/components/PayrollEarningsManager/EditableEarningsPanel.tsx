import { ethers } from "ethers";
import { CopyButton } from "../Button/Actions/CopyButton";
import { TrashIconButton } from "../Button/TrashIconButton";
import { shortAddress } from "../../utils/formatUtils";
import {
  buildRuleMeta,
  decodeConfigDisplay,
  decodeRunDataDisplay,
  RuleKind,
} from "../../utils/payroll/earningsDisplay";
import {
  formatEarningsCodeIdLabel,
  formatEarningsCodeName,
} from "../../utils/payroll/earningsCodeDisplay";
import { formatRate } from "../../utils/payroll/payrollFormatters";

export interface EditableEarningItem {
  codeId: string;
  name?: string;
  rule: string;
  rate: ethers.BigNumberish;
  config: string;
  runData: string;
  source?: number;
  original?: unknown;
}

interface EarningCodeMeta {
  name?: string;
  rule: string;
  config?: string;
}

interface StagedEarningData {
  rate: ethers.BigNumberish;
  runData: string;
}

interface EditableEarningsPanelProps {
  title: string;
  addLabel: string;
  canEdit: boolean;
  isStagedAdd: boolean;
  isStagedPayeeRemoval: boolean;
  onChainEarnings: EditableEarningItem[];
  stagedUpserts: Map<string, StagedEarningData>;
  stagedRemovals: Set<string>;
  earningsCodeById: Map<string, EarningCodeMeta>;
  config: any;
  onAdd: () => void;
  onEdit: (item: EditableEarningItem, staged: StagedEarningData) => void;
  onToggleRemove: (codeId: string) => void;
  /** Optional decoration rendered next to the panel title (e.g. a payee status pill). */
  headerBadge?: React.ReactNode;
}

function ruleKindToClass(kind: RuleKind): string {
  if (kind === RuleKind.Hourly) return "bb-earn-kind-hourly";
  if (kind === RuleKind.Weekly) return "bb-earn-kind-weekly";
  if (kind === RuleKind.Custom) return "bb-earn-kind-custom";
  return "";
}

function ruleKindLabel(kind: RuleKind): string {
  if (kind === RuleKind.Hourly) return "Hourly";
  if (kind === RuleKind.Weekly) return "Weekly";
  if (kind === RuleKind.Commission) return "Commission";
  if (kind === RuleKind.PerPayroll) return "Per payroll";
  if (kind === RuleKind.Salary) return "Salary";
  return "Custom";
}

interface EarnCardProps {
  ruleKind: RuleKind;
  ruleName: string;
  codeLabel: string;
  ruleAddress: string;
  displayName: string;
  rateText: string;
  configText?: string;
  runDataText?: string;
  badge?: { label: string; tone: "added" | "edited" | "deleted" };
  status: "default" | "added" | "edited" | "deleted";
  onEdit?: () => void;
  onToggleRemove?: () => void;
  removeMode?: "remove" | "undo";
  canEdit: boolean;
}

function EarnCard({
  ruleKind,
  ruleName,
  codeLabel,
  ruleAddress,
  displayName,
  rateText,
  configText,
  runDataText,
  badge,
  status,
  onEdit,
  onToggleRemove,
  removeMode = "remove",
  canEdit,
}: EarnCardProps) {
  const stgClass =
    status === "added"
      ? " bb-stg-added"
      : status === "edited"
        ? " bb-stg-edited"
        : status === "deleted"
          ? " bb-stg-deleted"
          : "";

  return (
    <div className={`bb-earn-card${stgClass}`}>
      <div className="bb-earn-card-body">
        <div className="bb-earn-card-tags">
          <span className={`bb-earn-kind ${ruleKindToClass(ruleKind)}`}>
            {ruleKindLabel(ruleKind)}
          </span>
          {badge && (
            <span
              className={`bb-stage-badge bb-stage-${
                badge.tone === "added" ? "add" : badge.tone === "edited" ? "edit" : "del"
              }`}
            >
              {badge.label}
            </span>
          )}
        </div>
        <div className="bb-earn-card-name">
          <span className={status === "deleted" ? "bb-strike" : undefined}>
            <strong>{displayName}</strong>
          </span>
        </div>
        <div className="bb-earn-card-meta">
          <span>{ruleName}</span>
          <span> · </span>
          <span>{codeLabel}</span>
          <span> · </span>
          <span>Rate: {rateText}</span>
        </div>
        <div
          className="bb-earn-card-meta"
          style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 4 }}
        >
          <span>Rule</span>
          <span style={{ color: "var(--bb-text)" }}>{shortAddress(ruleAddress)}</span>
          <CopyButton value={ruleAddress} ariaLabel="Copy rule contract address" />
        </div>
        {configText && (
          <div className="bb-earn-card-meta" style={{ wordBreak: "break-word", marginTop: 4 }}>
            Config: {configText}
          </div>
        )}
        {runDataText && (
          <div className="bb-earn-card-meta" style={{ wordBreak: "break-word", marginTop: 4 }}>
            Run data: {runDataText}
          </div>
        )}
      </div>
      <div className="bb-earn-card-r">
        <div className="bb-earn-card-actions">
          {canEdit && onEdit && status !== "deleted" && (
            <button
              type="button"
              className="bb-icon-btn-sm"
              aria-label="Edit earning"
              title="Edit earning"
              onClick={onEdit}
              style={{ width: 26, height: 26 }}
            >
              ✎
            </button>
          )}
          {canEdit && onToggleRemove && (
            <TrashIconButton onClick={onToggleRemove} mode={removeMode} size="sm" />
          )}
        </div>
      </div>
    </div>
  );
}

function sourceLabel(source?: number) {
  if (source === 1) return "Override";
  if (source === 2) return "Additional";
  return "Default";
}

export function EditableEarningsPanel({
  title,
  addLabel,
  canEdit,
  isStagedAdd,
  isStagedPayeeRemoval,
  onChainEarnings,
  stagedUpserts,
  stagedRemovals,
  earningsCodeById,
  config,
  onAdd,
  onEdit,
  onToggleRemove,
  headerBadge,
}: EditableEarningsPanelProps) {
  const onChainCodeIds = new Set(onChainEarnings.map((e) => e.codeId));
  const newStagedEarnings = Array.from(stagedUpserts.entries()).filter(
    ([codeId]) => !onChainCodeIds.has(codeId),
  );

  const isEmpty = onChainEarnings.length === 0 && newStagedEarnings.length === 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          flexWrap: "nowrap",
        }}
      >
        <span
          className="bb-kicker"
          style={{
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            minWidth: 0,
            flex: "1 1 auto",
          }}
        >
          {title}
        </span>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexShrink: 0,
            flexWrap: "nowrap",
          }}
        >
          {isStagedAdd && (
            <span className="bb-stage-badge bb-stage-add">Payee staged for add</span>
          )}
          {isStagedPayeeRemoval && (
            <span className="bb-stage-badge bb-stage-del">Payee staged for removal</span>
          )}
          {headerBadge}
        </div>
      </div>

      {isEmpty && (
        <div className="bb-stg-child-empty">
          <span>📋</span>
          <span>No earnings configured yet.</span>
        </div>
      )}

      {onChainEarnings.map((earning, index) => {
        const codeId = earning.codeId;
        const codeLabel = formatEarningsCodeIdLabel(codeId);
        const ruleMeta = buildRuleMeta(earning.rule, config);
        const codeMeta = earningsCodeById.get(codeId);
        const isStagedRemoval = isStagedPayeeRemoval || stagedRemovals.has(codeId);
        const isStagedOverride = stagedUpserts.has(codeId);
        const overrideData = stagedUpserts.get(codeId);
        const effectiveRunData = overrideData?.runData ?? earning.runData;

        const status: EarnCardProps["status"] = isStagedRemoval
          ? "deleted"
          : isStagedOverride
            ? "edited"
            : "default";

        const badge: EarnCardProps["badge"] = isStagedRemoval
          ? { label: "Staged remove", tone: "deleted" }
          : isStagedOverride
            ? { label: "Staged edit", tone: "edited" }
            : { label: sourceLabel(earning.source), tone: "added" };

        const displayName = formatEarningsCodeName(earning.name || codeMeta?.name || codeLabel);
        const rateText = overrideData
          ? `${formatRate(ethers.BigNumber.from(overrideData.rate))} (staged)`
          : formatRate(ethers.BigNumber.from(earning.rate));

        const showConfig =
          ruleMeta.configRequired || (ruleMeta.kind === RuleKind.Custom && earning.config !== "0x");
        const showRunData =
          ruleMeta.runDataRequired ||
          (ruleMeta.kind === RuleKind.Custom && effectiveRunData !== "0x");

        return (
          <EarnCard
            key={`${codeId}-${index}`}
            ruleKind={ruleMeta.kind}
            ruleName={ruleMeta.name}
            codeLabel={codeLabel}
            ruleAddress={earning.rule}
            displayName={displayName}
            rateText={rateText}
            configText={showConfig ? decodeConfigDisplay(earning.config, earning.rule, config) : undefined}
            runDataText={
              showRunData ? decodeRunDataDisplay(effectiveRunData, earning.rule, config) : undefined
            }
            badge={
              isStagedRemoval || isStagedOverride
                ? badge
                : earning.source != null && earning.source !== 0
                  ? { label: sourceLabel(earning.source), tone: "edited" }
                  : undefined
            }
            status={status}
            canEdit={canEdit}
            onEdit={
              isStagedRemoval || isStagedPayeeRemoval
                ? undefined
                : () =>
                    onEdit(earning, {
                      rate: overrideData?.rate ?? earning.rate,
                      runData: overrideData?.runData ?? earning.runData,
                    })
            }
            onToggleRemove={
              isStagedPayeeRemoval ? undefined : () => onToggleRemove(codeId)
            }
            removeMode={isStagedRemoval ? "undo" : "remove"}
          />
        );
      })}

      {newStagedEarnings.map(([codeId, upsert]) => {
        const codeMeta = earningsCodeById.get(codeId);
        const rule = codeMeta?.rule ?? ethers.constants.AddressZero;
        const ruleMeta = buildRuleMeta(rule, config);
        const codeLabel = formatEarningsCodeIdLabel(codeId);
        const displayName = formatEarningsCodeName(codeMeta?.name || codeLabel);
        const rateText = formatRate(ethers.BigNumber.from(upsert.rate));

        const showConfig =
          ruleMeta.configRequired ||
          (ruleMeta.kind === RuleKind.Custom && (codeMeta?.config ?? "0x") !== "0x");
        const showRunData = ruleMeta.runDataRequired;

        const stagedItem: EditableEarningItem = {
          codeId,
          name: codeMeta?.name,
          rule,
          rate: upsert.rate,
          config: codeMeta?.config ?? "0x",
          runData: upsert.runData,
          source: 2,
        };

        return (
          <EarnCard
            key={`staged-new-${codeId}`}
            ruleKind={ruleMeta.kind}
            ruleName={ruleMeta.name}
            codeLabel={codeLabel}
            ruleAddress={rule}
            displayName={displayName}
            rateText={rateText}
            configText={
              showConfig ? decodeConfigDisplay(codeMeta?.config ?? "0x", rule, config) : undefined
            }
            runDataText={
              showRunData ? decodeRunDataDisplay(upsert.runData, rule, config) : undefined
            }
            badge={{ label: "Staged add", tone: "added" }}
            status={isStagedPayeeRemoval ? "deleted" : "added"}
            canEdit={canEdit}
            onEdit={
              isStagedPayeeRemoval ? undefined : () => onEdit(stagedItem, upsert)
            }
            onToggleRemove={
              isStagedPayeeRemoval ? undefined : () => onToggleRemove(codeId)
            }
          />
        );
      })}

      {canEdit && !isStagedPayeeRemoval && (
        <button type="button" className="bb-stg-add-child" onClick={onAdd}>
          + {addLabel}
        </button>
      )}
    </div>
  );
}
