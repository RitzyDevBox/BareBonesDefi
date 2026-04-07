import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { useParams } from "react-router-dom";
import { PageContainer } from "../components/PageWrapper/PageContainer";
import { Card, CardContent, Input } from "../components/BasicComponents";
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

export function PaymentPage() {
  const { organizationId } = useParams<{ organizationId?: string }>();
  const { account, provider, chainId } = useWalletProvider();
  const { version } = useTxRefresh();

  const [slug, setSlug] = useState<string>(organizationId ?? "");
  const [loading, setLoading] = useState(false);
  const [loadingOwnedOrgs, setLoadingOwnedOrgs] = useState(false);
  const [ownedOrganizations, setOwnedOrganizations] = useState<string[]>([]);
  const [orgInfo, setOrgInfo] = useState<OrganizationModel | null>(null);
  const [payees, setPayees] = useState<PayeeModel[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [newOwner, setNewOwner] = useState<string>("");

  const [editingPayeeId, setEditingPayeeId] = useState<string | null>(null);
  const [editDraftStatus, setEditDraftStatus] = useState<number>(0);
  const [editDraftAddress, setEditDraftAddress] = useState<string>("");

  const config = useMemo(() => {
    if (!chainId) return null;
    return getBareBonesConfiguration(chainId);
  }, [chainId]);

  const payrollManagerAddress = config?.payrollManagerAddress;
  const iface = useMemo(() => new ethers.utils.Interface(PayrollManagerABI as any), []);

  async function fetchOrgInfo(orgSlug: string) {
    if (!provider || !payrollManagerAddress) return;

    setLoading(true);
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
    if (!slug.trim()) return;
    fetchOrgInfo(slug.trim());
  }, [slug, version, provider, payrollManagerAddress, account]);

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

  const transferOwnership = useExecuteRawTx(
    (_: number, orgSlug: string, newOwnerAddr: string) => {
      const slugBytes = ethers.utils.formatBytes32String(orgSlug);
      return {
        to: payrollManagerAddress,
        data: iface.encodeFunctionData("updateOwner", [slugBytes, newOwnerAddr]),
      } as any;
    },
    (_: number, __: string, newOwnerAddr: string) => `Ownership transferred to ${newOwnerAddr}`
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

  function handleFetchOrg() {
    if (!slug.trim()) return;
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
    if (!chainId) return;
    const tx = await updatePayee(chainId, payee, editDraftStatus, editDraftAddress.trim());
    if (tx) cancelEditPayee();
  }

  return (
    <PageContainer center maxWidth={1320}>
      <Stack gap="lg" style={{ width: "100%" }}>
        <Card style={{ width: "100%", maxWidth: 900, alignSelf: "center" }}>
          <CardContent>
            <Stack>
              <Stack>
                <Text.Label>Organization Slug</Text.Label>
                {ownedOrganizations.length > 0 ? (
                  <>
                    <Select<string>
                      value={slug || null}
                      onChange={(value) => {
                        const selected = String(value ?? "");
                        setSlug(selected);
                        if (selected) fetchOrgInfo(selected);
                      }}
                      disabled={loading || ownedOrganizations.length === 0}
                    >
                      <SelectOption value="" label="Select an organization..." />
                      {ownedOrganizations.map((org) => (
                        <SelectOption key={org} value={org} label={org} />
                      ))}
                    </Select>
                    <Text.Body size="xs" color="muted" style={{ marginTop: "var(--spacing-xs)" }}>
                      Or enter a different organization slug manually:
                    </Text.Body>
                  </>
                ) : null}

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
                {loadingOwnedOrgs && (
                  <Text.Body size="xs" color="muted">Loading your organizations...</Text.Body>
                )}
              </Stack>

              {!!slug.trim() && (
                <PayrollNavigation slug={slug.trim()} active="overview" title="Organization Management" />
              )}

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
                      Total payees: {payees.length}
                    </Text.Body>
                  </Stack>

                  {isAdmin && (
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
                  )}

                  {!orgInfo.exists && (
                    <ButtonPrimary onClick={handleRegisterOrg}>Create Organization</ButtonPrimary>
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
                searchEnabled
                extraColumns={[
                  { key: "status", header: "Status", allowOverflow: true },
                  { key: "actions", header: "Actions", allowOverflow: true },
                ]}
                getExtraCells={(payee) => {
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
                                disabled={!isAdmin || !chainId || !editDraftAddress.trim()}
                                onClick={() => saveEditPayee(payee)}
                              >
                                <SaveIcon size={26} />
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
                }}
                onAddPayee={
                  isAdmin
                    ? {
                        onSubmit: async (name, paymentAddress) => {
                          if (!chainId || !slug) return;
                          return await onboardPayee(chainId, slug, name, paymentAddress);
                        },
                        loading: false,
                        onSubmitBatch: async (rows) => {
                          if (!chainId || !slug || rows.length === 0) return;
                          return await batchOnboardPayees(chainId, slug, rows);
                        },
                      }
                    : undefined
                }
              />
            </CardContent>
          </Card>
        )}
      </Stack>
    </PageContainer>
  );
}
