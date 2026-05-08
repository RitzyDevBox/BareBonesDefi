import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { useWalletProvider } from "../../../hooks/useWalletProvider";
import { useExecuteRawTx } from "../../../hooks/useExecuteRawTx";
import { useTxRefresh } from "../../../providers/TxRefreshProvider";
import { getBareBonesConfiguration } from "../../../constants/misc";
import OrgAndDaoLauncherABI from "../../../abis/dao/OrgAndDaoLauncher.abi.json";
import PayrollManagerABI from "../../../abis/paymentPipelines/PayrollManager.abi.json";

/** Free-form display name for an admin entry. Encoded into a bytes32
 *  `nameSlug` for on-chain storage at deploy time; truncated to 31 chars
 *  to fit. Empty string falls back to a contract-derived sentinel. */
export interface AdminInit {
  wallet: string;
  name: string;
}

export interface DaoDeployParams {
  /**
   * Canonical org name. Slug = keccak256(bytes(name)) and the DAO Governor's
   * `name` field is forced to equal this string by the launcher.
   */
  orgName: string;
  token: string;
  timelockDelay: string;
  votingDelay: string;
  votingPeriod: string;
  proposalThreshold: string;
  quorumNumerator: string;
  cancellers: string[];
  /**
   * MultiTenantAuth super-admin for the new slug. Empty string is forwarded
   * as `address(0)`, which the launcher rewrites to the freshly-deployed
   * timelock — the recommended default.
   */
  authSuperAdmin: string;
  /** Optional display name for the super admin member row. When omitted AND
   *  the launcher is substituting the timelock, the contract defaults to
   *  `"Timelock"`. */
  authSuperAdminName: string;
  /** Initial Admin role members seeded by `MultiTenantAuth.bootstrap`.
   *  Each entry's `name` is packed into bytes32 for on-chain storage; empty
   *  names fall back to a contract-derived sentinel. */
  authInitialAdmins: AdminInit[];
}

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export function useDeployDao() {
  const { provider, account, chainId } = useWalletProvider();
  const { version: txVersion } = useTxRefresh();
  const config = useMemo(() => (chainId ? getBareBonesConfiguration(chainId) : null), [chainId]);
  const launcherInterface = useMemo(
    () => new ethers.utils.Interface(OrgAndDaoLauncherABI as any),
    [],
  );

  const launcherAddress = config?.orgAndDaoLauncherAddress;
  const launcherConfigured =
    Boolean(launcherAddress) && launcherAddress !== ZERO_ADDRESS;

  const [isWorking, setIsWorking] = useState(false);

  // Slug-availability probe: read OrganizationManager.organizations(slug).exists.
  // The OrganizationManager methods live on the deployed PayrollManager.
  const [slugProbe, setSlugProbe] = useState<{ name: string; taken: boolean } | null>(null);

  useEffect(() => {
    void txVersion;
    setSlugProbe(null);
  }, [txVersion, chainId]);

  async function isOrgNameTaken(orgName: string): Promise<boolean> {
    if (!provider || !config?.payrollManagerAddress) return false;
    const slug = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(orgName));
    const c = new ethers.Contract(
      config.payrollManagerAddress,
      PayrollManagerABI as any,
      provider,
    );
    try {
      const org = await c.organizations(slug);
      const taken = Boolean(org?.exists);
      setSlugProbe({ name: orgName, taken });
      return taken;
    } catch {
      setSlugProbe({ name: orgName, taken: false });
      return false;
    }
  }

  /**
   * Returns the canonical (governor, timelock) for this org name, or null if
   * no canonical DAO has been recorded. UIs should call this before showing
   * a "Deploy DAO" CTA: if it returns non-null, the org already has its
   * official DAO and re-deploying via the launcher will revert.
   */
  async function getCanonicalDao(orgName: string): Promise<{ governor: string; timelock: string } | null> {
    if (!provider || !config?.payrollManagerAddress) return null;
    const slug = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(orgName));
    const c = new ethers.Contract(
      config.payrollManagerAddress,
      PayrollManagerABI as any,
      provider,
    );
    try {
      const [governor, timelock] = await c.daoOf(slug);
      if (!governor || governor === ZERO_ADDRESS) return null;
      return { governor, timelock };
    } catch {
      // daoOf reverts if the org doesn't exist; treat as "no DAO yet."
      return null;
    }
  }

  // Single-tx atomic launch: registers the org AND deploys the canonical DAO,
  // and writes the official (governor, timelock) into OrganizationManager.daoOf(slug).
  // Frontend must enforce "only one canonical DAO per slug" by gating this button on
  // a prior `daoOf(slug)` read; the contract write is also write-once.
  const launchDaoTx = useExecuteRawTx(
    (_chain: number, params: DaoDeployParams) => {
      if (!launcherAddress || !launcherConfigured) {
        throw new Error("OrgAndDaoLauncher not configured for this chain.");
      }
      // Empty super-admin → address(0) → launcher substitutes the freshly
      // deployed timelock as the slug's super-admin (recommended default).
      const superAdmin = params.authSuperAdmin
        ? ethers.utils.getAddress(params.authSuperAdmin)
        : ZERO_ADDRESS;
      // bytes32(0) for the super-admin name lets the launcher pick the
      // default — `"Timelock"` when the timelock substitution kicks in,
      // otherwise the contract's keccak-derived sentinel.
      const superAdminNameSlug = params.authSuperAdminName.trim()
        ? ethers.utils.formatBytes32String(params.authSuperAdminName.trim().slice(0, 31))
        : ethers.constants.HashZero;
      const initialAdmins = params.authInitialAdmins.map((a) => ({
        wallet: ethers.utils.getAddress(a.wallet),
        nameSlug: a.name.trim()
          ? ethers.utils.formatBytes32String(a.name.trim().slice(0, 31))
          : ethers.constants.HashZero,
      }));
      const cfg = {
        name: params.orgName.trim(),
        daoCfg: {
          // The launcher overwrites this with `cfg.name` for safety, but pass
          // it through anyway so the calldata is well-formed.
          name: params.orgName.trim(),
          token: ethers.utils.getAddress(params.token.trim()),
          timelockDelay: params.timelockDelay,
          votingDelay: params.votingDelay,
          votingPeriod: params.votingPeriod,
          proposalThreshold: params.proposalThreshold,
          quorumNumerator: params.quorumNumerator,
          cancellers: params.cancellers,
        },
        // MultiTenantAuth bootstrap config — slug is gated by this contract
        // for the lifetime of the org. See BareBonesDiamond/src/auth/MultiTenantAuth.sol.
        authCfg: {
          superAdmin,
          superAdminNameSlug,
          initialAdmins,
        },
      };
      return {
        to: launcherAddress,
        data: launcherInterface.encodeFunctionData("launch", [cfg]),
      } as any;
    },
    (_chain: number, params: DaoDeployParams) => `Launched org + DAO "${params.orgName}"`,
  );

  async function deploy(params: DaoDeployParams) {
    if (!chainId) throw new Error("No chain selected");
    setIsWorking(true);
    try {
      const tx = await launchDaoTx(chainId, params);
      if (tx) await tx.wait(1);
      return Boolean(tx);
    } finally {
      setIsWorking(false);
    }
  }

  return {
    deploy,
    isOrgNameTaken,
    getCanonicalDao,
    slugProbe,
    isWorking,
    launcherConfigured,
    config,
    chainId,
    /** @deprecated unused since the launcher path replaced the operator-approval flow. */
    operatorApproved: true as boolean | null,
    /** @deprecated no-op; the launcher doesn't require operator approval. */
    authorizeOperator: async () => true,
    // Account is exposed for callers that want to default the cancellers list.
    account,
  };
}
