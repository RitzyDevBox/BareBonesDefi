import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { PageContainer } from "../components/PageWrapper/PageContainer";
import { Card, CardContent } from "../components/BasicComponents";
import { Stack, Row } from "../components/Primitives";
import { Text } from "../components/Primitives/Text";
import { IconButton } from "../components/Button/IconButton";
import { Select, SelectOption } from "../components/Select";
import { AddressInput } from "../components/Inputs/AddressInput";
import { ButtonPrimary, ButtonSecondary } from "../components/Button/ButtonPrimary";
import { useWalletProvider } from "../hooks/useWalletProvider";
import { useExecuteRawTx } from "../hooks/useExecuteRawTx";
import { useTxRefresh } from "../providers/TxRefreshProvider";
import { getBareBonesConfiguration } from "../constants/misc";
import { DEFAULT_PAY_BATCH_CODE, payeeStatusLabel } from "../constants/payroll";
import PayrollManagerABI from "../abis/paymentPipelines/PayrollManager.abi.json";
import { PayeesTable } from "../components/PayeesTable";
import { PayrollNavigation } from "../components/PayrollNavigation";
import type { OrganizationModel, PayeeModel } from "../models/payments";
import { fetchPayeesByOrganization } from "../utils/payroll/fetchPayeesByOrganization";
import { shortAddress } from "../utils/formatUtils";
import { SaveIcon } from "../assets/icons/SaveIcon";
import { Loader } from "../components/Loader/Loader";
import { Sheet } from "../components/Primitives/Sheet";
import { ScreenSize, useMediaQuery } from "../hooks/useMediaQuery";
import { OrganizationPicker } from "../components/Organizations/OrganizationPicker";
import { ROUTES } from "../routes";

export function PaymentPage() {
  const { organizationId } = useParams<{ organizationId?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const screenSize = useMediaQuery();
  const isPhone = screenSize === ScreenSize.Phone;
  const { account, provider, chainId } = useWalletProvider();
  const { version } = useTxRefresh();

  const [slug, setSlug] = useState<string>(organizationId ?? "");
  const [fetchedSlug, setFetchedSlug] = useState<string>((organizationId ?? "").trim());
  const [loading, setLoading] = useState(false);
  const [loadingOwnedOrgs, setLoadingOwnedOrgs] = useState(false);
  const [ownedOrganizations, setOwnedOrganizations] = useState<string[]>([]);
  const [orgInfo, setOrgInfo] = useState<OrganizationModel | null>(null);
  const [payees, setPayees] = useState<PayeeModel[]>([]);
  const [isAdmin, setIsAdmin] = useState<boolean>(Boolean((location.state as { isAdmin?: boolean } | null)?.isAdmin));
  const [isRegisteringOrg, setIsRegisteringOrg] = useState(false);
  const [isOnboardingPayees, setIsOnboardingPayees] = useState(false);
  const [savingPayeeId, setSavingPayeeId] = useState<string | null>(null);

  const [editingPayeeId, setEditingPayeeId] = useState<string | null>(null);
  const [editDraftStatus, setEditDraftStatus] = useState<number>(0);
  const [editDraftAddress, setEditDraftAddress] = useState<string>("");

  const config = useMemo(() => {
    if (!chainId) return null;
    return getBareBonesConfiguration(chainId);
  }, [chainId]);

  const payrollManagerAddress = config?.payrollManagerAddress;
  const iface = useMemo(() => new ethers.utils.Interface(PayrollManagerABI as any), []);
  const editingPayee = useMemo(
    () => payees.find((p) => p.payeeId.toString() === editingPayeeId) ?? null,
    [payees, editingPayeeId]
  );

  async function fetchOrgInfo(orgSlug: string) {
    if (!provider || !payrollManagerAddress) return;

    setLoading(true);
    setOrgInfo(null);
    setPayees([]);
    setIsAdmin(false);
    try {
      const contract = new ethers.Contract(payrollManagerAddress, PayrollManagerABI as any, provider);
      const slugBytes = ethers.utils.formatBytes32String(orgSlug);
      const org = await contract.organizations(slugBytes);

      setOrgInfo({ slug: slugBytes, owner: org.owner, exists: org.exists });
      setIsAdmin(Boolean(org.exists && org.owner.toLowerCase() === account?.toLowerCase()));

      if (!org.exists) {
        setPayees([]);
        return;
      }

      const payeeList = await fetchPayeesByOrganization(provider, payrollManagerAddress, slugBytes);
      setPayees(payeeList);
    } catch (err) {
      console.error("Error fetching org info:", err);
      setOrgInfo(null);
      setPayees([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!provider || !payrollManagerAddress || !account) {
      setOwnedOrganizations([]);
      return;
    }

    const managerAddress = payrollManagerAddress;

    async function loadOwnedOrganizations() {
      setLoadingOwnedOrgs(true);
      try {
        const contract = new ethers.Contract(managerAddress, PayrollManagerABI as any, provider);
        const orgs = await contract.getOrganizationsByOwner(account);
        const slugs = (orgs ?? []).map((org: string) => {
          try {
            return ethers.utils.parseBytes32String(org);
          } catch {
            return org;
          }
        });
        setOwnedOrganizations(slugs);
      } catch (err) {
        console.error("Error loading owned organizations:", err);
        setOwnedOrganizations([]);
      } finally {
        setLoadingOwnedOrgs(false);
      }
    }

    loadOwnedOrganizations();
  }, [provider, payrollManagerAddress, account]);

  useEffect(() => {
    const routeSlug = (organizationId ?? "").trim();
    setSlug(routeSlug);
    setFetchedSlug(routeSlug);
  }, [organizationId]);

  useEffect(() => {
    if (organizationId) return;
    if (loadingOwnedOrgs) return;
    if (ownedOrganizations.length === 0) return;

    const firstOrg = ownedOrganizations[0]?.trim();
    if (!firstOrg) return;

    navigate(ROUTES.PAYMENTS_ORG(firstOrg), { replace: true });
  }, [organizationId, loadingOwnedOrgs, ownedOrganizations, navigate]);

  useEffect(() => {
    const navIsAdmin = (location.state as { isAdmin?: boolean } | null)?.isAdmin;
    if (typeof navIsAdmin === "boolean") {
      setIsAdmin(navIsAdmin);
    }
  }, [location.state]);

  useEffect(() => {
    if (!fetchedSlug.trim()) return;
    fetchOrgInfo(fetchedSlug.trim());
  }, [fetchedSlug, version, provider, payrollManagerAddress, account]);

  const registerOrg = useExecuteRawTx(
    (_: number, orgSlug: string) => {
      const slugBytes = ethers.utils.formatBytes32String(orgSlug);
      return {
        to: payrollManagerAddress,
        data: iface.encodeFunctionData("registerOrganization", [slugBytes]),
      } as any;
    },
    (_: number, orgSlug: string) => `Organization "${orgSlug}" registered`
  );

  const onboardPayee = useExecuteRawTx(
    (_: number, orgSlug: string, name: string, paymentAddress: string) => {
      if (!payrollManagerAddress) throw new Error("Payroll manager address missing");
      const slugBytes = ethers.utils.formatBytes32String(orgSlug);
      const nameBytes = ethers.utils.formatBytes32String(name.trim());

      return {
        to: payrollManagerAddress,
        data: iface.encodeFunctionData("onboardPayee", [slugBytes, nameBytes, paymentAddress, "0x"]),
      } as any;
    },
    (_: number, __: string, name: string, paymentAddress: string) =>
      `Onboarded ${name} (${shortAddress(paymentAddress)})`
  );

  const batchOnboardPayees = useExecuteRawTx(
    (_: number, orgSlug: string, entries: Array<{ name: string; address: string }>) => {
      if (!payrollManagerAddress) throw new Error("Payroll manager address missing");
      if (!entries.length) throw new Error("No payees to onboard");

      const slugBytes = ethers.utils.formatBytes32String(orgSlug);
      const configs = entries.map((entry) => ({
        name: ethers.utils.formatBytes32String(entry.name.trim()),
        paymentAddress: entry.address.trim(),
        params: "0x",
        assignments: [],
      }));

      return {
        to: payrollManagerAddress,
        data: iface.encodeFunctionData("batchOnboardPayeesAndConfigurePayBatch", [
          slugBytes,
          DEFAULT_PAY_BATCH_CODE,
          configs,
        ]),
      } as any;
    },
    (_: number, __: string, entries: Array<{ name: string; address: string }>) =>
      `Onboarded ${entries.length} payee(s)`
  );

  const updatePayee = useExecuteRawTx(
    (_: number, payee: PayeeModel, nextStatus: number, nextAddress: string) => {
      if (!payrollManagerAddress) throw new Error("Payroll manager address missing");

      return {
        to: payrollManagerAddress,
        data: iface.encodeFunctionData("updatePayee", [
          payee.payeeId,
          payee.role,
          nextAddress,
          payee.params,
          nextStatus,
        ]),
      } as any;
    },
    (_: number, payee: PayeeModel, nextStatus: number, nextAddress: string) =>
      `Updated payee ${payee.payeeId.toString()} (${payeeStatusLabel(nextStatus)}, ${shortAddress(nextAddress)})`
  );

  async function handleCreateOrganization(nextSlug?: string) {
    const targetSlug = (nextSlug ?? slug).trim();
    if (!targetSlug || !chainId || isRegisteringOrg) return;
    setIsRegisteringOrg(true);
    try {
      await Promise.resolve(registerOrg(chainId, targetSlug));
      setSlug(targetSlug);
      setFetchedSlug(targetSlug);
    } finally {
      setIsRegisteringOrg(false);
    }
  }

  function beginEditPayee(payee: PayeeModel) {
    setEditingPayeeId(payee.payeeId.toString());
    setEditDraftStatus(Number(payee.status ?? 0));
    setEditDraftAddress(payee.paymentAddress || "");
  }

  function cancelEditPayee() {
    setEditingPayeeId(null);
    setEditDraftStatus(0);
    setEditDraftAddress("");
  }

  async function saveEditPayee(payee: PayeeModel) {
    if (!chainId || savingPayeeId) return;
    setSavingPayeeId(payee.payeeId.toString());
    try {
      const tx = await updatePayee(chainId, payee, editDraftStatus, editDraftAddress.trim());
      if (tx) cancelEditPayee();
    } finally {
      setSavingPayeeId(null);
    }
  }

  return (
    <PageContainer center maxWidth={1320}>
      <Stack gap="lg" style={{ width: "100%" }}>
        <Card style={{ width: "100%", maxWidth: 900, alignSelf: "center" }}>
          <CardContent>
            <Stack>
              <OrganizationPicker
                value={slug}
                onChange={(next) => {
                  setSlug(next);
                  setFetchedSlug("");
                  setOrgInfo(null);
                  setPayees([]);
                  setIsAdmin(false);
                }}
                organizations={ownedOrganizations}
                loadingOrganizations={loadingOwnedOrgs}
                loadingFetch={loading}
                onFetch={(next) => {
                  const target = next.trim();
                  if (!target) return;
                  setSlug(target);
                  setFetchedSlug(target);
                }}
                onCreateOrganization={handleCreateOrganization}
                isCreating={isRegisteringOrg}
              />

              {!!slug.trim() && (
                <PayrollNavigation slug={slug.trim()} active="overview" title="Organization Management" isAdmin={isAdmin} />
              )}
            </Stack>
          </CardContent>
        </Card>

        {!!slug.trim() && (
          <Card style={{ width: "100%" }}>
            <CardContent>
              <PayeesTable
                payees={payees}
                loading={loading}
                searchEnabled
                extraColumns={
                  isPhone
                    ? []
                    : [
                        { key: "status", header: "Status", allowOverflow: true },
                        { key: "actions", header: "Actions", allowOverflow: true },
                      ]
                }
                getExtraCells={
                  isPhone
                    ? undefined
                    : (payee) => {
                        const payeeId = payee.payeeId.toString();
                        const isEditing = editingPayeeId === payeeId;
                        const currentStatus = Number(payee.status ?? 0);

                        return {
                          ...(isEditing
                            ? {
                                address: (
                                  <div onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} style={{ minWidth: 220 }}>
                                    <AddressInput
                                      value={editDraftAddress}
                                      onChange={(e) => setEditDraftAddress((e.target as HTMLInputElement).value)}
                                      placeholder="0x..."
                                    />
                                  </div>
                                ),
                              }
                            : {}),
                          status: isEditing ? (
                            <div onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                              <Row gap="sm" align="center" wrap={false}>
                                <div style={{ minWidth: 160, position: "relative", zIndex: 5 }}>
                                  <Select<number>
                                    value={editDraftStatus}
                                    onChange={(value) => setEditDraftStatus(Number(value))}
                                    disabled={!isAdmin}
                                  >
                                    <SelectOption value={0} label="Active" />
                                    <SelectOption value={1} label="On Leave" />
                                    <SelectOption value={2} label="Inactive" />
                                  </Select>
                                </div>
                              </Row>
                            </div>
                          ) : (
                            payeeStatusLabel(currentStatus)
                          ),
                          actions: (
                            <div onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                              <Row gap="sm" align="center" wrap={false}>
                                {!isEditing && (
                                  <IconButton
                                    size="xl"
                                    iconFontSize="xl"
                                    shape="square"
                                    aria-label="Edit payee"
                                    title="Edit payee"
                                    style={{
                                      flex: 0,
                                      borderColor: "var(--colors-borderHover)",
                                      color: "var(--colors-text-main)",
                                    }}
                                    disabled={!isAdmin}
                                    onClick={() => beginEditPayee(payee)}
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
                                )}
                                {isEditing && (
                                  <>
                                    <IconButton
                                      size="xl"
                                      iconFontSize="xl"
                                      shape="square"
                                      aria-label="Save payee"
                                      title="Save payee"
                                      style={{
                                        flex: 0,
                                        borderColor: "var(--colors-borderHover)",
                                        color: "var(--colors-success)",
                                        alignSelf: "center",
                                      }}
                                      disabled={!isAdmin || !chainId || !editDraftAddress.trim() || savingPayeeId !== null}
                                      onClick={() => saveEditPayee(payee)}
                                    >
                                      {savingPayeeId === payeeId ? <Loader size={16} color="currentColor" /> : <SaveIcon size={26} />}
                                    </IconButton>
                                    <IconButton
                                      size="xl"
                                      iconFontSize="xl"
                                      shape="square"
                                      aria-label="Cancel edit"
                                      title="Cancel edit"
                                      style={{
                                        flex: 0,
                                        borderColor: "var(--colors-borderHover)",
                                        color: "var(--colors-text-muted)",
                                      }}
                                      onClick={cancelEditPayee}
                                    >
                                      <span style={{ fontSize: 28, lineHeight: 1 }}>×</span>
                                    </IconButton>
                                  </>
                                )}
                              </Row>
                            </div>
                          ),
                        };
                      }
                }
                renderExpandedRow={
                  isPhone
                    ? (payee) => (
                        <Stack gap="sm">
                          <Text.Body size="sm" color="muted">
                            Status: {payeeStatusLabel(Number(payee.status ?? 0))}
                          </Text.Body>
                          <Row justify="end">
                            <ButtonSecondary
                              onClick={(e) => {
                                e.stopPropagation();
                                beginEditPayee(payee);
                              }}
                              disabled={!isAdmin}
                              style={{ minWidth: 132, whiteSpace: "nowrap", padding: "10px 16px", minHeight: 40, borderRadius: "var(--radius-sm)" }}
                            >
                              Edit
                            </ButtonSecondary>
                          </Row>
                        </Stack>
                      )
                    : undefined
                }
                onAddPayee={
                  isAdmin && orgInfo?.exists
                    ? {
                        onSubmit: async (name, paymentAddress) => {
                          if (!chainId || !slug) return;
                          setIsOnboardingPayees(true);
                          try {
                            return await onboardPayee(chainId, slug, name, paymentAddress);
                          } finally {
                            setIsOnboardingPayees(false);
                          }
                        },
                        loading: isOnboardingPayees,
                        onSubmitBatch: async (rows) => {
                          if (!chainId || !slug || rows.length === 0) return;
                          setIsOnboardingPayees(true);
                          try {
                            return await batchOnboardPayees(chainId, slug, rows);
                          } finally {
                            setIsOnboardingPayees(false);
                          }
                        },
                      }
                    : undefined
                }
              />

              {isPhone && editingPayee && (
                <Sheet
                  open={Boolean(editingPayee)}
                  onClose={cancelEditPayee}
                  placement="bottom"
                >
                  <div style={{ padding: "var(--spacing-md)", overflowY: "auto" }}>
                    <Stack gap="md">
                      <Text.Label>Edit Payee</Text.Label>
                      <div style={{ minWidth: 160, position: "relative", zIndex: 5 }}>
                        <Select<number>
                          value={editDraftStatus}
                          onChange={(value) => setEditDraftStatus(Number(value))}
                          disabled={!isAdmin}
                        >
                          <SelectOption value={0} label="Active" />
                          <SelectOption value={1} label="On Leave" />
                          <SelectOption value={2} label="Inactive" />
                        </Select>
                      </div>
                      <AddressInput
                        value={editDraftAddress}
                        onChange={(e) => setEditDraftAddress((e.target as HTMLInputElement).value)}
                        placeholder="0x..."
                      />
                      <Row justify="end" gap="sm">
                        <ButtonSecondary
                          shape="rounded"
                          onClick={cancelEditPayee}
                          style={{
                            minWidth: 132,
                            minHeight: 40,
                            whiteSpace: "nowrap",
                            padding: "10px 16px",
                            borderRadius: "var(--radius-sm)",
                          }}
                        >
                          Cancel
                        </ButtonSecondary>
                        <ButtonPrimary
                          shape="rounded"
                          onClick={() => saveEditPayee(editingPayee)}
                          style={{
                            minWidth: 132,
                            minHeight: 40,
                            whiteSpace: "nowrap",
                            padding: "10px 16px",
                            borderRadius: "var(--radius-sm)",
                          }}
                          disabled={!isAdmin || !chainId || !editDraftAddress.trim() || savingPayeeId !== null}
                        >
                          {savingPayeeId === editingPayee.payeeId.toString()
                            ? <Loader inline label="Saving" size={14} color="currentColor" />
                            : "Save"}
                        </ButtonPrimary>
                      </Row>
                    </Stack>
                  </div>
                </Sheet>
              )}
            </CardContent>
          </Card>
        )}
      </Stack>
    </PageContainer>
  );
}
