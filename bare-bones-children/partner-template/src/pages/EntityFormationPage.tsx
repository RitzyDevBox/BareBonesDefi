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
  const [governorAddress, setGovernorAddress] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!provider || !payrollManagerAddress || !activeOrgSlug) {
      setGovernorAddress(null);
      return;
    }
    const contract = new ethers.Contract(
      payrollManagerAddress,
      PayrollManagerABI as ethers.ContractInterface,
      provider,
    );
    (async () => {
      try {
        const [governor]: [string, string] = await contract.daoOf(activeOrgSlug);
        if (cancelled) return;
        if (!governor || governor === ethers.constants.AddressZero) {
          setGovernorAddress(null);
          return;
        }
        setGovernorAddress(ethers.utils.getAddress(governor));
      } catch {
        if (!cancelled) setGovernorAddress(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [provider, payrollManagerAddress, activeOrgSlug, txVersion]);

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
    };
  }, [activeOrgSlug, governorAddress, governanceOverview, tokenAddress, tokenInfo]);

  return (
    <EntityFormation
      activeDao={activeDao}
      chain={chain}
      wallet={account ? { address: account } : undefined}
      onConnectWallet={() => {
        void connect();
      }}
    />
  );
}
