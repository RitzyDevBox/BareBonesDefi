import { ethers } from "ethers";
import { Card, CardContent } from "../BasicComponents";
import { Stack, Row } from "../Primitives";
import { Text } from "../Primitives/Text";
import { IconButton } from "../Button/IconButton";
import { CopyButton } from "../Button/Actions/CopyButton";
import { EarningsDividerButton } from "./EarningsDividerButton";
import { TrashBinIcon } from "../../assets/icons/TrashBinIcon";
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
import { ScreenSize, useMediaQuery } from "../../hooks/useMediaQuery";

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
}

function sourceLabel(source?: number) {
  if (source === 1) return "Override";
  if (source === 2) return "Additional";
  return "Default";
}

function sourceColor(source?: number): "main" | "secondary" | "label" | "muted" | "danger" | "warn" | "success" {
  if (source === 1) return "warn";
  if (source === 2) return "success";
  return "secondary";
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
}: EditableEarningsPanelProps) {
  const screenSize = useMediaQuery();
  const isPhone = screenSize === ScreenSize.Phone;
  const onChainCodeIds = new Set(onChainEarnings.map((e) => e.codeId));
  const newStagedEarnings = Array.from(stagedUpserts.entries()).filter(
    ([codeId]) => !onChainCodeIds.has(codeId)
  );

  return (
    <Card style={{ backgroundColor: "var(--colors-background)", border: "1px solid var(--colors-border)", width: "100%" }}>
      <CardContent>
        <Stack gap="sm">
          <Text.Label>{title}</Text.Label>
          {isStagedAdd && (
            <Text.Body size="sm" color="success">+ Staged: this payee will be added</Text.Body>
          )}
          {isStagedPayeeRemoval && (
            <Text.Body size="sm" color="danger">- Staged: this payee and all earnings will be removed</Text.Body>
          )}

          {canEdit && !isStagedPayeeRemoval && (
            <EarningsDividerButton label={addLabel} onClick={onAdd} minWidth={170} />
          )}

          {onChainEarnings.length === 0 && newStagedEarnings.length === 0 ? (
            <Text.Body color="muted">No earnings assigned.</Text.Body>
          ) : (
            <Stack gap="sm">
              {onChainEarnings.map((earning, index) => {
                const codeId = earning.codeId;
                const codeLabel = formatEarningsCodeIdLabel(codeId);
                const ruleMeta = buildRuleMeta(earning.rule, config);
                const codeMeta = earningsCodeById.get(codeId);
                const isStagedRemoval = isStagedPayeeRemoval || stagedRemovals.has(codeId);
                const isStagedOverride = stagedUpserts.has(codeId);
                const overrideData = stagedUpserts.get(codeId);
                const effectiveRunData = overrideData?.runData ?? earning.runData;

                return (
                  <Card
                    key={`${codeId}-${index}`}
                    style={{
                      width: "100%",
                      border: `1px solid ${
                        isStagedRemoval
                          ? "var(--colors-error, #dc3545)"
                          : isStagedOverride
                          ? "var(--colors-warn, #fd7e14)"
                          : "var(--colors-border)"
                      }`,
                      opacity: isStagedRemoval ? 0.65 : 1,
                    }}
                  >
                    <CardContent style={{ padding: isPhone ? "var(--spacing-sm)" : "var(--spacing-md)", position: "relative" }}>
                      {canEdit && (
                        <Row
                          gap="xs"
                          style={{
                            position: "absolute",
                            right: "var(--spacing-sm)",
                            top: "var(--spacing-sm)",
                            zIndex: 1,
                          }}
                        >
                          {!isStagedRemoval && (
                            <IconButton
                              size="xl"
                              iconFontSize="xl"
                              shape="square"
                              aria-label="Edit earning"
                              title="Edit earning"
                              onClick={() =>
                                onEdit(earning, {
                                  rate: overrideData?.rate ?? earning.rate,
                                  runData: overrideData?.runData ?? earning.runData,
                                })
                              }
                              style={{ borderColor: "var(--colors-borderHover)", color: "var(--colors-text-main)" }}
                            >
                              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "1em", height: "1em", transform: "translate(-2px,0) rotate(90deg)", fontSize: "26px", lineHeight: "1em", fontWeight: 400 }}>✎</span>
                            </IconButton>
                          )}
                          <IconButton
                            size="xl"
                            iconFontSize="xl"
                            shape="square"
                            aria-label={isStagedRemoval ? "Unstage removal" : "Stage removal"}
                            title={isStagedRemoval ? "Unstage removal" : "Stage removal"}
                            onClick={() => onToggleRemove(codeId)}
                            style={{ color: isStagedRemoval ? "var(--colors-warn)" : "var(--colors-error)", borderColor: "var(--colors-borderHover)" }}
                          >
                            <TrashBinIcon size={20} />
                          </IconButton>
                        </Row>
                      )}

                      <Stack gap="xs">
                        <Text.Body weight={600} style={{ textDecoration: isStagedRemoval ? "line-through" : undefined }}>
                          {isStagedRemoval ? "⛔ " : isStagedOverride ? "✎ " : ""}{ruleMeta.name}: {codeLabel}
                        </Text.Body>
                        {(earning.name || codeMeta?.name) && (
                          <Text.Body size="sm" color="muted">Name: {formatEarningsCodeName(earning.name || codeMeta?.name || "")}</Text.Body>
                        )}
                        <Text.Body color={sourceColor(earning.source)} size="sm">State: {sourceLabel(earning.source)}</Text.Body>
                        <Row gap="sm" align="center" wrap>
                          <Text.Body size="sm" color="muted">Address: {shortAddress(earning.rule)}</Text.Body>
                          <CopyButton value={earning.rule} ariaLabel="Copy rule address" />
                        </Row>
                        <Text.Body size="sm" color="muted">
                          Rate: {overrideData
                            ? `${formatRate(ethers.BigNumber.from(overrideData.rate))} (staged)`
                            : formatRate(ethers.BigNumber.from(earning.rate))}
                        </Text.Body>
                        {(ruleMeta.configRequired || (ruleMeta.kind === RuleKind.Custom && earning.config !== "0x")) && (
                          <Text.Body size="sm" color="muted" style={{ whiteSpace: "normal", wordBreak: "break-word" }}>
                            Config: {decodeConfigDisplay(earning.config, earning.rule, config)}
                          </Text.Body>
                        )}
                        {(ruleMeta.runDataRequired || (ruleMeta.kind === RuleKind.Custom && effectiveRunData !== "0x")) && (
                          <Text.Body size="sm" color="muted" style={{ whiteSpace: "normal", wordBreak: "break-word" }}>
                            Run Data: {decodeRunDataDisplay(effectiveRunData, earning.rule, config)}
                          </Text.Body>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })}

              {newStagedEarnings.map(([codeId, upsert]) => {
                const codeMeta = earningsCodeById.get(codeId);
                const rule = codeMeta?.rule ?? ethers.constants.AddressZero;
                const ruleMeta = buildRuleMeta(rule, config);
                const cardBorder = isStagedPayeeRemoval
                  ? "var(--colors-error, #dc3545)"
                  : "var(--colors-success, #198754)";

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
                  <Card key={`staged-new-${codeId}`} style={{ border: `1px solid ${cardBorder}`, opacity: isStagedPayeeRemoval ? 0.65 : 1, width: "100%" }}>
                    <CardContent style={{ padding: isPhone ? "var(--spacing-sm)" : "var(--spacing-md)", position: "relative" }}>
                      {canEdit && !isStagedPayeeRemoval && (
                        <Row
                          gap="xs"
                          style={{
                            position: "absolute",
                            right: "var(--spacing-sm)",
                            top: "var(--spacing-sm)",
                            zIndex: 1,
                          }}
                        >
                          <IconButton
                            size="xl"
                            iconFontSize="xl"
                            shape="rounded"
                            aria-label="Edit staged earning"
                            title="Edit staged earning"
                            onClick={() => onEdit(stagedItem, upsert)}
                            style={{ borderColor: "var(--colors-borderHover)", color: "var(--colors-text-main)" }}
                          >
                            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "1em", height: "1em", transform: "translate(-2px,0) rotate(90deg)", fontSize: "26px", lineHeight: "1em", fontWeight: 400 }}>✎</span>
                          </IconButton>
                          <IconButton
                            size="xl"
                            iconFontSize="xl"
                            shape="square"
                            aria-label="Remove staged earning"
                            title="Remove staged earning"
                            onClick={() => onToggleRemove(codeId)}
                            style={{ color: "var(--colors-error)", borderColor: "var(--colors-borderHover)" }}
                          >
                            <TrashBinIcon size={20} />
                          </IconButton>
                        </Row>
                      )}

                      <Stack gap="xs">
                        <Text.Body weight={600} color={isStagedPayeeRemoval ? "danger" : "success"} style={{ textDecoration: isStagedPayeeRemoval ? "line-through" : undefined }}>
                          {isStagedPayeeRemoval ? "⛔ " : "✚ "}{ruleMeta.name}: {formatEarningsCodeIdLabel(codeId)}
                        </Text.Body>
                        {codeMeta?.name && <Text.Body size="sm" color="muted">Name: {formatEarningsCodeName(codeMeta.name)}</Text.Body>}
                        <Text.Body color="success" size="sm">State: Additional</Text.Body>
                        <Row gap="sm" align="center" wrap>
                          <Text.Body size="sm" color="muted">Address: {shortAddress(rule)}</Text.Body>
                          <CopyButton value={rule} ariaLabel="Copy rule address" />
                        </Row>
                        <Text.Body size="sm" color="muted">Rate: {formatRate(ethers.BigNumber.from(upsert.rate))}</Text.Body>
                        {(ruleMeta.configRequired || (ruleMeta.kind === RuleKind.Custom && (codeMeta?.config ?? "0x") !== "0x")) && (
                          <Text.Body size="sm" color="muted" style={{ whiteSpace: "normal", wordBreak: "break-word" }}>
                            Config: {decodeConfigDisplay(codeMeta?.config ?? "0x", rule, config)}
                          </Text.Body>
                        )}
                        {ruleMeta.runDataRequired && (
                          <Text.Body size="sm" color="muted" style={{ whiteSpace: "normal", wordBreak: "break-word" }}>
                            Run Data: {decodeRunDataDisplay(upsert.runData, rule, config)}
                          </Text.Body>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
