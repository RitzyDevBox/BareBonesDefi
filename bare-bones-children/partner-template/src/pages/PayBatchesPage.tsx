import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { useParams } from "react-router-dom";
import { PageContainer } from "../components/PageWrapper/PageContainer";
import { Card, CardContent, Input } from "../components/BasicComponents";
import { Stack, Row } from "../components/Primitives";
import { Text } from "../components/Primitives/Text";
import { ButtonPrimary, ButtonSecondary } from "../components/Button/ButtonPrimary";
import { IconButton } from "../components/Button/IconButton";
import { NumberInput } from "../components/Inputs/NumberInput";
import { Select, SelectOption } from "../components/Select";
import { useWalletProvider } from "../hooks/useWalletProvider";
import { useExecuteRawTx } from "../hooks/useExecuteRawTx";
import { ScreenSize, useMediaQuery } from "../hooks/useMediaQuery";
import { useTxRefresh } from "../providers/TxRefreshProvider";
import { getBareBonesConfiguration } from "../constants/misc";
import PayrollManagerABI from "../abis/paymentPipelines/PayrollManager.abi.json";
import type { OrganizationModel, PayeeModel } from "../models/payments";
import { fetchPayeesByOrganization } from "../utils/payroll/fetchPayeesByOrganization";
import {
  fetchOrganizationEarningsCodes,
  type OrganizationEarningsCodeView,
  type PayeeDefaultsView,
} from "../utils/payroll/fetchPayrollViews";
import {
  formatEarningsCodeIdLabel,
  formatEarningsCodeName,
} from "../utils/payroll/earningsCodeDisplay";
import { TrashBinIcon } from "../assets/icons/TrashBinIcon";
import { fetchPayBatchCodes, fetchPayBatchPayeesWithDefaults } from "../utils/payroll/fetchPayBatchViews";
import { buildRuleMeta, decodeRunDataDisplay } from "../utils/payroll/earningsDisplay";
import { PayrollNavigation } from "../components/PayrollNavigation";
import { EarningsDividerButton } from "../components/PayrollEarningsManager/EarningsDividerButton";
import { shortAddress } from "../utils/formatUtils";
import { CopyButton } from "../components/Button/Actions/CopyButton";

interface AssignmentDraft {
  earningsCodeId: string;
  rate: string;
  runData: string;
}

interface BatchConfigDraft {
  payeeId: string;
  assignments: AssignmentDraft[];
}

enum PayBatchConfigActionKind {
  Upsert = 0,
  Remove = 1,
}

interface EarningDraftRow {
  id: string;
  codeId: string;
  rate: string;
  hourlyRunData: string;
  rawRunData: string;
}

function parsePayeeNameLabel(value: string) {
  try {
    return ethers.utils.parseBytes32String(value);
  } catch {
    return value;
  }
}

function parseBytes32Label(value: string) {
  try {
    return ethers.utils.parseBytes32String(value);
  } catch {
    return `${value.slice(0, 10)}…${value.slice(-8)}`;
  }
}

function formatBatchCodeInput(input: string) {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("Pay batch code is required");
  if (trimmed.startsWith("0x")) {
    if (trimmed.length !== 66) {
      throw new Error("Hex batch code must be a bytes32 value");
    }
    return trimmed;
  }
  return ethers.utils.formatBytes32String(trimmed);
}

export function PayBatchesPage() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const slug = (organizationId ?? "").trim();

  const { account, provider, chainId } = useWalletProvider();
  const { version } = useTxRefresh();
  const screenSize = useMediaQuery();
  const isPhone = screenSize === ScreenSize.Phone;

  const [loading, setLoading] = useState(false);
  const [orgInfo, setOrgInfo] = useState<OrganizationModel | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [batchCodes, setBatchCodes] = useState<string[]>([]);
  const [selectedBatchCode, setSelectedBatchCode] = useState<string | null>(null);
  const [newBatchCode, setNewBatchCode] = useState("");

  const [payees, setPayees] = useState<PayeeModel[]>([]);
  const [earningsCodes, setEarningsCodes] = useState<OrganizationEarningsCodeView[]>([]);
  const [batchRows, setBatchRows] = useState<PayeeDefaultsView[]>([]);

  const [selectedPayeeId, setSelectedPayeeId] = useState("");
  const [earningDraftRows, setEarningDraftRows] = useState<EarningDraftRow[]>([]);
  const [stagedConfigs, setStagedConfigs] = useState<BatchConfigDraft[]>([]);

  const config = useMemo(() => {
    if (!chainId) return null;
    return getBareBonesConfiguration(chainId);
  }, [chainId]);

  const payrollManagerAddress = config?.payrollManagerAddress;
  const iface = useMemo(() => new ethers.utils.Interface(PayrollManagerABI as any), []);

  const earningsCodeById = useMemo(
    () => new Map(earningsCodes.map((code) => [code.earningsCodeId.toString(), code] as const)),
    [earningsCodes]
  );

  const activeEarningsCodes = useMemo(
    () => earningsCodes.filter((code) => Boolean(code.isActive)),
    [earningsCodes]
  );

  const payeeById = useMemo(
    () => new Map(payees.map((payee) => [payee.payeeId.toString(), payee] as const)),
    [payees]
  );

  useEffect(() => {
    if (!selectedPayeeId) {
      setEarningDraftRows([]);
      return;
    }

    setEarningDraftRows((prev) => {
      if (prev.length > 0) return prev;
      return [
        {
          id: `${Date.now()}-${Math.random()}`,
          codeId: activeEarningsCodes[0]?.earningsCodeId.toString() || "",
          rate: "0",
          hourlyRunData: "40",
          rawRunData: "0x",
        },
      ];
    });
  }, [selectedPayeeId, activeEarningsCodes]);

  function resolveRunData(ruleAddress: string, hourlyInput: string, rawInput: string) {
    const meta = buildRuleMeta(ruleAddress, config);
    if (!meta.runDataRequired) {
      return "0x";
    }
    if (meta.kind === "hourly") {
      return ethers.utils.defaultAbiCoder.encode(["uint32"], [Math.max(0, Math.floor(Number(hourlyInput) || 0))]);
    }
    if (meta.kind === "custom") {
      return rawInput?.trim() || "0x";
    }
    return "0x";
  }

  async function refreshData(orgSlug: string, nextBatchCode?: string | null) {
    if (!provider || !payrollManagerAddress) return;

    setLoading(true);
    try {
      const contract = new ethers.Contract(payrollManagerAddress, PayrollManagerABI as any, provider);
      const slugBytes = ethers.utils.formatBytes32String(orgSlug);
      const org = await contract.organizations(slugBytes);

      setOrgInfo({ owner: org.owner, exists: org.exists });
      setIsAdmin(Boolean(org.exists && org.owner.toLowerCase() === account?.toLowerCase()));

      if (!org.exists) {
        setPayees([]);
        setEarningsCodes([]);
        setBatchCodes([]);
        setBatchRows([]);
        setSelectedBatchCode(null);
        return;
      }

      const [payeeList, earningsCatalog, codes] = await Promise.all([
        fetchPayeesByOrganization(provider, payrollManagerAddress, slugBytes),
        fetchOrganizationEarningsCodes(provider, payrollManagerAddress, orgSlug, undefined, account ?? undefined),
        fetchPayBatchCodes(provider, payrollManagerAddress, orgSlug, account ?? undefined),
      ]);

      setPayees(payeeList);
      setEarningsCodes(earningsCatalog);
      setBatchCodes(codes);

      const targetCode = nextBatchCode ?? selectedBatchCode ?? codes[0] ?? null;
      setSelectedBatchCode(targetCode);

      if (targetCode) {
        const rows = await fetchPayBatchPayeesWithDefaults(
          provider,
          payrollManagerAddress,
          orgSlug,
          targetCode,
          undefined,
          account ?? undefined
        );
        setBatchRows(rows);
      } else {
        setBatchRows([]);
      }
    } catch (error) {
      console.error("Failed to load pay batch data", error);
      setOrgInfo(null);
      setPayees([]);
      setEarningsCodes([]);
      setBatchCodes([]);
      setBatchRows([]);
      setSelectedBatchCode(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!slug) return;
    refreshData(slug);
  }, [slug, provider, payrollManagerAddress, account, version]);

  useEffect(() => {
    if (!selectedBatchCode || !slug) return;
    if (!provider || !payrollManagerAddress) return;

    fetchPayBatchPayeesWithDefaults(
      provider,
      payrollManagerAddress,
      slug,
      selectedBatchCode,
      undefined,
      account ?? undefined
    )
      .then(setBatchRows)
      .catch((error) => {
        console.error("Failed loading selected pay batch", error);
        setBatchRows([]);
      });
  }, [selectedBatchCode]);

  const createPayBatch = useExecuteRawTx(
    (_: number, orgSlug: string, payBatchCodeRaw: string) => {
      if (!payrollManagerAddress) throw new Error("Payroll manager address missing");
      const slugBytes = ethers.utils.formatBytes32String(orgSlug);
      const payBatchCode = formatBatchCodeInput(payBatchCodeRaw);

      return {
        to: payrollManagerAddress,
        data: iface.encodeFunctionData("createPayBatch", [slugBytes, payBatchCode]),
      } as any;
    },
    (_: number, __: string, payBatchCodeRaw: string) => `Created pay batch ${payBatchCodeRaw}`
  );

  const configurePayBatch = useExecuteRawTx(
    (_: number, orgSlug: string, payBatchCode: string, configs: BatchConfigDraft[]) => {
      if (!payrollManagerAddress) throw new Error("Payroll manager address missing");
      if (!configs || !Array.isArray(configs) || configs.length === 0) {
        throw new Error("No configurations to apply");
      }
      const slugBytes = ethers.utils.formatBytes32String(orgSlug);

      const actions = (configs as any[]).map((cfg) => {
        if (!cfg || !cfg.payeeId || !cfg.assignments) {
          throw new Error("Invalid config structure");
        }
        return {
          action: PayBatchConfigActionKind.Upsert,
          payeeId: ethers.BigNumber.from(cfg.payeeId),
          assignments: (cfg.assignments as any[]).map((assignment) => ({
            earningsCodeId: ethers.BigNumber.from(assignment.earningsCodeId),
            rate: ethers.utils.parseEther(assignment.rate || "0"),
            runData: assignment.runData || "0x",
          })),
          earningsCodeIds: [],
        };
      });

      return {
        to: payrollManagerAddress,
        data: iface.encodeFunctionData("configurePayBatch(bytes32,bytes32,(uint8,uint256,(uint256,uint256,bytes)[],uint256[])[])", [slugBytes, payBatchCode, actions]),
      } as any;
    },
    (_: number, __: string, payBatchCode: string, configs: BatchConfigDraft[]) =>
      `Configured ${configs.length} payee(s) for ${parseBytes32Label(payBatchCode)}`
  );

  function addEarningDraftRow() {
    setEarningDraftRows((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        codeId: activeEarningsCodes[0]?.earningsCodeId.toString() || "",
        rate: "0",
        hourlyRunData: "40",
        rawRunData: "0x",
      },
    ]);
  }

  function removeEarningDraftRow(id: string) {
    setEarningDraftRows((prev) => prev.filter((row) => row.id !== id));
  }

  function updateEarningDraftRow(id: string, patch: Partial<EarningDraftRow>) {
    setEarningDraftRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function stageAssignment() {
    if (!selectedPayeeId || earningDraftRows.length === 0) return;

    const assignments: AssignmentDraft[] = earningDraftRows
      .filter((row) => row.codeId)
      .map((row) => {
        const selected = earningsCodeById.get(row.codeId);
        if (!selected) {
          throw new Error("Invalid earnings code in earning draft row");
        }

        return {
          earningsCodeId: row.codeId,
          rate: row.rate || "0",
          runData: resolveRunData(selected.rule, row.hourlyRunData, row.rawRunData),
        };
      });

    if (assignments.length === 0) return;

    setStagedConfigs((prev) => {
      const remaining = prev.filter((entry) => entry.payeeId !== selectedPayeeId);
      return [...remaining, { payeeId: selectedPayeeId, assignments }];
    });

    // Clear the inline form after staging; staged edits remain visible below.
    setEarningDraftRows([]);
  }

  function removeStagedAssignment(payeeId: string, assignmentIndex: number) {
    setStagedConfigs((prev) =>
      prev
        .map((entry) =>
          entry.payeeId !== payeeId
            ? entry
            : {
                ...entry,
                assignments: entry.assignments.filter((_, i) => i !== assignmentIndex),
              }
        )
        .filter((entry) => entry.assignments.length > 0)
    );
  }

  async function handleCreatePayBatch() {
    if (!chainId || !slug || !newBatchCode.trim()) return;
    await createPayBatch(chainId, slug, newBatchCode.trim());

    const nextCode = formatBatchCodeInput(newBatchCode.trim());
    setNewBatchCode("");
    await refreshData(slug, nextCode);
  }

  async function handleBatchConfigure() {
    if (!chainId || !slug || !selectedBatchCode || stagedConfigs.length === 0) return;
    const tx = await configurePayBatch(chainId, slug, selectedBatchCode, stagedConfigs);
    if (tx) {
      setStagedConfigs([]);
      await refreshData(slug, selectedBatchCode);
    }
  }

  return (
    <PageContainer center maxWidth={1320}>
      <Stack gap="lg" style={{ width: "100%" }}>
        <Card style={{ width: "100%", maxWidth: 980, alignSelf: "center" }}>
          <CardContent>
            <PayrollNavigation slug={slug} active="payBatches" title="Pay Batches" />

            {!slug && <Text.Body color="warn">Missing organization slug in route.</Text.Body>}
            {slug && (
              <Text.Body color="muted">
                Organization: <strong>{slug}</strong>
              </Text.Body>
            )}
            {loading && <Text.Body color="muted">Loading pay batch data...</Text.Body>}

            {orgInfo && (
              <Stack
                style={{
                  padding: "var(--spacing-md)",
                  backgroundColor: "var(--colors-background)",
                  borderRadius: "var(--radius-md)",
                }}
              >
                <Text.Body>
                  <strong>Owner:</strong> {orgInfo.owner}
                </Text.Body>
                <Text.Body color={isAdmin ? "success" : "muted"}>
                  {isAdmin ? "✓ Admin Mode" : "Read Only Mode"}
                </Text.Body>
                <Text.Body color="muted" size="sm">
                  Batch codes: {batchCodes.length} · Payees: {payees.length} · Active earnings codes: {activeEarningsCodes.length}
                </Text.Body>
              </Stack>
            )}

            <Row gap="sm" align="end" wrap>
              <Stack style={{ minWidth: 280, flex: 1 }}>
                <Text.Body size="sm" color="muted">Selected Pay Batch</Text.Body>
                <Select<string>
                  value={selectedBatchCode}
                  onChange={(value) => setSelectedBatchCode(String(value))}
                  disabled={batchCodes.length === 0}
                >
                  {batchCodes.map((code) => (
                    <SelectOption key={code} value={code} label={parseBytes32Label(code)} />
                  ))}
                </Select>
              </Stack>

              {isAdmin && (
                <>
                  <Stack style={{ minWidth: 240, flex: 1 }}>
                    <Text.Body size="sm" color="muted">Create New Pay Batch</Text.Body>
                    <Input
                      value={newBatchCode}
                      onChange={(e) => setNewBatchCode(e.target.value)}
                      placeholder="OPS_BATCH"
                    />
                  </Stack>
                  <ButtonSecondary style={{ flex: 0 }} onClick={handleCreatePayBatch} disabled={!newBatchCode.trim() || !chainId}>
                    Create Batch
                  </ButtonSecondary>
                </>
              )}
            </Row>
          </CardContent>
        </Card>

        {selectedBatchCode && (
          <Card style={{ width: "100%" }}>
            <CardContent>
              <Text.Title style={{ fontSize: 20 }}>Configure Batch: {parseBytes32Label(selectedBatchCode)}</Text.Title>

              <Stack
                gap="sm"
                style={{
                  border: "1px solid var(--colors-border)",
                  borderRadius: "var(--radius-md)",
                  padding: "var(--spacing-md)",
                }}
              >
                <Stack style={{ minWidth: 220, maxWidth: 620 }}>
                  <Text.Body size="sm" color="muted">Payee</Text.Body>
                  <Select<string>
                    value={selectedPayeeId || null}
                    onChange={(value) => setSelectedPayeeId(String(value))}
                    disabled={payees.length === 0 || !isAdmin}
                    renderValue={(opt) => (
                      <span
                        style={{
                          display: "block",
                          maxWidth: "100%",
                          overflow: "hidden",
                          whiteSpace: "nowrap",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {String(opt?.props?.label ?? "")}
                      </span>
                    )}
                  >
                    {payees.map((payee) => (
                      <SelectOption
                        key={payee.payeeId.toString()}
                        value={payee.payeeId.toString()}
                        label={`${parsePayeeNameLabel(payee.role)} · #${payee.payeeId.toString()} · ${isPhone ? shortAddress(payee.paymentAddress) : payee.paymentAddress}`}
                      />
                    ))}
                  </Select>
                </Stack>

                {selectedPayeeId && (
                  <>
                    <Row align="center" wrap={false} style={{ width: "100%" }}>
                      <div style={{ flex: 1, height: 1, background: "var(--colors-border)" }} />
                      <Text.Body size="sm" color="muted" style={{ paddingInline: "var(--spacing-sm)" }}>
                        Earnings
                      </Text.Body>
                      <div style={{ flex: 1, height: 1, background: "var(--colors-border)" }} />
                    </Row>

                    {earningDraftRows.map((draft, idx) => {
                      const selectedCode = draft.codeId ? earningsCodeById.get(draft.codeId) ?? null : null;
                      const selectedMeta = buildRuleMeta(selectedCode?.rule ?? ethers.constants.AddressZero, config);

                      return (
                        <Stack
                          key={draft.id}
                          gap="sm"
                          style={{
                            borderTop: idx === 0 ? "none" : "1px dashed var(--colors-border)",
                            paddingTop: idx === 0 ? 0 : "var(--spacing-sm)",
                            marginInline: "auto",
                            width: "100%",
                            maxWidth: 820,
                          }}
                        >
                          {isPhone && (
                            <Row justify="between" align="center" wrap={false} style={{ width: "100%" }}>
                              <Text.Body size="sm" color="muted">Earnings Code</Text.Body>
                              <IconButton
                                size="xl"
                                iconFontSize="lg"
                                shape="square"
                                aria-label="Remove earning"
                                title="Remove earning"
                                style={{
                                  flex: 0,
                                  borderColor: "var(--colors-borderHover)",
                                  color: "var(--colors-error)",
                                }}
                                onClick={() => removeEarningDraftRow(draft.id)}
                                disabled={earningDraftRows.length <= 1}
                              >
                                <TrashBinIcon size={22} />
                              </IconButton>
                            </Row>
                          )}

                          <Row gap="sm" align="center" justify="center" wrap style={{ width: "100%" }}>
                            <Stack style={{ minWidth: 220, flex: "1 1 280px" }}>
                              {!isPhone && <Text.Body size="sm" color="muted">Earnings Code</Text.Body>}
                              <Select<string>
                                value={draft.codeId || null}
                                onChange={(value) => updateEarningDraftRow(draft.id, { codeId: String(value) })}
                                disabled={activeEarningsCodes.length === 0 || !isAdmin}
                              >
                                {activeEarningsCodes.map((code) => {
                                  const id = code.earningsCodeId.toString();
                                  const meta = buildRuleMeta(code.rule, config);
                                  return (
                                    <SelectOption
                                      key={id}
                                      value={id}
                                      label={`${formatEarningsCodeIdLabel(code.earningsCodeId)} · ${formatEarningsCodeName(code.name)} · ${meta.name}`}
                                    />
                                  );
                                })}
                              </Select>
                            </Stack>

                            <Stack style={{ minWidth: 140, flex: "1 1 140px" }}>
                              <Text.Body size="sm" color="muted">Rate</Text.Body>
                              <Input
                                value={draft.rate}
                                onChange={(e) => updateEarningDraftRow(draft.id, { rate: e.target.value })}
                                placeholder="0"
                              />
                            </Stack>

                            {selectedMeta.runDataRequired && selectedMeta.kind === "hourly" ? (
                              <Stack style={{ minWidth: 150, flex: "1 1 150px" }}>
                                <Text.Body size="sm" color="muted">Hours (runData)</Text.Body>
                                <NumberInput
                                  value={draft.hourlyRunData}
                                  onChange={(e) =>
                                    updateEarningDraftRow(draft.id, {
                                      hourlyRunData: (e.target as HTMLInputElement).value,
                                    })
                                  }
                                  allowDecimal={false}
                                />
                              </Stack>
                            ) : selectedMeta.runDataRequired ? (
                              <Stack style={{ minWidth: 180, flex: "1 1 180px" }}>
                                <Text.Body size="sm" color="muted">Run Data (raw hex)</Text.Body>
                                <Input
                                  value={draft.rawRunData}
                                  onChange={(e) => updateEarningDraftRow(draft.id, { rawRunData: e.target.value })}
                                  placeholder="0x"
                                />
                              </Stack>
                            ) : null}

                            {!isPhone && (
                              <Stack style={{ minWidth: 44, alignItems: "center" }}>
                                <Text.Body size="sm" color="muted" style={{ visibility: "hidden" }}>
                                  Remove
                                </Text.Body>
                                <IconButton
                                  size="xl"
                                  iconFontSize="lg"
                                  shape="square"
                                  aria-label="Remove earning"
                                  title="Remove earning"
                                  style={{
                                    flex: 0,
                                    borderColor: "var(--colors-borderHover)",
                                    color: "var(--colors-error)",
                                  }}
                                  onClick={() => removeEarningDraftRow(draft.id)}
                                  disabled={earningDraftRows.length <= 1}
                                >
                                  <TrashBinIcon size={22} />
                                </IconButton>
                              </Stack>
                            )}
                          </Row>
                        </Stack>
                      );
                    })}

                    <EarningsDividerButton
                      label="Add Earning"
                      onClick={addEarningDraftRow}
                      disabled={!isAdmin}
                      minWidth={150}
                    />
                  </>
                )}
              </Stack>

              <Row justify="end">
                <ButtonSecondary
                  style={{ flex: 0 }}
                  onClick={stageAssignment}
                  disabled={!isAdmin || !selectedPayeeId || earningDraftRows.length === 0}
                >
                  Stage Payee Earnings
                </ButtonSecondary>
              </Row>

              <Stack>
                <Text.Label>Staged Batch Configure ({stagedConfigs.length} payee entries)</Text.Label>
                {stagedConfigs.length === 0 ? (
                  <Text.Body color="muted">No staged entries yet.</Text.Body>
                ) : (
                  stagedConfigs.map((entry) => (
                    <Card key={entry.payeeId} style={{ border: "1px solid var(--colors-border)" }}>
                      <CardContent>
                        <Stack gap="xs">
                          <Text.Body>
                            {(() => {
                              const payee = payeeById.get(entry.payeeId);
                              if (!payee) return `Payee #${entry.payeeId}`;
                              return `${parsePayeeNameLabel(payee.role)} · #${entry.payeeId}`;
                            })()} · {entry.assignments.length} assignment(s)
                          </Text.Body>
                          {entry.assignments.map((assignment, idx) => {
                            const code = earningsCodeById.get(assignment.earningsCodeId);
                            const meta = buildRuleMeta(code?.rule ?? ethers.constants.AddressZero, config);
                            return (
                              <Row key={`${entry.payeeId}-${idx}`} justify="between" align="center" wrap>
                                <Text.Body size="sm" color="muted">
                                  -- Earnings {formatEarningsCodeIdLabel(assignment.earningsCodeId)} · {meta.name} · Rate {assignment.rate}
                                  {meta.runDataRequired
                                    ? ` · RunData ${decodeRunDataDisplay(
                                        assignment.runData,
                                        code?.rule ?? ethers.constants.AddressZero,
                                        config
                                      )}`
                                    : ""}
                                </Text.Body>
                                <ButtonSecondary
                                  style={{ flex: 0 }}
                                  onClick={() => removeStagedAssignment(entry.payeeId, idx)}
                                >
                                  Remove
                                </ButtonSecondary>
                              </Row>
                            );
                          })}
                        </Stack>
                      </CardContent>
                    </Card>
                  ))
                )}
              </Stack>

              <Row justify="end">
                <ButtonPrimary
                  style={{ flex: 0 }}
                  onClick={handleBatchConfigure}
                  disabled={!isAdmin || !chainId || !selectedBatchCode || stagedConfigs.length === 0}
                >
                  Submit Batch Configure
                </ButtonPrimary>
              </Row>
            </CardContent>
          </Card>
        )}

        {selectedBatchCode && (
          <Card style={{ width: "100%" }}>
            <CardContent>
              <Text.Title style={{ fontSize: 20 }}>Current Batch Defaults</Text.Title>
              {batchRows.length === 0 ? (
                <Text.Body color="muted">No payees configured for this pay batch yet.</Text.Body>
              ) : (
                batchRows.map((row) => (
                  <Card key={row.payeeId.toString()} style={{ border: "1px solid var(--colors-border)" }}>
                    <CardContent>
                      <Stack gap="xs">
                        <Row gap="xs" align="center" wrap>
                          <Text.Body weight={600}>
                            {(() => {
                              const payee = payeeById.get(row.payeeId.toString());
                              if (!payee) return `Payee #${row.payeeId.toString()}`;
                              return `${parsePayeeNameLabel(payee.role)} · #${row.payeeId.toString()}`;
                            })()}
                          </Text.Body>
                          <Row gap="xs" align="center">
                            <Text.Body size="sm" color="muted">{shortAddress(row.paymentAddress)}</Text.Body>
                            <CopyButton value={row.paymentAddress} ariaLabel="Copy address" />
                          </Row>
                        </Row>
                        {row.earnings.length === 0 ? (
                          <Text.Body color="muted">No default earnings assigned.</Text.Body>
                        ) : (
                          row.earnings.map((earning, idx) => {
                            const meta = buildRuleMeta(earning.rule, config);
                            return (
                              <Text.Body key={`${row.payeeId.toString()}-${idx}`} size="sm" color="muted">
                                -- Earnings {formatEarningsCodeIdLabel(earning.earningsCodeId)} · {meta.name} · Rate {ethers.utils.formatEther(earning.rate)}
                                {meta.runDataRequired
                                  ? ` · RunData ${decodeRunDataDisplay(earning.runData, earning.rule, config)}`
                                  : ""}
                              </Text.Body>
                            );
                          })
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        )}
      </Stack>
    </PageContainer>
  );
}
