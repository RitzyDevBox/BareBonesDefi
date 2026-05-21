import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import PayrollManagerABI from "../abis/paymentPipelines/PayrollManager.abi.json";
import { EntityFormation } from "../components/EntityFormation/EntityFormation";
import type { FormationDao } from "../components/EntityFormation/types";
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

  // Async-resolve the active org's Governor address via payrollManager.daoOf
  // (same source DAOsPage uses — write-once view set by the launcher). When
  // we don't have an org selected, governor stays null and the wizard falls
  // back to its stub defaults.
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

  const activeDao: FormationDao | undefined = useMemo(() => {
    if (!activeOrgSlug && !governorAddress) return undefined;
    return {
      name: activeOrgSlug ?? undefined,
      governor: governorAddress ? { address: governorAddress } : undefined,
    };
  }, [activeOrgSlug, governorAddress]);

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
