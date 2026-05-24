import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import PayrollManagerABI from "../abis/paymentPipelines/PayrollManager.abi.json";
import ERC20VotesABI from "../abis/diamond/ERC20Votes.abi.json";
import { EntityFormation } from "../components/EntityFormation/EntityFormation";
import type { FormationDao } from "../components/EntityFormation/types";
import { useDaoGovernanceOverview } from "../hooks/dao/useDaoGovernanceOverview";
import { useWalletProvider } from "../hooks/useWalletProvider";
import { useActiveOrganization } from "../providers/ActiveOrganizationProvider";
import { CHAIN_INFO_MAP, getBareBonesConfiguration } from "../constants/misc";
import { useTxRefresh } from "../providers/TxRefreshProvider";
import { orgSlugFor } from "../utils/payroll/orgSlug";
import { useMtaState } from "../hooks/auth/useMtaState";
import { FILING_ADMIN_ROLE_SLUGS } from "../constants/mtaRoles";

export function EntityFormationPage() {
  const { provider, account, chainId, connect } = useWalletProvider();
  const { activeOrgSlug } = useActiveOrganization();
  const { version: txVersion } = useTxRefresh();

  const chain = useMemo(() => {
    if (chainId == null) return undefined;
    const info = CHAIN_INFO_MAP[chainId];
    return { name: info?.chainName, chainId };
  }, [chainId]);

  const payrollManagerAddress = useMemo(() => {
    if (chainId == null) return null;
    return getBareBonesConfiguration(chainId)?.payrollManagerAddress ?? null;
  }, [chainId]);

  // Step 1: resolve the active org's Governor address via payrollManager.daoOf.
  // Tracks four states so the wizard can distinguish "no org" / "still
  // resolving" / "org has no DAO" / "resolved" instead of all collapsing to
  // governorAddress=null (which previously stuck the loader forever).
  type GovernorResolution =
    | { status: "idle" }
    | { status: "resolving" }
    | { status: "missing" }
    | { status: "resolved"; address: string };
  const [governor, setGovernor] = useState<GovernorResolution>({ status: "idle" });
  useEffect(() => {
    let cancelled = false;
    if (!provider || !payrollManagerAddress || !activeOrgSlug) {
      setGovernor({ status: "idle" });
      return;
    }
    setGovernor({ status: "resolving" });
    const contract = new ethers.Contract(
      payrollManagerAddress,
      PayrollManagerABI as ethers.ContractInterface,
      provider,
    );
    (async () => {
      try {
        // daoOf takes the bytes32-packed slug, not the raw string. Passing
        // the raw string makes ethers right-pad/coerce to a bytes32 that
        // doesn't match what the launcher wrote, so the lookup returns 0x0
        // for every org and the wizard's "no Governor" state is bogus.
        const slugBytes32 = orgSlugFor(activeOrgSlug);
        const [address]: [string, string] = await contract.daoOf(slugBytes32);
        if (cancelled) return;
        if (!address || address === ethers.constants.AddressZero) {
          setGovernor({ status: "missing" });
          return;
        }
        setGovernor({ status: "resolved", address: ethers.utils.getAddress(address) });
      } catch {
        if (!cancelled) setGovernor({ status: "missing" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [provider, payrollManagerAddress, activeOrgSlug, txVersion]);
  const governorAddress = governor.status === "resolved" ? governor.address : null;

  // Step 2: governance overview gives token + timelock addresses + voting params.
  const { governanceOverview } = useDaoGovernanceOverview({
    governorAddress: governorAddress ?? "",
    account,
    provider,
    chainId,
    version: txVersion,
  });

  // Step 3: token contract for symbol + totalSupply. Two cheap ERC20 calls
  // — only fires once a token address is known.
  const tokenAddress = governanceOverview?.tokenAddress ?? null;
  const [tokenInfo, setTokenInfo] = useState<{ symbol: string; totalSupply: string } | null>(
    null,
  );
  useEffect(() => {
    let cancelled = false;
    if (!provider || !tokenAddress || tokenAddress === ethers.constants.AddressZero) {
      setTokenInfo(null);
      return;
    }
    const token = new ethers.Contract(tokenAddress, ERC20VotesABI as ethers.ContractInterface, provider);
    (async () => {
      try {
        const [symbol, totalSupplyWei, decimalsRaw] = await Promise.all([
          token.symbol() as Promise<string>,
          token.totalSupply() as Promise<ethers.BigNumber>,
          (token.decimals().catch(() => 18)) as Promise<number>,
        ]);
        if (cancelled) return;
        const decimals = Number(decimalsRaw ?? 18);
        // Coarse "12.4M supply"-style display — fine for the eligibility
        // glance. Avoids pulling in a number-formatting dep.
        const supplyTokens = Number(ethers.utils.formatUnits(totalSupplyWei, decimals));
        const compact = new Intl.NumberFormat("en-US", {
          notation: "compact",
          maximumFractionDigits: 1,
        }).format(supplyTokens);
        setTokenInfo({ symbol, totalSupply: `${compact} supply` });
      } catch {
        if (!cancelled) setTokenInfo(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [provider, tokenAddress, txVersion]);

  // Filing collects PII (filer name + address + phone, business email, mailing
  // address). Gate visibility on operational-owner roles: SuperAdmin / Admin
  // via MTA membership, or the slug's super-admin (the slug owner). Roleless
  // members and non-filing operators (PayrollOperator, MemberManager, etc.)
  // see a "permission required" notice instead of the wizard.
  const slugBytes = useMemo(
    () => (activeOrgSlug ? orgSlugFor(activeOrgSlug) : ""),
    [activeOrgSlug],
  );
  const mtaState = useMtaState(slugBytes);
  type ViewStatus = "idle" | "checking" | "allowed" | "denied";
  const viewStatus: ViewStatus = useMemo(() => {
    if (!account || !activeOrgSlug) return "idle";
    if (mtaState.loading) return "checking";
    if (
      mtaState.superAdmin &&
      mtaState.superAdmin.toLowerCase() === account.toLowerCase()
    ) {
      return "allowed";
    }
    const me = mtaState.members.find(
      (m) => m.wallet.address.toLowerCase() === account.toLowerCase(),
    );
    if (me && me.roles.some((r) => FILING_ADMIN_ROLE_SLUGS.has(r))) return "allowed";
    return "denied";
  }, [account, activeOrgSlug, mtaState.loading, mtaState.superAdmin, mtaState.members]);

  const activeDao: FormationDao | undefined = useMemo(() => {
    if (!activeOrgSlug && !governorAddress) return undefined;
    return {
      name: activeOrgSlug ?? undefined,
      symbol: tokenInfo?.symbol,
      totalSupply: tokenInfo?.totalSupply,
      governor: governorAddress
        ? { name: governanceOverview?.onchainName || "DAOGovernor", address: governorAddress }
        : undefined,
      timelock: governanceOverview?.timelockAddress
        ? { address: governanceOverview.timelockAddress }
        : undefined,
      token: tokenAddress ? { address: tokenAddress } : undefined,
      governance: governanceOverview
        ? {
            votingDelay: governanceOverview.votingDelay,
            votingPeriod: governanceOverview.votingPeriod,
            quorumRatio: governanceOverview.quorumRatio,
            timelockMinDelay: governanceOverview.minDelay,
          }
        : undefined,
    };
  }, [activeOrgSlug, governorAddress, governanceOverview, tokenAddress, tokenInfo]);

  return (
    <EntityFormation
      activeDao={activeDao}
      chain={chain}
      wallet={account ? { address: account } : undefined}
      orgSlug={activeOrgSlug}
      governorStatus={governor.status}
      viewStatus={viewStatus}
      onConnectWallet={() => {
        void connect();
      }}
    />
  );
}
