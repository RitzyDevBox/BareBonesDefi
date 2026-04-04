import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { useNavigate, useParams } from "react-router-dom";
import { PageContainer } from "../components/PageWrapper/PageContainer";
import { Card, CardContent, Input } from "../components/BasicComponents";
import { Stack, Row } from "../components/Primitives";
import { Text } from "../components/Primitives/Text";
import { ButtonPrimary, ButtonSecondary } from "../components/Button/ButtonPrimary";
import { NumberInput } from "../components/Inputs/NumberInput";
import { AddressInput } from "../components/Inputs/AddressInput";
import { Select, SelectOption } from "../components/Select";
import { useWalletProvider } from "../hooks/useWalletProvider";
import { useExecuteRawTx } from "../hooks/useExecuteRawTx";
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
import { fetchPayBatchCodes, fetchPayBatchPayeesWithDefaults } from "../utils/payroll/fetchPayBatchViews";
import { buildRuleMeta, decodeRunDataDisplay } from "../utils/payroll/earningsDisplay";
import { ROUTES } from "../routes";

interface AssignmentDraft {
  earningsCodeId: string;
  rate: string;
  runData: string;
}

interface BatchConfigDraft {
  payeeId: string;
  assignments: AssignmentDraft[];
}

interface BatchOnboardDraft {
  id: string;
  name: string;
  paymentAddress: string;
  codeId: string;
  rate: string;
  hourlyRunData: string;
  rawRunData: string;
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

function formatNameInput(input: string) {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("Name is required");
  return ethers.utils.formatBytes32String(trimmed);
}

export function PayBatchesPage() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const navigate = useNavigate();
  const slug = (organizationId ?? "").trim();

  const { account, provider, chainId } = useWalletProvider();
  const { version } = useTxRefresh();

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
  const [selectedCodeId, setSelectedCodeId] = useState("");
  const [rateInput, setRateInput] = useState("0");
  const [hourlyRunDataInput, setHourlyRunDataInput] = useState("40");
  const [rawRunDataInput, setRawRunDataInput] = useState("0x");
  const [stagedConfigs, setStagedConfigs] = useState<BatchConfigDraft[]>([]);

  const [onboardDrafts, setOnboardDrafts] = useState<BatchOnboardDraft[]>([]);

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

  const selectedEarningsCode = selectedCodeId ? earningsCodeById.get(selectedCodeId) ?? null : null;
  const selectedRuleMeta = useMemo(
    () => buildRuleMeta(selectedEarningsCode?.rule ?? ethers.constants.AddressZero, config),
    [selectedEarningsCode, config]
  );

  function resolveRunData(ruleAddress: string, hourlyInput: string, rawInput: string) {
    const meta = buildRuleMeta(ruleAddress, config);
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

  const batchConfigurePayBatch = useExecuteRawTx(
    (_: number, orgSlug: string, payBatchCode: string, configs: BatchConfigDraft[]) => {
      if (!payrollManagerAddress) throw new Error("Payroll manager address missing");
      const slugBytes = ethers.utils.formatBytes32String(orgSlug);

      const encodedConfigs = configs.map((cfg) => ({
        payeeId: ethers.BigNumber.from(cfg.payeeId),
        assignments: cfg.assignments.map((assignment) => ({
          earningsCodeId: ethers.BigNumber.from(assignment.earningsCodeId),
          rate: ethers.utils.parseEther(assignment.rate || "0"),
          runData: assignment.runData || "0x",
        })),
      }));

      return {
        to: payrollManagerAddress,
        data: iface.encodeFunctionData("batchConfigurePayBatch", [slugBytes, payBatchCode, encodedConfigs]),
      } as any;
    },
    (_: number, __: string, payBatchCode: string, configs: BatchConfigDraft[]) =>
      `Configured ${configs.length} payee(s) for ${parseBytes32Label(payBatchCode)}`
  );

  const batchOnboardAndConfigure = useExecuteRawTx(
    (_: number, orgSlug: string, payBatchCode: string, drafts: BatchOnboardDraft[]) => {
      if (!payrollManagerAddress) throw new Error("Payroll manager address missing");
      const slugBytes = ethers.utils.formatBytes32String(orgSlug);

      const configs = drafts.map((draft) => {
        const selected = earningsCodeById.get(draft.codeId);
        if (!selected) {
          throw new Error("Invalid earnings code in batch onboard draft");
        }

        return {
          name: formatNameInput(draft.name),
          paymentAddress: draft.paymentAddress,
          params: "0x",
          assignments: [
            {
              earningsCodeId: ethers.BigNumber.from(draft.codeId),
              rate: ethers.utils.parseEther(draft.rate || "0"),
              runData: resolveRunData(selected.rule, draft.hourlyRunData, draft.rawRunData),
            },
          ],
        };
      });

      return {
        to: payrollManagerAddress,
        data: iface.encodeFunctionData("batchOnboardPayeesAndConfigurePayBatch", [slugBytes, payBatchCode, configs]),
      } as any;
    },
    (_: number, __: string, payBatchCode: string, drafts: BatchOnboardDraft[]) =>
      `Onboarded ${drafts.length} payee(s) into ${parseBytes32Label(payBatchCode)}`
  );

  function stageAssignment() {
    if (!selectedPayeeId || !selectedCodeId || !selectedEarningsCode) return;

    const assignment: AssignmentDraft = {
      earningsCodeId: selectedCodeId,
      rate: rateInput || "0",
      runData: resolveRunData(selectedEarningsCode.rule, hourlyRunDataInput, rawRunDataInput),
    };

    setStagedConfigs((prev) => {
      const idx = prev.findIndex((entry) => entry.payeeId === selectedPayeeId);
      if (idx === -1) {
        return [...prev, { payeeId: selectedPayeeId, assignments: [assignment] }];
      }

      const next = [...prev];
      next[idx] = {
        ...next[idx],
        assignments: [...next[idx].assignments, assignment],
      };
      return next;
    });
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

  function addOnboardDraft() {
    setOnboardDrafts((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        name: "",
        paymentAddress: "",
        codeId: selectedCodeId || earningsCodes[0]?.earningsCodeId.toString() || "",
        rate: "0",
        hourlyRunData: "40",
        rawRunData: "0x",
      },
    ]);
  }

  function updateOnboardDraft(id: string, patch: Partial<BatchOnboardDraft>) {
    setOnboardDrafts((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function removeOnboardDraft(id: string) {
    setOnboardDrafts((prev) => prev.filter((row) => row.id !== id));
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
    await batchConfigurePayBatch(chainId, slug, selectedBatchCode, stagedConfigs);
    setStagedConfigs([]);
    await refreshData(slug, selectedBatchCode);
  }

  async function handleBatchOnboard() {
    if (!chainId || !slug || !selectedBatchCode || onboardDrafts.length === 0) return;
    await batchOnboardAndConfigure(chainId, slug, selectedBatchCode, onboardDrafts);
    setOnboardDrafts([]);
    await refreshData(slug, selectedBatchCode);
  }

  return (
    <PageContainer center maxWidth={1320}>
      <Stack gap="lg" style={{ width: "100%" }}>
        <Card style={{ width: "100%", maxWidth: 980, alignSelf: "center" }}>
          <CardContent>
            <Row justify="between" align="center" wrap>
              <Text.Title align="left">Pay Batches</Text.Title>
              <Row gap="sm" wrap>
                <ButtonSecondary style={{ flex: 0 }} onClick={() => navigate(ROUTES.PAYMENTS_ORG(slug))}>
                  Back to Org
                </ButtonSecondary>
                <ButtonSecondary
                  style={{ flex: 0 }}
                  onClick={() => navigate(ROUTES.PAYMENTS_MANAGE_PAYEES(slug))}
                  disabled={!slug}
                >
                  Manage Payees
                </ButtonSecondary>
                <ButtonPrimary
                  style={{ flex: 0 }}
                  onClick={() => navigate(ROUTES.PAYROLL_CURRENT(slug))}
                  disabled={!slug}
                >
                  Current Payroll
                </ButtonPrimary>
              </Row>
            </Row>

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
                  Batch codes: {batchCodes.length} · Payees: {payees.length} · Earnings codes: {earningsCodes.length}
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

              <Row gap="sm" align="end" wrap>
                <Stack style={{ minWidth: 180 }}>
                  <Text.Body size="sm" color="muted">Payee</Text.Body>
                  <Select<string>
                    value={selectedPayeeId || null}
                    onChange={(value) => setSelectedPayeeId(String(value))}
                    disabled={payees.length === 0 || !isAdmin}
                  >
                    {payees.map((payee) => (
                      <SelectOption
                        key={payee.payeeId.toString()}
                        value={payee.payeeId.toString()}
                        label={`#${payee.payeeId.toString()} · ${payee.paymentAddress.slice(0, 8)}...`}
                      />
                    ))}
                  </Select>
                </Stack>

                <Stack style={{ minWidth: 220 }}>
                  <Text.Body size="sm" color="muted">Earnings Code</Text.Body>
                  <Select<string>
                    value={selectedCodeId || null}
                    onChange={(value) => setSelectedCodeId(String(value))}
                    disabled={earningsCodes.length === 0 || !isAdmin}
                  >
                    {earningsCodes.map((code) => {
                      const id = code.earningsCodeId.toString();
                      const meta = buildRuleMeta(code.rule, config);
                      return <SelectOption key={id} value={id} label={`#${id} · ${meta.name}`} />;
                    })}
                  </Select>
                </Stack>

                <Stack style={{ minWidth: 140 }}>
                  <Text.Body size="sm" color="muted">Rate</Text.Body>
                  <Input value={rateInput} onChange={(e) => setRateInput(e.target.value)} placeholder="0" />
                </Stack>

                {selectedRuleMeta.kind === "hourly" ? (
                  <Stack style={{ minWidth: 150 }}>
                    <Text.Body size="sm" color="muted">Hours (runData)</Text.Body>
                    <NumberInput
                      value={hourlyRunDataInput}
                      onChange={(e) => setHourlyRunDataInput((e.target as HTMLInputElement).value)}
                      allowDecimal={false}
                    />
                  </Stack>
                ) : (
                  <Stack style={{ minWidth: 180 }}>
                    <Text.Body size="sm" color="muted">Run Data (raw hex)</Text.Body>
                    <Input value={rawRunDataInput} onChange={(e) => setRawRunDataInput(e.target.value)} placeholder="0x" />
                  </Stack>
                )}

                <ButtonSecondary
                  style={{ flex: 0 }}
                  onClick={stageAssignment}
                  disabled={!isAdmin || !selectedPayeeId || !selectedCodeId}
                >
                  Stage Assignment
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
                            Payee #{entry.payeeId} · {entry.assignments.length} assignment(s)
                          </Text.Body>
                          {entry.assignments.map((assignment, idx) => {
                            const code = earningsCodeById.get(assignment.earningsCodeId);
                            return (
                              <Row key={`${entry.payeeId}-${idx}`} justify="between" align="center" wrap>
                                <Text.Body size="sm" color="muted">
                                  Code #{assignment.earningsCodeId} · Rate {assignment.rate} · RunData {decodeRunDataDisplay(
                                    assignment.runData,
                                    code?.rule ?? ethers.constants.AddressZero,
                                    config
                                  )}
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

        {selectedBatchCode && isAdmin && (
          <Card style={{ width: "100%" }}>
            <CardContent>
              <Row justify="between" align="center" wrap>
                <Text.Title style={{ fontSize: 20 }}>Batch Onboard + Configure</Text.Title>
                <ButtonSecondary style={{ flex: 0 }} onClick={addOnboardDraft}>
                  + Add Draft Row
                </ButtonSecondary>
              </Row>

              {onboardDrafts.length === 0 ? (
                <Text.Body color="muted">No onboard drafts staged.</Text.Body>
              ) : (
                onboardDrafts.map((draft) => {
                  const code = earningsCodeById.get(draft.codeId);
                  const meta = buildRuleMeta(code?.rule ?? ethers.constants.AddressZero, config);

                  return (
                    <Card key={draft.id} style={{ border: "1px solid var(--colors-border)" }}>
                      <CardContent>
                        <Row gap="sm" align="end" wrap>
                          <Stack style={{ minWidth: 160 }}>
                            <Text.Body size="sm" color="muted">Name</Text.Body>
                            <Input
                              value={draft.name}
                              onChange={(e) => updateOnboardDraft(draft.id, { name: e.target.value })}
                              placeholder="DEV"
                            />
                          </Stack>

                          <Stack style={{ minWidth: 260, flex: 1 }}>
                            <Text.Body size="sm" color="muted">Payment Address</Text.Body>
                            <AddressInput
                              value={draft.paymentAddress}
                              onChange={(e) => updateOnboardDraft(draft.id, { paymentAddress: (e.target as HTMLInputElement).value })}
                              placeholder="0x..."
                            />
                          </Stack>

                          <Stack style={{ minWidth: 220 }}>
                            <Text.Body size="sm" color="muted">Earnings Code</Text.Body>
                            <Select<string>
                              value={draft.codeId || null}
                              onChange={(value) => updateOnboardDraft(draft.id, { codeId: String(value) })}
                            >
                              {earningsCodes.map((item) => {
                                const id = item.earningsCodeId.toString();
                                const rule = buildRuleMeta(item.rule, config);
                                return <SelectOption key={id} value={id} label={`#${id} · ${rule.name}`} />;
                              })}
                            </Select>
                          </Stack>

                          <Stack style={{ minWidth: 130 }}>
                            <Text.Body size="sm" color="muted">Rate</Text.Body>
                            <Input
                              value={draft.rate}
                              onChange={(e) => updateOnboardDraft(draft.id, { rate: e.target.value })}
                              placeholder="0"
                            />
                          </Stack>

                          {meta.kind === "hourly" ? (
                            <Stack style={{ minWidth: 140 }}>
                              <Text.Body size="sm" color="muted">Hours</Text.Body>
                              <NumberInput
                                value={draft.hourlyRunData}
                                onChange={(e) =>
                                  updateOnboardDraft(draft.id, {
                                    hourlyRunData: (e.target as HTMLInputElement).value,
                                  })
                                }
                                allowDecimal={false}
                              />
                            </Stack>
                          ) : (
                            <Stack style={{ minWidth: 180 }}>
                              <Text.Body size="sm" color="muted">Run Data</Text.Body>
                              <Input
                                value={draft.rawRunData}
                                onChange={(e) => updateOnboardDraft(draft.id, { rawRunData: e.target.value })}
                                placeholder="0x"
                              />
                            </Stack>
                          )}

                          <ButtonSecondary style={{ flex: 0 }} onClick={() => removeOnboardDraft(draft.id)}>
                            Remove
                          </ButtonSecondary>
                        </Row>
                      </CardContent>
                    </Card>
                  );
                })
              )}

              <Row justify="end">
                <ButtonPrimary
                  style={{ flex: 0 }}
                  onClick={handleBatchOnboard}
                  disabled={!chainId || !selectedBatchCode || onboardDrafts.length === 0}
                >
                  Submit Batch Onboard
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
                        <Text.Body weight={600}>
                          Payee #{row.payeeId.toString()} · {row.paymentAddress}
                        </Text.Body>
                        {row.earnings.length === 0 ? (
                          <Text.Body color="muted">No default earnings assigned.</Text.Body>
                        ) : (
                          row.earnings.map((earning, idx) => {
                            const meta = buildRuleMeta(earning.rule, config);
                            return (
                              <Text.Body key={`${row.payeeId.toString()}-${idx}`} size="sm" color="muted">
                                Code #{earning.earningsCodeId.toString()} · {meta.name} · Rate {ethers.utils.formatEther(earning.rate)} · RunData {decodeRunDataDisplay(earning.runData, earning.rule, config)}
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
