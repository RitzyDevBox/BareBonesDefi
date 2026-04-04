import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { useNavigate, useParams } from "react-router-dom";
import { PageContainer } from "../components/PageWrapper/PageContainer";
import { Card, CardContent } from "../components/BasicComponents";
import { Stack, Row } from "../components/Primitives";
import { Text } from "../components/Primitives/Text";
import { ButtonPrimary, ButtonSecondary } from "../components/Button/ButtonPrimary";
import { IconButton } from "../components/Button/IconButton";
import { Select, SelectOption } from "../components/Select";
import { AddressInput } from "../components/Inputs/AddressInput";
import { useWalletProvider } from "../hooks/useWalletProvider";
import { useExecuteRawTx } from "../hooks/useExecuteRawTx";
import { useTxRefresh } from "../providers/TxRefreshProvider";
import { getBareBonesConfiguration } from "../constants/misc";
import PayrollManagerABI from "../abis/paymentPipelines/PayrollManager.abi.json";
import { PayeesTable } from "../components/PayeesTable";
import type { OrganizationModel, PayeeModel } from "../models/payments";
import { fetchPayeesByOrganization } from "../utils/payroll/fetchPayeesByOrganization";
import { shortAddress } from "../utils/formatUtils";
import { ROUTES } from "../routes";
import { SaveIcon } from "../assets/icons/SaveIcon";

function parseNameLabel(name: string) {
  try {
    return ethers.utils.parseBytes32String(name);
  } catch {
    return name;
  }
}

function payeeStatusLabel(status?: number) {
  if (status === 0) return "Active";
  if (status === 1) return "On Leave";
  if (status === 2) return "Inactive";
  return `Status ${String(status ?? 0)}`;
}

export function ManagePayeesPage() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const navigate = useNavigate();
  const slug = (organizationId ?? "").trim();

  const { account, provider, chainId } = useWalletProvider();
  const { version } = useTxRefresh();

  const [loading, setLoading] = useState(false);
  const [orgInfo, setOrgInfo] = useState<OrganizationModel | null>(null);
  const [payees, setPayees] = useState<PayeeModel[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingPayeeId, setEditingPayeeId] = useState<string | null>(null);
  const [editDraftStatus, setEditDraftStatus] = useState<number>(0);
  const [editDraftAddress, setEditDraftAddress] = useState<string>("");

  const config = useMemo(() => {
    if (!chainId) return null;
    return getBareBonesConfiguration(chainId);
  }, [chainId]);

  const payrollManagerAddress = config?.payrollManagerAddress;
  const iface = useMemo(() => new ethers.utils.Interface(PayrollManagerABI as any), []);
  const defaultPayBatchCode = useMemo(() => ethers.utils.formatBytes32String("DEFAULT_PAY_BATCH"), []);

  async function fetchOrgInfo(orgSlug: string) {
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
        return;
      }

      const payeeList = await fetchPayeesByOrganization(provider, payrollManagerAddress, slugBytes);
      setPayees(payeeList);
    } catch (error) {
      console.error("Failed to load organization payees", error);
      setOrgInfo(null);
      setPayees([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!slug) return;
    fetchOrgInfo(slug);
  }, [slug, provider, payrollManagerAddress, account, version]);

  const onboardPayee = useExecuteRawTx(
    (_: number, orgSlug: string, name: string, paymentAddress: string) => {
      if (!payrollManagerAddress) throw new Error("Payroll manager address missing");
      if (!name.trim()) throw new Error("Name is required");

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
          defaultPayBatchCode,
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
    if (tx) {
      cancelEditPayee();
    }
  }

  return (
    <PageContainer center maxWidth={1320}>
      <Stack gap="lg" style={{ width: "100%" }}>
        <Card style={{ width: "100%", maxWidth: 900, alignSelf: "center" }}>
          <CardContent>
            <Row justify="between" align="center" wrap>
              <Text.Title align="left">Manage Payees</Text.Title>
              <Row gap="sm" wrap>
                <ButtonSecondary style={{ flex: 0 }} onClick={() => navigate(ROUTES.PAYMENTS_ORG(slug))}>
                  Back to Org
                </ButtonSecondary>
                <ButtonSecondary
                  style={{ flex: 0 }}
                  onClick={() => navigate(ROUTES.PAYMENTS_PAY_BATCHES(slug))}
                  disabled={!slug}
                >
                  Go to Pay Batches
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

            {loading && <Text.Body color="muted">Loading payees...</Text.Body>}

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
                  Total payees: {payees.length}
                </Text.Body>
              </Stack>
            )}
          </CardContent>
        </Card>

        {orgInfo?.exists && (
          <Card style={{ width: "100%" }}>
            <CardContent>
              <PayeesTable
                payees={payees}
                searchEnabled={true}
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
                            <div
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={(e) => e.stopPropagation()}
                              style={{ minWidth: 220 }}
                            >
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
                      <div
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                      >
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
                      <div
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                      >
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
                renderExpandedRow={(payee) => {
                  const payeeId = payee.payeeId.toString();
                  const nameLabel = parseNameLabel(payee.role);

                  return (
                    <Card style={{ backgroundColor: "var(--colors-background)", border: "1px solid var(--colors-border)" }}>
                      <CardContent>
                        <Stack gap="sm">
                          <Text.Body size="sm" color="muted">
                            Name: {nameLabel}
                          </Text.Body>
                          <Text.Body size="sm" color="muted">
                            Payment Address: {payee.paymentAddress}
                          </Text.Body>
                          <Text.Body size="sm" color="muted">
                            Payee ID: {payeeId}
                          </Text.Body>
                        </Stack>
                      </CardContent>
                    </Card>
                  );
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
