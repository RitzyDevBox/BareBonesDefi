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

/** Initial token holder + amount minted at the GovernanceToken constructor.
 *  `amount` is a base-10 wei string (e.g. "100000000000000000000" for 100e18). */
export interface TokenAllocationInput {
  holder: string;
  amount: string;
}

/** Maps 1:1 to MembersContract.AccountType. Payee (3) is intentionally
 *  excluded — Payees come through the dedicated payroll-side onboarding path,
 *  not the launcher. */
export enum AccountType {
  Member = 0,
  Investor = 1,
  AuthorizedUser = 2,
}

/** Member to onboard at launch beyond the bootstrap admins. `name` is packed
 *  to bytes32 (non-empty required — MTA's `_createMember` rejects bytes32(0)
 *  for the org roster). `roleSlugString` empty = no role assigned at onboard. */
export interface MemberInitInput {
  wallet: string;
  name: string;
  accountType: AccountType;
  /** Pass a system-role display string ("TokenMinter", "TokenPauser", "Admin",
   *  etc.) and we'll bytes32-pack it; empty = no role. For custom roles, use
   *  the role's exact bytes32 slug if known. */
  roleSlugString: string;
}

/** Factory-deployed token configuration. Used when `tokenSource.useFactory`
 *  is true (the default for new DAOs). The launcher routes this through
 *  TokenFactory and hands ownership to MultiTenantAuth in the same tx. */
export interface FactoryTokenConfig {
  name: string;
  symbol: string;
  allocations: TokenAllocationInput[];
  /** Wallets to receive `TOKEN_MINTER_ROLE` in the new slug. Empty = only
   *  Super Admin (timelock) can mint via a DAO proposal. */
  initialMinters: string[];
  /** Wallets to receive `TOKEN_PAUSER_ROLE`. Empty = only Super Admin
   *  can pause/unpause. */
  initialPausers: string[];
}

/** One of: deploy a fresh GovernanceToken via the factory (default), or
 *  bring an existing ERC20Votes (BYO). Factory path is preferred — it gives
 *  MTA-gated mint/pause/transfer-freeze, deterministic CREATE3 address,
 *  and subgraph auto-indexing. BYO is an escape hatch for orgs migrating
 *  in or with a pre-existing token. */
export type TokenSourceInput =
  | { useFactory: true; factoryConfig: FactoryTokenConfig }
  | { useFactory: false; byoToken: string };

export interface DaoDeployParams {
  /**
   * Canonical org name. Slug = keccak256(bytes(name)) and the DAO Governor's
   * `name` field is forced to equal this string by the launcher.
   */
  orgName: string;
  /** How the governance token is sourced — defaults to factory-deployed. */
  tokenSource: TokenSourceInput;
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
  /** Additional members onboarded in the same launch tx (regular Members,
   *  Investors, AuthorizedUsers, optionally with role assignments). Wallets
   *  here MUST NOT overlap with initialAdmins / Super Admin — MTA's bootstrap
   *  reverts on duplicate members. */
  additionalMembers: MemberInitInput[];
}

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/** Pack a display name into bytes32 (≤ 31 chars). Empty → HashZero. */
function packBytes32Name(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return ethers.constants.HashZero;
  return ethers.utils.formatBytes32String(trimmed.slice(0, 31));
}

/**
 * Normalize a user-entered address: trim, lowercase, then re-checksum.
 * The lowercase step strips any wrong-cased letters (e.g. a mixed-case paste
 * that lost its EIP-55 checksum) so we don't throw `bad address checksum` on
 * an otherwise-valid 20-byte hex. Throws on completely malformed input.
 */
function toChecksumAddress(value: string): string {
  return ethers.utils.getAddress(value.trim().toLowerCase());
}

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

  // Whether the chain has a TokenFactory wired up. Drives the default UI
  // mode in the deployment form: factory when available, BYO-only otherwise.
  const tokenFactoryAddress = config?.tokenFactoryAddress;
  const tokenFactoryAvailable =
    Boolean(tokenFactoryAddress) && tokenFactoryAddress !== ZERO_ADDRESS;

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

  // Single-tx atomic launch. Builds the full LaunchConfig including:
  //   - daoCfg (governor params + token; token is address(0) in factory mode)
  //   - tokenSource (factory-deployed or BYO)
  //   - authCfg (super admin, admins, additionalMembers)
  // The contract write is write-once per slug; frontend gates on a prior
  // `daoOf(slug)` read before exposing this button.
  const launchDaoTx = useExecuteRawTx(
    (_chain: number, params: DaoDeployParams) => {
      if (!launcherAddress || !launcherConfigured) {
        throw new Error("OrgAndDaoLauncher not configured for this chain.");
      }
      if (params.tokenSource.useFactory && !tokenFactoryAvailable) {
        throw new Error(
          "TokenFactory not configured for this chain — switch the form to BYO-token mode.",
        );
      }

      // Empty super-admin → address(0) → launcher substitutes the freshly
      // deployed timelock as the slug's super-admin (recommended default).
      // toChecksumAddress lowercases first so a wrong-cased paste survives.
      const superAdmin = params.authSuperAdmin
        ? toChecksumAddress(params.authSuperAdmin)
        : ZERO_ADDRESS;

      const superAdminNameSlug = packBytes32Name(params.authSuperAdminName);

      // The SuperAdmin is bootstrapped as a member by the launcher, so it must NOT also appear
      // in the admin / minter / pauser / additional-member lists or `bootstrap` reverts
      // `MemberAlreadyExists()`. When the SuperAdmin field is blank, the launcher substitutes the
      // owner (= connected account) in ShareToken mode, or the freshly-deployed timelock otherwise
      // (unknown here → nothing to dedupe). Drop the resolved SuperAdmin wallet from every list.
      const effectiveSuperAdmin = (
        superAdmin !== ZERO_ADDRESS
          ? superAdmin
          : params.tokenSource.useFactory && account
            ? toChecksumAddress(account)
            : ZERO_ADDRESS
      ).toLowerCase();
      const notSuperAdmin = (wallet: string) => wallet.toLowerCase() !== effectiveSuperAdmin;

      const initialAdmins = params.authInitialAdmins
        .map((a) => ({ wallet: toChecksumAddress(a.wallet), nameSlug: packBytes32Name(a.name) }))
        .filter((a) => notSuperAdmin(a.wallet));

      const additionalMembers = params.additionalMembers
        .map((m) => ({
          wallet: toChecksumAddress(m.wallet),
          // _createMember rejects bytes32(0) for regular members — UI validation
          // must require a non-empty name; we still defensively pack.
          nameSlug: packBytes32Name(m.name),
          accountType: m.accountType,
          roleSlug: m.roleSlugString.trim()
            ? packBytes32Name(m.roleSlugString)
            : ethers.constants.HashZero,
        }))
        .filter((m) => notSuperAdmin(m.wallet));

      // Token-side branch — factory mode requires daoCfg.token = address(0)
      // (the launcher reverts `TokenAddressConflict` otherwise).
      let daoToken: string;
      let tokenSourceStruct: {
        useFactory: boolean;
        factoryConfig: {
          name: string;
          symbol: string;
          mintable: boolean;
          initialHolders: string[];
          initialAmounts: string[];
        };
        initialMinters: string[];
        initialPausers: string[];
        // When true (factory path), the launcher deploys a cap-table ShareToken as the DAO's
        // IVotes source (ERC20-emulation Common class) instead of a fungible GovernanceToken —
        // so the cap table exists, slug-registered + writable, from formation. See CAPTABLE.md.
        useShareToken: boolean;
      };

      if (params.tokenSource.useFactory) {
        const fc = params.tokenSource.factoryConfig;
        daoToken = ZERO_ADDRESS;
        tokenSourceStruct = {
          useFactory: true,
          factoryConfig: {
            name: fc.name.trim(),
            symbol: fc.symbol.trim(),
            // `mintable` is part of the on-chain TokenConfig struct but unused for the cap-table path
            // (the launcher deploys a ShareToken, which has no mintable flag). Hardcoded; the UI
            // toggle was removed.
            mintable: true,
            initialHolders: fc.allocations.map((a) => toChecksumAddress(a.holder)),
            // `TokenUnitsInput` already emits base units (it runs parseUnits on the typed whole-token
            // value), so the form state IS 18-dec base units — pass it through. Do NOT re-scale here:
            // an extra parseTokens double-scaled (100 → 1e20 → 1e38). The contract never scales.
            initialAmounts: fc.allocations.map((a) => a.amount || "0"),
          },
          initialMinters: fc.initialMinters.map((a) => toChecksumAddress(a)).filter(notSuperAdmin),
          initialPausers: fc.initialPausers.map((a) => toChecksumAddress(a)).filter(notSuperAdmin),
          // Default new DAOs to the cap-table token.
          useShareToken: true,
        };
      } else {
        daoToken = toChecksumAddress(params.tokenSource.byoToken);
        tokenSourceStruct = {
          useFactory: false,
          factoryConfig: {
            name: "",
            symbol: "",
            mintable: false,
            initialHolders: [],
            initialAmounts: [],
          },
          initialMinters: [],
          initialPausers: [],
          useShareToken: false,
        };
      }

      const cfg = {
        name: params.orgName.trim(),
        daoCfg: {
          // The launcher overwrites this with `cfg.name` for safety, but pass
          // it through anyway so the calldata is well-formed.
          name: params.orgName.trim(),
          token: daoToken,
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
          additionalMembers,
        },
        tokenSource: tokenSourceStruct,
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
    /** True when the chain has a TokenFactory wired up. Drives the default
     *  UI mode in the deployment form (factory if true, BYO-only if false). */
    tokenFactoryAvailable,
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
