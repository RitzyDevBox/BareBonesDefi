import { useCallback, useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { Link } from "react-router-dom";
import { Card, CardContent, Input } from "../components/BasicComponents";
import { CopyButton } from "../components/Button/Actions/CopyButton";
import { ButtonPrimary, ButtonSecondary } from "../components/Button/ButtonPrimary";
import { FormField } from "../components/FormField/FormField";
import { AddressInput } from "../components/Inputs/AddressInput";
import { NumberInput } from "../components/Inputs/NumberInput";
import { OrganizationPicker } from "../components/Organizations/OrganizationPicker";
import { PageContainer } from "../components/PageWrapper/PageContainer";
import { Row, Stack } from "../components/Primitives";
import { Text } from "../components/Primitives/Text";
import DAOFactoryABI from "../abis/dao/DAOFactory.abi.json";
import PayrollManagerABI from "../abis/paymentPipelines/PayrollManager.abi.json";
import { CHAIN_INFO_MAP, getBareBonesConfiguration } from "../constants/misc";
import { useExecuteRawTx } from "../hooks/useExecuteRawTx";
import { ScreenSize, useMediaQuery } from "../hooks/useMediaQuery";
import { useWalletProvider } from "../hooks/useWalletProvider";
import { fetchOrganizationInfo, useOwnedOrganizations } from "../hooks/payroll/useOrganizationRegistry";
import { ROUTES } from "../routes";
import { shortAddress } from "../utils/formatUtils";

const DAO_FACTORY_INTERFACE = new ethers.utils.Interface(DAOFactoryABI as any);
const MOCK_GOVERNANCE_TOKEN = "0xe4368424E6728F8D53Ed524eE540FA8f0595dF43";

const HARDCODED_DAO_DEPLOYMENTS: Record<string, DaoDeploymentSummary> = {
  barebonesdemo: {
    name: "barebonesdemo",
    governor: "0xD4915581301bca0867833fa13B3432f10449C063",
    timelock: "0xc832160E42248D25570dB6a8F8DdD8C654042455",
    token: MOCK_GOVERNANCE_TOKEN,
    txHash: "0x3271c31bf9d967315a5b345ae7d6c9fce9acfb1cd3703f25452752ec6b2e8bc6",
  },
};
type DaoDeployFormState = {
  token: string;
  timelockDelay: string;
  votingDelay: string;
  votingPeriod: string;
  proposalThreshold: string;
  quorumNumerator: string;
  cancellersCsv: string;
};

type DaoDeploymentSummary = {
  name: string;
  governor: string;
  timelock: string;
  token: string;
  txHash: string;
};

const DEFAULT_FORM_STATE: DaoDeployFormState = {
  token: MOCK_GOVERNANCE_TOKEN,
  timelockDelay: "86400",
  votingDelay: "1",
  votingPeriod: "45818",
  proposalThreshold: "1000000000000000000",
  quorumNumerator: "4",
  cancellersCsv: "",
};

function isWholeNumber(value: string) {
  return /^\d+$/.test(value);
}

function parseCancellerAddresses(cancellersCsv: string) {
  const unique = new Set<string>();

  cancellersCsv
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .forEach((value) => {
      unique.add(ethers.utils.getAddress(value));
    });

  return Array.from(unique);
}

function validateDeployForm(form: DaoDeployFormState, selectedOrganization: string, ownedOrganizations: string[]) {
  if (!selectedOrganization.trim()) {
    return "Select an organization.";
  }

  if (!ownedOrganizations.includes(selectedOrganization.trim())) {
    return "You can only deploy a DAO for organizations you administer.";
  }

  if (!form.token.trim()) return "Governance token address is required.";

  try {
    ethers.utils.getAddress(form.token.trim());
  } catch {
    return "Governance token address is invalid.";
  }

  const integerFields: Array<[string, string]> = [
    ["Timelock Delay", form.timelockDelay],
    ["Voting Delay", form.votingDelay],
    ["Voting Period", form.votingPeriod],
    ["Proposal Threshold", form.proposalThreshold],
    ["Quorum Numerator", form.quorumNumerator],
  ];

  for (const [label, value] of integerFields) {
    if (!isWholeNumber(value)) {
      return `${label} must be a whole number.`;
    }
  }

  const quorumNumerator = Number(form.quorumNumerator);
  if (quorumNumerator < 0 || quorumNumerator > 100) {
    return "Quorum Numerator must be between 0 and 100.";
  }

  try {
    parseCancellerAddresses(form.cancellersCsv);
  } catch {
    return "One or more canceller addresses are invalid.";
  }

  return null;
}

function parseDeploymentSummaryFromReceipt(receipt: ethers.providers.TransactionReceipt, fallbackName: string): DaoDeploymentSummary | null {
  for (const log of receipt.logs) {
    try {
      const parsed = DAO_FACTORY_INTERFACE.parseLog(log);
      if (parsed.name !== "DAODeployed") continue;

      const governor = parsed.args.governor ?? parsed.args[0];
      const timelock = parsed.args.timelock ?? parsed.args[1];
      const token = parsed.args.token ?? parsed.args[2];
      const name = parsed.args.name ?? parsed.args[3] ?? fallbackName;

      return {
        name,
        governor,
        timelock,
        token,
        txHash: receipt.transactionHash,
      };
    } catch {
      continue;
    }
  }

  return null;
}

function addressLink(address: string, blockExplorerBase?: string) {
  if (!blockExplorerBase) return null;
  return `${blockExplorerBase.replace(/\/$/, "")}/address/${address}`;
}

function txLink(hash: string, blockExplorerBase?: string) {
  if (!blockExplorerBase) return null;
  return `${blockExplorerBase.replace(/\/$/, "")}/tx/${hash}`;
}

function InfoChip({
  label,
  displayValue,
  copyValue,
}: {
  label: string;
  displayValue: string;
  copyValue?: string | null;
}) {
  return (
    <Row gap="xs" style={{ width: "auto", alignItems: "center" }}>
      <Text.Body size="sm" color="muted">
        {label}: {displayValue}
      </Text.Body>
      <CopyButton value={copyValue ?? displayValue} ariaLabel={`Copy ${label.toLowerCase()}`} />
    </Row>
  );
}

export function DAOsPage() {
  const { provider, account, chainId } = useWalletProvider();
  const screen = useMediaQuery();
  const [form, setForm] = useState<DaoDeployFormState>(DEFAULT_FORM_STATE);
  const [selectedOrganization, setSelectedOrganization] = useState("");
  const [organizationExists, setOrganizationExists] = useState<boolean | null>(null);
  const [orgInfoLoading, setOrgInfoLoading] = useState(false);
  const [organizationFetchError, setOrganizationFetchError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isRegisteringOrg, setIsRegisteringOrg] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [templateProvider, setTemplateProvider] = useState<string | null>(null);
  const [lastDeployment, setLastDeployment] = useState<DaoDeploymentSummary | null>(null);

  const existingDeployment = useMemo(() => {
    const slug = selectedOrganization.trim().toLowerCase();
    return slug ? HARDCODED_DAO_DEPLOYMENTS[slug] ?? null : null;
  }, [selectedOrganization]);

  const config = useMemo(() => {
    if (chainId == null) return null;
    return getBareBonesConfiguration(chainId);
  }, [chainId]);

  const payrollManagerAddress = config?.payrollManagerAddress;
  const daoFactoryAddress = config?.daoFactoryAddress ?? "";
  const chainInfo = chainId != null ? CHAIN_INFO_MAP[chainId] : undefined;
  const blockExplorerBase = chainInfo?.blockExplorerUrls?.[0];
  const formColumns = screen === ScreenSize.Desktop ? 2 : 1;

  const {
    organizations: ownedOrganizations,
    loading: loadingOwnedOrganizations,
    reload: reloadOwnedOrganizations,
  } = useOwnedOrganizations({
    provider: provider ?? undefined,
    payrollManagerAddress,
    owner: account,
  });

  const payrollInterface = useMemo(() => new ethers.utils.Interface(PayrollManagerABI as any), []);

  useEffect(() => {
    if (!account) return;
    setForm((current) => {
      if (current.cancellersCsv.trim()) return current;
      return { ...current, cancellersCsv: account };
    });
  }, [account]);

  useEffect(() => {
    if (!selectedOrganization.trim() && ownedOrganizations.length > 0) {
      setSelectedOrganization(ownedOrganizations[0]);
      setOrganizationFetchError(null);
    }
  }, [ownedOrganizations, selectedOrganization]);

  useEffect(() => {
    let isActive = true;

    async function loadTemplateProvider() {
      if (!provider || !daoFactoryAddress) {
        if (isActive) setTemplateProvider(null);
        return;
      }

      try {
        const factory = new ethers.Contract(daoFactoryAddress, DAOFactoryABI as any, provider);
        const nextTemplateProvider = await factory.templateProvider();
        if (isActive) setTemplateProvider(nextTemplateProvider);
      } catch {
        if (isActive) setTemplateProvider(null);
      }
    }

    void loadTemplateProvider();

    return () => {
      isActive = false;
    };
  }, [provider, daoFactoryAddress]);

  useEffect(() => {
    let isActive = true;

    async function loadOrganizationInfo() {
      const slug = selectedOrganization.trim();
      if (!slug || !provider || !payrollManagerAddress) {
        if (isActive) setOrganizationExists(null);
        return;
      }

      setOrgInfoLoading(true);
      try {
        const info = await fetchOrganizationInfo(provider, payrollManagerAddress, slug);
        if (!isActive) return;
        setOrganizationExists(Boolean(info?.exists));
      } finally {
        if (isActive) setOrgInfoLoading(false);
      }
    }

    void loadOrganizationInfo();

    return () => {
      isActive = false;
    };
  }, [selectedOrganization, provider, payrollManagerAddress]);

  const registerOrganization = useExecuteRawTx(
    (_: number, orgSlug: string) => {
      if (!payrollManagerAddress) {
        throw new Error("Payroll manager address missing");
      }

      const slugBytes = ethers.utils.formatBytes32String(orgSlug);
      return {
        to: payrollManagerAddress,
        data: payrollInterface.encodeFunctionData("registerOrganization", [slugBytes]),
      } as any;
    },
    (_: number, orgSlug: string) => `Organization "${orgSlug}" registered`
  );

  const deployDao = useExecuteRawTx(
    async (_: number, orgSlug: string, nextForm: DaoDeployFormState) => {
      if (!provider || !daoFactoryAddress) {
        throw new Error("DAO factory address is not configured for this chain.");
      }

      const signer = provider.getSigner();
      const factory = new ethers.Contract(daoFactoryAddress, DAOFactoryABI as any, signer);
      const populated = await factory.populateTransaction.deploy({
        name: orgSlug.trim(),
        token: ethers.utils.getAddress(nextForm.token.trim()),
        timelockDelay: nextForm.timelockDelay,
        votingDelay: nextForm.votingDelay,
        votingPeriod: nextForm.votingPeriod,
        proposalThreshold: nextForm.proposalThreshold,
        quorumNumerator: nextForm.quorumNumerator,
        cancellers: parseCancellerAddresses(nextForm.cancellersCsv),
      });

      return {
        to: daoFactoryAddress,
        data: populated.data ?? "0x",
        value: populated.value ?? 0,
      };
    },
    (_: number, orgSlug: string) => `Deployed DAO for organization "${orgSlug}"`
  );

  const handleFetchOrganization = useCallback(
    (nextSlug: string) => {
      const target = nextSlug.trim();
      if (!target) return;

      if (!ownedOrganizations.includes(target)) {
        setOrganizationFetchError("Only organizations you administer can be used for DAO deployment.");
        return;
      }

      setOrganizationFetchError(null);
      setSelectedOrganization(target);
    },
    [ownedOrganizations]
  );

  async function handleCreateOrganization(nextSlug?: string) {
    const targetSlug = (nextSlug ?? selectedOrganization).trim();
    if (!targetSlug || !chainId || isRegisteringOrg) return;

    setIsRegisteringOrg(true);
    try {
      await Promise.resolve(registerOrganization(chainId, targetSlug));
      await reloadOwnedOrganizations();
      setSelectedOrganization(targetSlug);
      setOrganizationFetchError(null);
    } finally {
      setIsRegisteringOrg(false);
    }
  }

  async function handleDeployDao() {
    if (!chainId) return;

    const validationError = validateDeployForm(form, selectedOrganization, ownedOrganizations);
    setFormError(validationError);

    if (validationError) return;
    if (organizationExists === false) {
      setFormError(`Organization "${selectedOrganization}" does not exist.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const tx = await deployDao(chainId, selectedOrganization.trim(), form);
      if (!tx) return;

      const receipt = await tx.wait(1);
      const summary = parseDeploymentSummaryFromReceipt(receipt, selectedOrganization.trim());
      setLastDeployment(summary);

      setForm((current) => ({
        ...DEFAULT_FORM_STATE,
        token: current.token,
        cancellersCsv: current.cancellersCsv,
      }));
      setFormError(null);
    } finally {
      setIsSubmitting(false);
    }
  }

  function updateField<K extends keyof DaoDeployFormState>(key: K, value: DaoDeployFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  const deployDisabled =
    !account ||
    !daoFactoryAddress ||
    !selectedOrganization.trim() ||
    !ownedOrganizations.includes(selectedOrganization.trim()) ||
    organizationExists === false ||
    isSubmitting ||
    Boolean(existingDeployment);

  const deploymentToShow = existingDeployment ?? lastDeployment;

  return (
    <PageContainer center maxWidth={1320}>
      <div style={{ width: "100%" }}>
        <Stack gap="lg">
          <Card>
            <CardContent>
              <Stack gap="sm">
                <Text.Title align="left">DAOs</Text.Title>
                <Text.Body color="muted">
                  Organization name is the DAO source of truth. Select or create an organization, then deploy a DAO for it.
                </Text.Body>
                <Row gap="md" wrap>
                  <InfoChip
                    label="Factory"
                    displayValue={daoFactoryAddress ? shortAddress(daoFactoryAddress) : "Not configured"}
                    copyValue={daoFactoryAddress || undefined}
                  />
                  {templateProvider ? (
                    <InfoChip
                      label="Template provider"
                      displayValue={shortAddress(templateProvider)}
                      copyValue={templateProvider}
                    />
                  ) : null}
                  <InfoChip
                    label="Network"
                    displayValue={chainInfo?.chainName ?? `Chain ${chainId ?? "?"}`}
                    copyValue={chainInfo?.chainName ?? `Chain ${chainId ?? "?"}`}
                  />
                </Row>
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Stack gap="md">
                <Text.Title align="left" size="sm">Organization</Text.Title>
                <OrganizationPicker
                  value={selectedOrganization}
                  onChange={(next) => {
                    setSelectedOrganization(next);
                    setOrganizationFetchError(null);
                  }}
                  organizations={ownedOrganizations}
                  loadingOrganizations={loadingOwnedOrganizations}
                  loadingFetch={orgInfoLoading}
                  onFetch={handleFetchOrganization}
                  onCreateOrganization={handleCreateOrganization}
                  isCreating={isRegisteringOrg}
                />

                {organizationFetchError ? (
                  <Text.Body color="warn">{organizationFetchError}</Text.Body>
                ) : null}

                {!!selectedOrganization.trim() && organizationExists === false ? (
                  <Text.Body color="warn">
                    Organization "{selectedOrganization.trim()}" does not exist.
                  </Text.Body>
                ) : null}
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Stack gap="md">
                <Text.Title align="left" size="sm">Deploy DAO</Text.Title>

                {!account ? (
                  <Text.Body color="warn">Connect your wallet to deploy a DAO.</Text.Body>
                ) : null}

                {!daoFactoryAddress ? (
                  <Text.Body color="warn">DAO factory is not configured for the current chain.</Text.Body>
                ) : null}

                {existingDeployment ? (
                  <Text.Body color="success">
                    A DAO is already deployed for this organization.
                  </Text.Body>
                ) : null}

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${formColumns}, minmax(0, 1fr))`,
                    gap: "var(--spacing-md)",
                  }}
                >
                  <FormField label="DAO Name" style={{ marginBottom: 0 }}>
                    <Input value={selectedOrganization} disabled placeholder="Organization slug" />
                  </FormField>

                  <FormField label="Governance Token" style={{ marginBottom: 0 }}>
                    <AddressInput
                      value={form.token}
                      onChange={(event) => updateField("token", (event.target as HTMLInputElement).value)}
                    />
                  </FormField>

                  <FormField label="Timelock Delay (seconds)" style={{ marginBottom: 0 }}>
                    <NumberInput
                      value={form.timelockDelay}
                      allowDecimal={false}
                      min={0}
                      onChange={(event) => updateField("timelockDelay", event.target.value)}
                    />
                  </FormField>

                  <FormField label="Voting Delay (blocks)" style={{ marginBottom: 0 }}>
                    <NumberInput
                      value={form.votingDelay}
                      allowDecimal={false}
                      min={0}
                      onChange={(event) => updateField("votingDelay", event.target.value)}
                    />
                  </FormField>

                  <FormField label="Voting Period (blocks)" style={{ marginBottom: 0 }}>
                    <NumberInput
                      value={form.votingPeriod}
                      allowDecimal={false}
                      min={0}
                      onChange={(event) => updateField("votingPeriod", event.target.value)}
                    />
                  </FormField>

                  <FormField label="Quorum Numerator" style={{ marginBottom: 0 }}>
                    <NumberInput
                      value={form.quorumNumerator}
                      allowDecimal={false}
                      min={0}
                      max={100}
                      onChange={(event) => updateField("quorumNumerator", event.target.value)}
                    />
                  </FormField>
                </div>

                <FormField label="Proposal Threshold (raw token units)" style={{ marginBottom: 0 }}>
                  <NumberInput
                    value={form.proposalThreshold}
                    allowDecimal={false}
                    min={0}
                    onChange={(event) => updateField("proposalThreshold", event.target.value)}
                  />
                </FormField>

                <FormField label="Canceller Addresses (comma-separated)" style={{ marginBottom: 0 }}>
                  <Input
                    value={form.cancellersCsv}
                    onChange={(event) => updateField("cancellersCsv", event.target.value)}
                    placeholder="0x123..., 0x456..."
                  />
                </FormField>

                {formError ? <Text.Body color="warn">{formError}</Text.Body> : null}

                <Row gap="sm" wrap>
                  <ButtonPrimary fullWidth={false} disabled={deployDisabled} onClick={() => void handleDeployDao()}>
                    {existingDeployment
                      ? "DAO Already Deployed"
                      : isSubmitting
                      ? "Deploying..."
                      : "Deploy DAO"}
                  </ButtonPrimary>
                  <ButtonSecondary
                    fullWidth={false}
                    disabled={isSubmitting}
                    onClick={() => {
                      setForm((current) => ({
                        ...DEFAULT_FORM_STATE,
                        token: current.token,
                        cancellersCsv: current.cancellersCsv,
                      }));
                      setFormError(null);
                    }}
                  >
                    Reset
                  </ButtonSecondary>
                </Row>
              </Stack>
            </CardContent>
          </Card>

          {deploymentToShow ? (
            <Card>
              <CardContent>
                <Stack gap="sm">
                  <Text.Title align="left" size="sm">
                    {existingDeployment ? "Deployed DAO" : "Latest Deployment"}
                  </Text.Title>
                  <Text.Body size="sm">DAO: {deploymentToShow.name}</Text.Body>
                  <Text.Body size="sm">Governor: {shortAddress(deploymentToShow.governor)}</Text.Body>
                  <Text.Body size="sm">Timelock: {shortAddress(deploymentToShow.timelock)}</Text.Body>
                  <Text.Body size="sm">Token: {shortAddress(deploymentToShow.token)}</Text.Body>
                  <Text.Body size="sm">Tx: {shortAddress(deploymentToShow.txHash, 6)}</Text.Body>

                  <Row gap="sm" wrap>
                    <Link to={ROUTES.DAO_DETAIL(deploymentToShow.governor)} style={{ color: "var(--colors-primary)" }}>
                      View DAO
                    </Link>
                    {txLink(deploymentToShow.txHash, blockExplorerBase) ? (
                      <a href={txLink(deploymentToShow.txHash, blockExplorerBase)!} target="_blank" rel="noreferrer" style={{ color: "var(--colors-primary)" }}>
                        Transaction
                      </a>
                    ) : null}
                    {addressLink(deploymentToShow.governor, blockExplorerBase) ? (
                      <a href={addressLink(deploymentToShow.governor, blockExplorerBase)!} target="_blank" rel="noreferrer" style={{ color: "var(--colors-primary)" }}>
                        Governor
                      </a>
                    ) : null}
                    {addressLink(deploymentToShow.timelock, blockExplorerBase) ? (
                      <a href={addressLink(deploymentToShow.timelock, blockExplorerBase)!} target="_blank" rel="noreferrer" style={{ color: "var(--colors-primary)" }}>
                        Timelock
                      </a>
                    ) : null}
                    {addressLink(deploymentToShow.token, blockExplorerBase) ? (
                      <a href={addressLink(deploymentToShow.token, blockExplorerBase)!} target="_blank" rel="noreferrer" style={{ color: "var(--colors-primary)" }}>
                        Token
                      </a>
                    ) : null}
                  </Row>
                </Stack>
              </CardContent>
            </Card>
          ) : null}
        </Stack>
      </div>
    </PageContainer>
  )
}