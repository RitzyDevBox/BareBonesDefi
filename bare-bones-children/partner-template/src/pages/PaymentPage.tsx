import { useCallback, useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { useNavigate, useParams } from "react-router-dom";
import { PageContainer } from "../components/PageWrapper/PageContainer";
import { Card, CardContent, Input } from "../components/BasicComponents";
import { Stack, Row } from "../components/Primitives";
import { Text } from "../components/Primitives/Text";
import { ButtonPrimary, ButtonSecondary } from "../components/Button/ButtonPrimary";
import { AddressInput } from "../components/Inputs/AddressInput";
import { NumberInput } from "../components/Inputs/NumberInput";
import { Modal } from "../components/Modal/Modal";
import { CopyButton } from "../components/Button/Actions/CopyButton";
import { IconButton } from "../components/Button/IconButton";
import { TrashBinIcon } from "../assets/icons/TrashBinIcon";
import { Select, SelectOption } from "../components/Select";
import { useWalletProvider } from "../hooks/useWalletProvider";
import { useExecuteRawTx } from "../hooks/useExecuteRawTx";
import { useTxRefresh } from "../providers/TxRefreshProvider";
import { getBareBonesConfiguration } from "../constants/misc";
import OnboardingManagerABI from "../abis/paymentPipelines/OnboardingManager.abi.json";
import PayrollManagerABI from "../abis/paymentPipelines/PayrollManager.abi.json";
import { PayeesTable } from "../components/PayeesTable";
import { PayrollEarningsManager } from "../components/PayrollEarningsManager";
import { ROUTES } from "../routes";
import type { OrganizationModel, PayeeModel } from "../models/payments";
import { fetchPayeesByOrganization } from "../utils/payroll/fetchPayeesByOrganization";
import {
  fetchPayeesWithDefaults,
  fetchOrganizationEarningsCodes,
  type PayeeDefaultEarningView,
  type OrganizationEarningsCodeView,
  type PayeeDefaultsView,
} from "../utils/payroll/fetchPayrollViews";
import { shortAddress } from "../utils/formatUtils";
import {
  buildRuleMeta,
  decodeConfigDisplay,
  decodeRunDataDisplay,
} from "../utils/payroll/earningsDisplay";

function formatRate(rate: ethers.BigNumber) {
  try {
    return ethers.utils.formatEther(rate);
  } catch {
    return "0";
  }
}

function payeeStatusLabel(status?: number) {
  if (status === 0) return "Active";
  if (status === 1) return "On Leave";
  if (status === 2) return "Inactive";
  return `Status ${String(status ?? 0)}`;
}

type PayeeEarningsMode = "view" | "add" | "edit" | "delete";

interface PayeeEarningsModalState {
  isOpen: boolean;
  mode: PayeeEarningsMode;
  payee: PayeeModel | null;
  earning: PayeeDefaultEarningView | null;
}

interface PayeeAssignmentDraft {
  earningsCodeId: string;
  rate: string;
  runData: string;
}

export function PaymentPage() {
  const { organizationId } = useParams<{ organizationId?: string }>();
  const navigate = useNavigate();
  const { account, provider, chainId } = useWalletProvider();
  const { version } = useTxRefresh();
  const [slug, setSlug] = useState<string>(organizationId ?? "");
  const [orgInfo, setOrgInfo] = useState<OrganizationModel | null>(null);
  const [payees, setPayees] = useState<PayeeModel[]>([]);
  const [payeeDefaults, setPayeeDefaults] = useState<PayeeDefaultsView[]>([]);
  const [organizationEarningsCodes, setOrganizationEarningsCodes] = useState<
    OrganizationEarningsCodeView[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Transfer ownership form
  const [newOwner, setNewOwner] = useState<string>("");
  const [payeeEarningsModal, setPayeeEarningsModal] = useState<PayeeEarningsModalState>({
    isOpen: false,
    mode: "view",
    payee: null,
    earning: null,
  });
  const [modalCodeId, setModalCodeId] = useState<string>("");
  const [modalRate, setModalRate] = useState<string>("0");
  const [modalHourlyRunData, setModalHourlyRunData] = useState<string>("40");
  const [modalRawRunData, setModalRawRunData] = useState<string>("0x");

  const config = useMemo(() => {
    if (!chainId) return null;
    return getBareBonesConfiguration(chainId);
  }, [chainId]);

  const onboardingAddress = config?.onboardingManagerAddress;
  const payrollManagerAddress = config?.payrollManagerAddress;
  const iface = useMemo(
    () => new ethers.utils.Interface(OnboardingManagerABI as any),
    []
  );

  const defaultsByPayeeId = useMemo(
    () =>
      new Map(
        payeeDefaults.map((row) => [row.payeeId.toString(), row] as const)
      ),
    [payeeDefaults]
  );

  const earningsCodeById = useMemo(
    () =>
      new Map(
        organizationEarningsCodes.map((row) => [row.earningsCodeId.toString(), row] as const)
      ),
    [organizationEarningsCodes]
  );

  // Auto-refresh org info when version changes (after transaction)
  useEffect(() => {
    if (slug.trim()) {
      fetchOrgInfo(slug.trim());
    }
  }, [version]);

  // If route contains /payments/:organizationId, preload and fetch automatically
  useEffect(() => {
    const slugFromRoute = (organizationId ?? "").trim();
    if (!slugFromRoute) return;

    if (slug !== slugFromRoute) {
      setSlug(slugFromRoute);
    }

    if (provider && onboardingAddress) {
      fetchOrgInfo(slugFromRoute);
    }
  }, [organizationId, provider, onboardingAddress, payrollManagerAddress]);

  // Fetch org info
  async function fetchOrgInfo(orgSlug: string) {
    if (!provider || !onboardingAddress) return;

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        onboardingAddress,
        OnboardingManagerABI as any,
        provider
      );

      const slugBytes = ethers.utils.formatBytes32String(orgSlug);
      const org = await contract.organizations(slugBytes);

      setOrgInfo({
        slug: slugBytes,
        owner: org.owner,
        exists: org.exists,
      });

      setIsAdmin(org.exists && org.owner.toLowerCase() === account?.toLowerCase());

      if (org.exists) {
        const [payeeList, defaultsRows, earningsRows] = await Promise.all([
          fetchPayeesByOrganization(provider, onboardingAddress, slugBytes),
          payrollManagerAddress
            ? fetchPayeesWithDefaults(provider, payrollManagerAddress, orgSlug, undefined, account ?? undefined)
            : Promise.resolve([]),
          payrollManagerAddress
            ? fetchOrganizationEarningsCodes(provider, payrollManagerAddress, orgSlug, undefined, account ?? undefined)
            : Promise.resolve([]),
        ]);

        setPayees(payeeList);
        setPayeeDefaults(defaultsRows);
        setOrganizationEarningsCodes(earningsRows);
      } else {
        setPayees([]);
        setPayeeDefaults([]);
        setOrganizationEarningsCodes([]);
      }
    } catch (err) {
      console.error("Error fetching org info:", err);
      setOrgInfo(null);
      setPayees([]);
      setPayeeDefaults([]);
      setOrganizationEarningsCodes([]);
    } finally {
      setLoading(false);
    }
  }

  // Build transactions
  const buildRegisterOrgTx = useCallback((_: number, orgSlug: string) => {
    const slugBytes = ethers.utils.formatBytes32String(orgSlug);
    return {
      to: onboardingAddress,
      data: iface.encodeFunctionData("registerOrganization", [slugBytes]),
    } as any;
  }, [onboardingAddress, iface]);

  const registerOrg = useExecuteRawTx(
    buildRegisterOrgTx,
    (_: number, orgSlug: string) => `Organization "${orgSlug}" registered`
  );

  const buildOnboardPayeeTx = useCallback(
    (_: number, orgSlug: string, role: string, address: string) => {
      const slugBytes = ethers.utils.formatBytes32String(orgSlug);
      const roleBytes = ethers.utils.formatBytes32String(role);
      return {
        to: onboardingAddress,
        data: iface.encodeFunctionData("onboardPayee", [
          slugBytes,
          roleBytes,
          address,
          "0x",
        ]),
      } as any;
    },
    [onboardingAddress, iface]
  );

  const onboardPayee = useExecuteRawTx(
    buildOnboardPayeeTx,
    (_: number, __: string, role: string, address: string) =>
      `Onboarded payee "${role}" at ${address}`
  );

  const buildTransferOwnershipTx = useCallback(
    (_: number, orgSlug: string, newOwnerAddr: string) => {
      const slugBytes = ethers.utils.formatBytes32String(orgSlug);
      return {
        to: onboardingAddress,
        data: iface.encodeFunctionData("updateOwner", [slugBytes, newOwnerAddr]),
      } as any;
    },
    [onboardingAddress, iface]
  );

  const transferOwnership = useExecuteRawTx(
    buildTransferOwnershipTx,
    (_: number, __: string, newOwnerAddr: string) =>
      `Ownership transferred to ${newOwnerAddr}`
  );

  const payrollManagerInterface = useMemo(
    () => new ethers.utils.Interface(PayrollManagerABI as any),
    []
  );

  const buildConfigurePayeeEarningsTx = useCallback(
    (
      _: number,
      orgSlug: string,
      payeeIdRaw: string,
      assignmentsRaw: PayeeAssignmentDraft[]
    ) => {
      if (!payrollManagerAddress) {
        throw new Error("Payroll manager address missing");
      }

      const slugBytes = ethers.utils.formatBytes32String(orgSlug);
      const payeeId = ethers.BigNumber.from(payeeIdRaw);
      const assignments = assignmentsRaw.map((assignment) => ({
        earningsCodeId: ethers.BigNumber.from(assignment.earningsCodeId),
        rate: ethers.utils.parseEther(assignment.rate || "0"),
        runData: assignment.runData || "0x",
      }));

      return {
        to: payrollManagerAddress,
        data: payrollManagerInterface.encodeFunctionData("configurePayeePayroll", [
          slugBytes,
          payeeId,
          assignments,
        ]),
      } as any;
    },
    [payrollManagerAddress, payrollManagerInterface]
  );

  const configurePayeeEarnings = useExecuteRawTx(
    buildConfigurePayeeEarningsTx,
    (
      _: number,
      orgSlug: string,
      payeeIdRaw: string,
      assignmentsRaw: PayeeAssignmentDraft[]
    ) => `Configured payee ${payeeIdRaw} with ${assignmentsRaw.length} earnings code(s) for ${orgSlug}`
  );

  function handleFetchOrg() {
    if (!slug.trim() || !chainId) return;
    fetchOrgInfo(slug.trim());
  }

  function handleRegisterOrg() {
    if (!slug.trim() || !chainId) return;
    registerOrg(chainId, slug.trim());
  }

  async function handleTransferOwnership() {
    if (!newOwner.trim() || !chainId) return;
    await transferOwnership(chainId, slug.trim(), newOwner.trim());
    setNewOwner("");
  }

  const assignedCodeIdsForModalPayee = useMemo(() => {
    const payeeId = payeeEarningsModal.payee?.payeeId?.toString();
    if (!payeeId) return new Set<string>();
    const defaults = defaultsByPayeeId.get(payeeId);
    return new Set((defaults?.earnings ?? []).map((earning) => earning.earningsCodeId.toString()));
  }, [payeeEarningsModal.payee, defaultsByPayeeId]);

  const selectedModalCode = useMemo(
    () => (modalCodeId ? earningsCodeById.get(modalCodeId) ?? null : null),
    [modalCodeId, earningsCodeById]
  );

  const selectedModalRule = selectedModalCode?.rule ?? payeeEarningsModal.earning?.rule ?? ethers.constants.AddressZero;
  const selectedModalRuleMeta = useMemo(
    () => buildRuleMeta(selectedModalRule, config),
    [selectedModalRule, config]
  );

  useEffect(() => {
    if (!payeeEarningsModal.isOpen) return;

    const earning = payeeEarningsModal.earning;
    if (earning) {
      const codeId = earning.earningsCodeId.toString();
      setModalCodeId(codeId);
      setModalRate(formatRate(earning.rate));
      setModalRawRunData(earning.runData || "0x");

      try {
        const ruleMeta = buildRuleMeta(earning.rule, config);
        if (ruleMeta.kind === "hourly" && earning.runData && earning.runData !== "0x") {
          const decoded = ethers.utils.defaultAbiCoder.decode(["uint32"], earning.runData);
          setModalHourlyRunData(String(Number((decoded?.[0] as ethers.BigNumber).toString())));
        } else {
          setModalHourlyRunData("40");
        }
      } catch {
        setModalHourlyRunData("40");
      }
      return;
    }

    setModalRate("0");
    setModalRawRunData("0x");
    setModalHourlyRunData("40");

    if (payeeEarningsModal.mode === "add") {
      const firstAvailable = organizationEarningsCodes.find(
        (code) => !assignedCodeIdsForModalPayee.has(code.earningsCodeId.toString())
      );
      setModalCodeId(firstAvailable ? firstAvailable.earningsCodeId.toString() : "");
    } else {
      setModalCodeId("");
    }
  }, [
    payeeEarningsModal,
    config,
    organizationEarningsCodes,
    assignedCodeIdsForModalPayee,
  ]);

  function openPayeeEarningsModal(
    mode: PayeeEarningsMode,
    payee: PayeeModel,
    earning: PayeeDefaultEarningView | null = null
  ) {
    setPayeeEarningsModal({
      isOpen: true,
      mode,
      payee,
      earning,
    });
  }

  function resolveModalRunData(ruleAddress: string) {
    const ruleMeta = buildRuleMeta(ruleAddress, config);
    if (ruleMeta.kind === "hourly") {
      return ethers.utils.defaultAbiCoder.encode(["uint32"], [Math.max(0, Math.floor(Number(modalHourlyRunData) || 0))]);
    }
    if (ruleMeta.kind === "custom") {
      return modalRawRunData?.trim() || "0x";
    }
    return "0x";
  }

  function buildPayeeAssignmentsForSave(includeAllCatalog: boolean): PayeeAssignmentDraft[] {
    const payeeId = payeeEarningsModal.payee?.payeeId?.toString();
    if (!payeeId) return [];

    const currentDefaults = defaultsByPayeeId.get(payeeId)?.earnings ?? [];
    const assignmentMap = new Map<string, PayeeAssignmentDraft>();

    for (const earning of currentDefaults) {
      assignmentMap.set(earning.earningsCodeId.toString(), {
        earningsCodeId: earning.earningsCodeId.toString(),
        rate: formatRate(earning.rate),
        runData: earning.runData || "0x",
      });
    }

    if (modalCodeId) {
      const selectedRuleAddress =
        selectedModalCode?.rule ??
        payeeEarningsModal.earning?.rule ??
        ethers.constants.AddressZero;

      if (payeeEarningsModal.mode === "delete") {
        assignmentMap.set(modalCodeId, {
          earningsCodeId: modalCodeId,
          rate: "0",
          runData: "0x",
        });
      } else {
        assignmentMap.set(modalCodeId, {
          earningsCodeId: modalCodeId,
          rate: modalRate || "0",
          runData: resolveModalRunData(selectedRuleAddress),
        });
      }
    }

    if (includeAllCatalog) {
      for (const orgCode of organizationEarningsCodes) {
        const codeId = orgCode.earningsCodeId.toString();
        if (!assignmentMap.has(codeId)) {
          const ruleMeta = buildRuleMeta(orgCode.rule, config);
          assignmentMap.set(codeId, {
            earningsCodeId: codeId,
            rate: "0",
            runData:
              ruleMeta.kind === "hourly"
                ? ethers.utils.defaultAbiCoder.encode(["uint32"], [0])
                : "0x",
          });
        }
      }
    }

    return Array.from(assignmentMap.values()).sort((a, b) =>
      ethers.BigNumber.from(a.earningsCodeId).lt(ethers.BigNumber.from(b.earningsCodeId)) ? -1 : 1
    );
  }

  async function handleSubmitPayeeEarningsModal(includeAllCatalog: boolean) {
    if (!chainId || !payeeEarningsModal.payee || !slug.trim()) return;

    const payeeId = payeeEarningsModal.payee.payeeId.toString();
    const assignments = buildPayeeAssignmentsForSave(includeAllCatalog);
    if (assignments.length === 0) return;

    await configurePayeeEarnings(chainId, slug.trim(), payeeId, assignments);

    setPayeeEarningsModal({
      isOpen: false,
      mode: "view",
      payee: null,
      earning: null,
    });
  }

  return (
    <PageContainer center maxWidth={1320}>
      <Stack gap="lg" style={{ width: "100%" }}>
        <Card style={{ width: "100%", maxWidth: 860, alignSelf: "center" }}>
          <CardContent>
            <Stack>
              <Text.Title>Organization Management</Text.Title>

              <Stack>
                <Text.Label>Organization Slug</Text.Label>
                <Row gap="sm">
                  <Input
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="my-org"
                    style={{ flex: 1 }}
                  />
                  <ButtonSecondary onClick={handleFetchOrg} style={{ width: 120 }}>
                    {loading ? "Loading..." : "Fetch"}
                  </ButtonSecondary>
                </Row>
              </Stack>

              {orgInfo && (
                <>
                  <Stack style={{ padding: "var(--spacing-md)", backgroundColor: "var(--colors-background)", borderRadius: "var(--radius-md)" }}>
                    <Text.Body>
                      <strong>Owner:</strong> {orgInfo.owner}
                    </Text.Body>
                    <Text.Body color={isAdmin ? "success" : "muted"}>
                      {isAdmin ? "✓ Admin Mode" : "Read Only Mode"}
                    </Text.Body>
                    <Text.Body color="muted" size="sm">
                      Earnings Catalog: {organizationEarningsCodes.length} code(s) · Defaults Loaded: {payeeDefaults.length} payee(s)
                    </Text.Body>
                    <Row gap="sm" justify="end">
                      <ButtonSecondary
                        style={{ flex: 0 }}
                        onClick={() => navigate(ROUTES.PAYROLL_CURRENT(slug.trim()))}
                        disabled={!slug.trim()}
                      >
                        Go to Current Payroll
                      </ButtonSecondary>
                    </Row>
                  </Stack>

                  {isAdmin && (
                    <>
                      <Stack>
                        <Text.Label>Transfer Ownership</Text.Label>
                        <Row gap="sm">
                          <AddressInput
                            value={newOwner}
                            onChange={(e) => setNewOwner((e.target as HTMLInputElement).value)}
                            placeholder="0x…"
                            style={{ flex: 1 }}
                          />
                          <ButtonSecondary onClick={handleTransferOwnership} style={{ width: 120 }}>
                            Transfer
                          </ButtonSecondary>
                        </Row>
                      </Stack>

                      {orgInfo.exists && (
                        <PayrollEarningsManager
                          slug={slug.trim()}
                          canEdit={isAdmin}
                        />
                      )}
                    </>
                  )}

                  {!orgInfo.exists && (
                    <ButtonPrimary onClick={handleRegisterOrg}>
                      Create Organization
                    </ButtonPrimary>
                  )}

                </>
              )}
            </Stack>
          </CardContent>
        </Card>

        {orgInfo?.exists && (
          <Card style={{ width: "100%" }}>
            <CardContent>
              <PayeesTable
                payees={payees}
                searchEnabled={true}
                extraColumns={[
                  {
                    key: "defaultCodes",
                    header: "Default Codes",
                  },
                  {
                    key: "payeeStatus",
                    header: "Status",
                  },
                ]}
                getExtraCells={(payee) => {
                  const payeeId = payee.payeeId.toString();
                  const defaults = defaultsByPayeeId.get(payeeId);
                  return {
                    defaultCodes: defaults?.earnings.length ?? 0,
                    payeeStatus: payeeStatusLabel(defaults?.payeeStatus ?? payee.status),
                  };
                }}
                renderExpandedRow={(payee) => {
                  const payeeId = payee.payeeId.toString();
                  const defaults = defaultsByPayeeId.get(payeeId);

                  return (
                    <Card style={{ backgroundColor: "var(--colors-background)", border: "1px solid var(--colors-border)" }}>
                      <CardContent>
                        <Stack gap="sm">
                          <Text.Label>Payee Default Earnings</Text.Label>
                          {isAdmin && (
                            <Row align="center" style={{ width: "100%" }}>
                              <div style={{ flex: 1, height: 1, background: "var(--colors-border)" }} />
                              <ButtonSecondary
                                style={{ flex: 0, minWidth: 150, borderRadius: 999, paddingInline: "var(--spacing-md)" }}
                                onClick={() => openPayeeEarningsModal("add", payee, null)}
                              >
                                + Add Earnings
                              </ButtonSecondary>
                              <div style={{ flex: 1, height: 1, background: "var(--colors-border)" }} />
                            </Row>
                          )}
                          {!defaults || defaults.earnings.length === 0 ? (
                            <Text.Body color="muted">
                              No default earnings assignments found for this payee.
                            </Text.Body>
                          ) : (
                            <Stack gap="sm">
                              {defaults.earnings.map((earning) => {
                                const codeId = earning.earningsCodeId.toString();
                                const codeMeta = earningsCodeById.get(codeId);
                                const active = codeMeta?.isActive ?? earning.isActive;
                                const ruleMeta = buildRuleMeta(earning.rule, config);
                                const showConfig =
                                  ruleMeta.configRequired ||
                                  (ruleMeta.kind === "custom" && Boolean(earning.config && earning.config !== "0x"));
                                const showRunData =
                                  ruleMeta.runDataRequired ||
                                  (ruleMeta.kind === "custom" && Boolean(earning.runData && earning.runData !== "0x"));

                                return (
                                  <Card key={`${payeeId}-${codeId}`} style={{ border: "1px solid var(--colors-border)" }}>
                                    <CardContent style={{ padding: "var(--spacing-md)", position: "relative" }}>
                                      {isAdmin && (
                                        <Row gap="xs" align="center" style={{ position: "absolute", right: "var(--spacing-sm)", top: "var(--spacing-sm)", zIndex: 1 }}>
                                          <IconButton
                                            size="xl"
                                            iconFontSize="xl"
                                            shape="rounded"
                                            aria-label="Edit earning"
                                            title="Edit"
                                            onClick={() => openPayeeEarningsModal("edit", payee, earning)}
                                            style={{
                                              borderColor: "var(--colors-borderHover)",
                                              color: "var(--colors-text-main)",
                                            }}
                                          >
                                            <span
                                              style={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                width: "1em",
                                                height: "1em",
                                                transform: "translate(-2px, 0px) rotate(90deg)",
                                                transformOrigin: "center",
                                                fontSize: "26px",
                                                lineHeight: "1em",
                                                fontWeight: 400,
                                              }}
                                            >
                                              ✎
                                            </span>
                                          </IconButton>
                                          <IconButton
                                            size="xl"
                                            iconFontSize="lg"
                                            shape="rounded"
                                            aria-label="Delete earning"
                                            title="Delete"
                                            onClick={() => openPayeeEarningsModal("delete", payee, earning)}
                                            style={{
                                              borderColor: "var(--colors-borderHover)",
                                              color: "var(--colors-error)",
                                            }}
                                          >
                                            <span style={{ display: "flex", transform: "translateX(1px)" }}>
                                              <TrashBinIcon size={24} />
                                            </span>
                                          </IconButton>
                                        </Row>
                                      )}
                                      <Stack gap="xs">
                                        <Text.Body weight={600}>Rule {ruleMeta.name}: {codeId}</Text.Body>
                                        <Text.Body color={active ? "success" : "warn"} size="sm">
                                          State: {active ? "Active" : "Inactive"}
                                        </Text.Body>
                                        <Row gap="sm" align="center" wrap>
                                          <Text.Body size="sm" color="muted">
                                            Address: {shortAddress(earning.rule)}
                                          </Text.Body>
                                          <CopyButton value={earning.rule} ariaLabel="Copy rule address" />
                                        </Row>
                                        <Text.Body size="sm" color="muted">
                                          Rate: {formatRate(earning.rate)}
                                        </Text.Body>
                                        {showConfig && (
                                          <Text.Body size="sm" color="muted">
                                            Config: {decodeConfigDisplay(earning.config, earning.rule, config)}
                                          </Text.Body>
                                        )}
                                        {showRunData && (
                                          <Text.Body size="sm" color="muted">
                                            Run Data: {decodeRunDataDisplay(earning.runData, earning.rule, config)}
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
                }}
                onAddPayee={
                  isAdmin
                    ? {
                        onSubmit: async (role, address) => {
                          await onboardPayee(chainId!, slug, role, address);
                        },
                        loading: false,
                      }
                    : undefined
                }
              />
            </CardContent>
          </Card>
        )}

        <Modal
          isOpen={payeeEarningsModal.isOpen}
          onClose={() =>
            setPayeeEarningsModal({
              isOpen: false,
              mode: "view",
              payee: null,
              earning: null,
            })
          }
          title={
            payeeEarningsModal.mode === "add"
              ? "Add Earnings Code"
              : payeeEarningsModal.mode === "edit"
              ? "Edit Earnings Code"
              : payeeEarningsModal.mode === "delete"
              ? "Delete Earnings Code"
              : "View Earnings Code"
          }
          width={620}
        >
          <Stack gap="md">
            <Text.Body color="muted" size="sm">
              Payee: #{payeeEarningsModal.payee?.payeeId?.toString() ?? "-"} · {shortAddress(payeeEarningsModal.payee?.paymentAddress ?? ethers.constants.AddressZero)}
            </Text.Body>

            <Stack>
              <Text.Body size="sm" color="muted">Earnings Code</Text.Body>
              <Select<string>
                value={modalCodeId || null}
                onChange={(v) => setModalCodeId(String(v))}
                disabled={payeeEarningsModal.mode === "view" || payeeEarningsModal.mode === "delete"}
              >
                {organizationEarningsCodes.map((code) => {
                  const ruleMeta = buildRuleMeta(code.rule, config);
                  return (
                    <SelectOption
                      key={code.earningsCodeId.toString()}
                      value={code.earningsCodeId.toString()}
                      label={`#${code.earningsCodeId.toString()} · ${ruleMeta.name} · ${code.isActive ? "Active" : "Inactive"}`}
                    />
                  );
                })}
              </Select>
              <Text.Body size="xs" color="muted">
                Same rule can have multiple earnings codes. Re-selecting an existing code updates it.
              </Text.Body>
            </Stack>

            {selectedModalCode && (
              <Row justify="between" align="center" wrap>
                <Text.Body size="sm" color="muted">
                  Rule: {selectedModalRuleMeta.name}
                </Text.Body>
                <Row gap="sm" align="center">
                  <Text.Body size="sm" color="muted">{shortAddress(selectedModalCode.rule)}</Text.Body>
                  <CopyButton value={selectedModalCode.rule} ariaLabel="Copy rule address" />
                </Row>
              </Row>
            )}

            {payeeEarningsModal.mode !== "view" && (
              <Stack>
                <Text.Body size="sm" color="muted">Rate</Text.Body>
                <Input
                  value={modalRate}
                  onChange={(e) => setModalRate(e.target.value)}
                  placeholder="e.g. 20"
                  disabled={payeeEarningsModal.mode === "delete"}
                />
              </Stack>
            )}

            {selectedModalRuleMeta.kind === "hourly" && payeeEarningsModal.mode !== "view" && (
              <Stack>
                <Text.Body size="sm" color="muted">Hours Worked (runData)</Text.Body>
                <NumberInput
                  value={modalHourlyRunData}
                  onChange={(e) => setModalHourlyRunData((e.target as HTMLInputElement).value)}
                  allowDecimal={false}
                  disabled={payeeEarningsModal.mode === "delete"}
                />
              </Stack>
            )}

            {selectedModalRuleMeta.kind === "custom" && payeeEarningsModal.mode !== "view" && (
              <Stack>
                <Text.Body size="sm" color="muted">Run Data (raw hex)</Text.Body>
                <Input
                  value={modalRawRunData}
                  onChange={(e) => setModalRawRunData(e.target.value)}
                  placeholder="0x"
                  disabled={payeeEarningsModal.mode === "delete"}
                />
              </Stack>
            )}

            {payeeEarningsModal.mode === "view" && payeeEarningsModal.earning && (
              <Stack gap="sm">
                <Text.Body size="sm" color="muted">
                  Rate: {formatRate(payeeEarningsModal.earning.rate)}
                </Text.Body>
                {(selectedModalRuleMeta.configRequired || selectedModalRuleMeta.kind === "custom") && (
                  <Text.Body size="sm" color="muted">
                    Config: {decodeConfigDisplay(payeeEarningsModal.earning.config, payeeEarningsModal.earning.rule, config)}
                  </Text.Body>
                )}
                {(selectedModalRuleMeta.runDataRequired || selectedModalRuleMeta.kind === "custom") && (
                  <Text.Body size="sm" color="muted">
                    Run Data: {decodeRunDataDisplay(payeeEarningsModal.earning.runData, payeeEarningsModal.earning.rule, config)}
                  </Text.Body>
                )}
              </Stack>
            )}

            {payeeEarningsModal.mode === "delete" && (
              <Text.Body color="warn" size="sm">
                Delete uses a soft remove by setting the selected payee/code rate to 0 and runData to 0x.
              </Text.Body>
            )}

            <Row gap="sm" justify="end">
              <ButtonSecondary
                style={{ flex: 0 }}
                onClick={() =>
                  setPayeeEarningsModal({
                    isOpen: false,
                    mode: "view",
                    payee: null,
                    earning: null,
                  })
                }
              >
                Close
              </ButtonSecondary>

              {payeeEarningsModal.mode !== "view" && isAdmin && (
                <>
                  <ButtonSecondary
                    style={{ flex: 0 }}
                    onClick={() => handleSubmitPayeeEarningsModal(false)}
                    disabled={!modalCodeId}
                  >
                    Save One
                  </ButtonSecondary>
                  <ButtonPrimary
                    style={{ flex: 0 }}
                    onClick={() => handleSubmitPayeeEarningsModal(true)}
                    disabled={organizationEarningsCodes.length === 0}
                  >
                    Save All
                  </ButtonPrimary>
                </>
              )}
            </Row>
          </Stack>
        </Modal>
      </Stack>
    </PageContainer>
  );
}
