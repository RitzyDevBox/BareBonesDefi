import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { PageContainer } from "../components/PageWrapper/PageContainer";
import { Card, CardContent } from "../components/BasicComponents";
import { Stack } from "../components/Primitives";
import { Text } from "../components/Primitives/Text";
import { useWalletProvider } from "../hooks/useWalletProvider";
import { useReadProvider } from "../hooks/useReadProvider";
import { useMtaState } from "../hooks/auth/useMtaState";
import { useTxRefresh } from "../providers/TxRefreshProvider";
import { useActiveOrganization } from "../providers/ActiveOrganizationProvider";
import { PAYROLL_ADMIN_ROLE_SLUGS } from "../constants/mtaRoles";
import { DEFAULT_CHAIN_ID, getBareBonesConfiguration } from "../constants/misc";
import { fetchOrganizationInfo } from "../hooks/payroll/useOrganizationRegistry";
import { fetchPayeesByOrganization } from "../utils/payroll/fetchPayeesByOrganization";
import type { OrganizationModel, PayeeModel } from "../models/payments";
import { orgSlugFor } from "../utils/payroll/orgSlug";
import {
  PaymentsHero,
  PayrollNavigation,
  PAYROLL_TABS,
  type PayrollNavTab,
  PayeesView,
  PayBatchesView,
  EarningsView,
  PayrollsView,
} from "../components/Payments";

function readTab(value: string | null): PayrollNavTab {
  if (value && PAYROLL_TABS.some((t) => t.id === value)) return value as PayrollNavTab;
  return "overview";
}

export function PaymentPage() {
  const { organizationId } = useParams<{ organizationId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = readTab(searchParams.get("tab"));

  const { account, chainId } = useWalletProvider();
  const readProvider = useReadProvider();
  const { version } = useTxRefresh();
  const { activeOrgSlug } = useActiveOrganization();

  const slug = (organizationId ?? activeOrgSlug ?? "").trim();

  const chainIdOrDefault = chainId ?? DEFAULT_CHAIN_ID;
  const config = useMemo(() => getBareBonesConfiguration(chainIdOrDefault), [chainIdOrDefault]);
  const payrollManagerAddress = config?.payrollManagerAddress;

  const [orgInfo, setOrgInfo] = useState<OrganizationModel | null>(null);
  const [payees, setPayees] = useState<PayeeModel[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!slug || !readProvider || !payrollManagerAddress) {
      setOrgInfo(null);
      setPayees([]);
      return;
    }
    setLoading(true);
    try {
      const info = await fetchOrganizationInfo(readProvider, payrollManagerAddress, slug);
      setOrgInfo(info);
      if (info?.exists) {
        // chainId is the new source-of-truth arg — payees now come from MTA's
        // unified member roster (admins, super admins, contractors, all).
        // The provider + payrollManagerAddress args remain for signature
        // back-compat but the function ignores them.
        const list = await fetchPayeesByOrganization(
          readProvider,
          payrollManagerAddress,
          info.slug ?? orgSlugFor(slug),
          chainIdOrDefault,
        );
        setPayees(list);
      } else {
        setPayees([]);
      }
    } catch (err) {
      console.error("Error fetching org info:", err);
      setOrgInfo(null);
      setPayees([]);
    } finally {
      setLoading(false);
    }
  }, [slug, readProvider, payrollManagerAddress, chainIdOrDefault]);

  useEffect(() => {
    void refresh();
  }, [refresh, version]);

  // Pull the MTA state for this org so we can authorize the connected wallet
  // by its actual role assignments, not just by org ownership. The hook
  // returns empty defaults when the slug isn't bootstrapped, so it's safe to
  // call unconditionally — though it short-circuits when slug is "".
  //
  // IMPORTANT: useMtaState's `slug` parameter is the on-chain bytes32 hex,
  // not the human-readable name. The subgraph filters Member/Role/etc by
  // `slug: Bytes!`. Passing the name "Tempo" silently matches nothing —
  // mtaState.members comes back empty, the connected wallet's role check
  // misses, and the user looks "roleless" to the UI even when on-chain they
  // have PayrollOperator/etc. Encode here using the same helper the rest of
  // the codebase uses for the (orgSlug, chainId) lookup.
  const slugBytes = useMemo(() => (slug ? orgSlugFor(slug) : ""), [slug]);
  const mtaState = useMtaState(slugBytes);

  // Admin scope here = anyone the on-chain authorizer will let pass for
  // PayrollManager's operator surface:
  //   - PayrollManager-registered owner (legacy fast path; the deployer is
  //     normally also bootstrapped as SuperAdmin so this is usually a
  //     subset of the MTA check, but kept to avoid relying on the subgraph
  //     for the most common case).
  //   - SuperAdmin → bypasses every check (also covers pause/lock state).
  //   - Admin → bypasses per-selector checks while the slug is Normal.
  //   - PayrollOperator → has implicit grants on PayrollManager's operator
  //     surface (createPayroll, configurePayroll, payee management, etc.)
  //     via MTA's `_isFoundationDefaultGrant`.
  // Custom roles with explicit target grants to PayrollManager are not
  // covered here — they get the per-action checks the contract enforces
  // anyway, and the UI doesn't show them as "admin".
  // `member.roles` from useMtaState is the on-chain bytes32 role slug, not
  // the decoded name. PAYROLL_ADMIN_ROLE_SLUGS is the pre-encoded set from
  // [constants/mtaRoles.ts](../constants/mtaRoles.ts).
  const isAdmin = useMemo(() => {
    if (!account) return false;
    if (orgInfo?.exists && orgInfo.owner.toLowerCase() === account.toLowerCase()) {
      return true;
    }
    const me = mtaState.members.find(
      (m) => m.wallet.address.toLowerCase() === account.toLowerCase(),
    );
    if (!me) return false;
    return me.roles.some((slug) => PAYROLL_ADMIN_ROLE_SLUGS.has(slug));
  }, [orgInfo, account, mtaState.members]);

  function setTab(next: PayrollNavTab) {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", next);
    setSearchParams(nextParams, { replace: true });
  }

  const chainName = chainId != null ? `Chain ${chainId}` : undefined;

  if (!slug) {
    return (
      <PageContainer center maxWidth={1320}>
        <Stack gap="lg" style={{ width: "100%" }}>
          <PaymentsHero orgSlug={null} chainName={chainName} />
          <div className="bb-empty">
            <h4>No organization selected</h4>
            <div className="bb-muted bb-small">
              Use the organization switcher in the header to pick or create one.
            </div>
          </div>
        </Stack>
      </PageContainer>
    );
  }

  if (loading && !orgInfo) {
    return (
      <PageContainer center maxWidth={1320}>
        <Stack gap="lg" style={{ width: "100%" }}>
          <PaymentsHero orgSlug={slug} chainName={chainName} />
          <div className="bb-empty">
            <span className="bb-spinner" /> Loading {slug}…
          </div>
        </Stack>
      </PageContainer>
    );
  }

  if (orgInfo && !orgInfo.exists) {
    return (
      <PageContainer center maxWidth={1320}>
        <Stack gap="lg" style={{ width: "100%" }}>
          <PaymentsHero orgSlug={slug} chainName={chainName} />
          <Card>
            <CardContent>
              <Stack gap="md" style={{ padding: "var(--spacing-md)" }}>
                <Text.Body color="warn">
                  Organization "{slug}" does not exist on this chain.
                </Text.Body>
                <Text.Body color="muted" size="sm">
                  Use the organization switcher in the header to register it (Create new DAO → Register organization only).
                </Text.Body>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </PageContainer>
    );
  }

  return (
    <PageContainer center maxWidth={1320}>
      <Stack gap="lg" style={{ width: "100%" }}>
        <PaymentsHero orgSlug={slug} chainName={chainName} />

        <PayrollNavigation tab={tab} onChange={setTab} isAdmin={isAdmin} />

        {tab === "overview" && (
          <PayeesView
            slug={slug}
            orgInfo={orgInfo}
            payees={payees}
            loading={loading}
            isAdmin={isAdmin}
            onPayeesChanged={refresh}
          />
        )}
        {tab === "batches" && <PayBatchesView slug={slug} isAdmin={isAdmin} />}
        {tab === "earnings" && <EarningsView slug={slug} isAdmin={isAdmin} />}
        {tab === "payrolls" && <PayrollsView slug={slug} isAdmin={isAdmin} />}
      </Stack>
    </PageContainer>
  );
}
