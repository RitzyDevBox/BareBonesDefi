import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { useWalletProvider } from "../../../hooks/useWalletProvider";
import { useExecuteRawTx } from "../../../hooks/useExecuteRawTx";
import { useTxRefresh } from "../../../providers/TxRefreshProvider";
import { getBareBonesConfiguration } from "../../../constants/misc";
import NamespacedCreate3FactoryABI from "../../../abis/diamond/NamespacedCreate3Factory.abi.json";
import DAOFactoryABI from "../../../abis/dao/DAOFactory.abi.json";
import PayrollManagerABI from "../../../abis/paymentPipelines/PayrollManager.abi.json";

export interface DaoDeployParams {
  orgSlug: string;
  token: string;
  timelockDelay: string;
  votingDelay: string;
  votingPeriod: string;
  proposalThreshold: string;
  quorumNumerator: string;
  cancellers: string[];
}

export function useDeployDao() {
  const { provider, account, chainId } = useWalletProvider();
  const { version: txVersion } = useTxRefresh();
  const config = useMemo(() => (chainId ? getBareBonesConfiguration(chainId) : null), [chainId]);
  const payrollInterface = useMemo(() => new ethers.utils.Interface(PayrollManagerABI as any), []);
  const nsFactoryInterface = useMemo(() => new ethers.utils.Interface(NamespacedCreate3FactoryABI as any), []);

  const [isWorking, setIsWorking] = useState(false);
  const [operatorApproved, setOperatorApproved] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!provider || !account || !config?.daoFactoryAddress || !config?.namespacedCreate3Factory) {
      setOperatorApproved(null);
      return;
    }
    const ns = new ethers.Contract(
      config.namespacedCreate3Factory,
      NamespacedCreate3FactoryABI as any,
      provider,
    );
    ns.isOperatorFor(account, config.daoFactoryAddress)
      .then((approved: boolean) => {
        if (!cancelled) setOperatorApproved(Boolean(approved));
      })
      .catch(() => {
        if (!cancelled) setOperatorApproved(null);
      });
    return () => {
      cancelled = true;
    };
  }, [provider, account, config?.daoFactoryAddress, config?.namespacedCreate3Factory, txVersion]);

  const registerOrganizationTx = useExecuteRawTx(
    (_chain: number, orgSlug: string) => {
      if (!config?.payrollManagerAddress) throw new Error("Payroll manager not configured for this chain.");
      return {
        to: config.payrollManagerAddress,
        data: payrollInterface.encodeFunctionData("registerOrganization", [
          ethers.utils.formatBytes32String(orgSlug),
        ]),
      } as any;
    },
    (_chain: number, orgSlug: string) => `Organization "${orgSlug}" registered`,
  );

  const authorizeOperatorTx = useExecuteRawTx(
    (_chain: number) => {
      if (!config?.daoFactoryAddress || !config?.namespacedCreate3Factory) {
        throw new Error("DAO factory or namespaced factory not configured for this chain.");
      }
      return {
        to: config.namespacedCreate3Factory,
        data: nsFactoryInterface.encodeFunctionData("setOperator", [config.daoFactoryAddress, true]),
      } as any;
    },
    () => "Authorized DAOFactory operator",
  );

  const deployDaoTx = useExecuteRawTx(
    async (_chain: number, params: DaoDeployParams) => {
      if (!provider || !config?.daoFactoryAddress) {
        throw new Error("DAO factory address not configured for this chain.");
      }
      const signer = provider.getSigner();
      const factory = new ethers.Contract(config.daoFactoryAddress, DAOFactoryABI as any, signer);
      const populated = await factory.populateTransaction.deploy({
        name: params.orgSlug.trim(),
        token: ethers.utils.getAddress(params.token.trim()),
        timelockDelay: params.timelockDelay,
        votingDelay: params.votingDelay,
        votingPeriod: params.votingPeriod,
        proposalThreshold: params.proposalThreshold,
        quorumNumerator: params.quorumNumerator,
        cancellers: params.cancellers,
      });
      return {
        to: config.daoFactoryAddress,
        data: populated.data ?? "0x",
        value: populated.value ?? 0,
      };
    },
    (_chain: number, params: DaoDeployParams) => `Deployed DAO for "${params.orgSlug}"`,
  );

  async function registerOrgOnly(orgSlug: string) {
    if (!chainId) throw new Error("No chain selected");
    setIsWorking(true);
    try {
      const tx = await registerOrganizationTx(chainId, orgSlug);
      if (tx) await tx.wait(1);
      return Boolean(tx);
    } finally {
      setIsWorking(false);
    }
  }

  async function deploy(params: DaoDeployParams) {
    if (!chainId) throw new Error("No chain selected");
    setIsWorking(true);
    try {
      const tx = await deployDaoTx(chainId, params);
      if (tx) await tx.wait(1);
      return Boolean(tx);
    } finally {
      setIsWorking(false);
    }
  }

  async function authorizeOperator() {
    if (!chainId) throw new Error("No chain selected");
    setIsWorking(true);
    try {
      const tx = await authorizeOperatorTx(chainId);
      if (tx) await tx.wait(1);
      return Boolean(tx);
    } finally {
      setIsWorking(false);
    }
  }

  return {
    registerOrgOnly,
    deploy,
    authorizeOperator,
    isWorking,
    operatorApproved,
    config,
    chainId,
  };
}
