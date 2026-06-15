// Write actions for the cap table.
//
// Two flavours:
//  • Owner-gated (createClass / issue / clawback / cancelGrant / setReservedPool, plus
//    recordSafe on the Convertibles singleton): the ShareToken/singleton is owned by
//    MultiTenantAuth, so these route through `MTA.execute(slug, target, innerData, "0x")`.
//    MTA checks the caller's role for the slug (SuperAdmin / CapTableManager).
//  • Holder-initiated (transfer, claim voting power): plain direct calls to the ShareToken
//    from the connected wallet — `transfer` is sender-scoped and `claim` is permissionless.
//
// `deployCapTable` calls the public ShareTokenFactory.deployFor and persists the resulting
// address (parsed from the ShareTokenDeployed event) so the resolver can find it.

import { useCallback, useMemo } from "react";
import { ethers } from "ethers";
import ShareTokenABI from "../../abis/capTable/ShareToken.abi.json";
import ShareTokenFactoryABI from "../../abis/capTable/ShareTokenFactory.abi.json";
import ConvertiblesABI from "../../abis/capTable/Convertibles.abi.json";
import MultiTenantAuthABI from "../../abis/auth/MultiTenantAuth.abi.json";
import { useExecuteRawTx } from "../useExecuteRawTx";
import { useWalletProvider } from "../useWalletProvider";
import { getBareBonesConfiguration } from "../../constants/misc";
import { orgSlugFor } from "../../utils/payroll/orgSlug";
import type { ClassParams } from "./capTableTypes";
import { saveShareTokenAddress } from "./shareTokenResolver";
// Shared scaling — whole-token UI input → 18-dec base units (the contract never scales).
import { parseTokens } from "../../components/CapTable/capTableHelpers";

const ZERO = ethers.constants.AddressZero;

/** Config for ShareTokenFactory.deployFor — mirrors the on-chain ShareTokenConfig struct. */
export interface DeployCapTableConfig {
  name: string;
  symbol: string;
  complianceSBT: string; // ZERO disables the KYC gate (v1)
  defaultClass: ClassParams;
  initialHolders: string[];
  initialAmounts: string[]; // decimal strings, parallel to initialHolders
}

function bn(v: ethers.BigNumberish): string {
  return ethers.BigNumber.from(v).toString();
}

export function useCapTableActions(slug: string, shareTokenAddress: string | null) {
  const { account, chainId } = useWalletProvider();
  const config = useMemo(() => (chainId != null ? getBareBonesConfiguration(chainId) : null), [chainId]);

  const factoryIface = useMemo(() => new ethers.utils.Interface(ShareTokenFactoryABI as any), []);
  const shareIface = useMemo(() => new ethers.utils.Interface(ShareTokenABI as any), []);
  const convIface = useMemo(() => new ethers.utils.Interface(ConvertiblesABI as any), []);
  const mtaIface = useMemo(() => new ethers.utils.Interface(MultiTenantAuthABI as any), []);

  const slugBytes = useMemo(() => (slug ? orgSlugFor(slug) : ZERO), [slug]);

  // Wrap an encoded ShareToken/singleton call in MTA.execute for the org's slug.
  const mtaExecuteTx = useCallback(
    (target: string, innerData: string) => {
      if (!config?.multiTenantAuthAddress || config.multiTenantAuthAddress === ZERO) {
        throw new Error("MultiTenantAuth address not configured for this chain.");
      }
      return {
        to: config.multiTenantAuthAddress,
        data: mtaIface.encodeFunctionData("execute", [slugBytes, target, innerData, "0x"]),
        value: undefined,
      };
    },
    [config, mtaIface, slugBytes],
  );

  function requireShareToken(): string {
    if (!shareTokenAddress) throw new Error("Cap table not deployed for this organization yet.");
    return shareTokenAddress;
  }

  // ── Deploy a new cap table (public factory call) ─────────────────────────
  const rawDeploy = useExecuteRawTx(
    (owner: string, cfg: DeployCapTableConfig) => {
      if (!config?.shareTokenFactoryAddress || config.shareTokenFactoryAddress === ZERO) {
        throw new Error("ShareTokenFactory address not configured for this chain.");
      }
      return {
        to: config.shareTokenFactoryAddress,
        data: factoryIface.encodeFunctionData("deployFor", [owner, cfg]),
        value: undefined,
      };
    },
    () => "Cap table created",
  );

  const deployCapTable = useCallback(
    async (cfg: DeployCapTableConfig): Promise<string | null> => {
      if (!account) throw new Error("Connect a wallet to set up a cap table.");
      const tx = await rawDeploy(account, cfg);
      if (!tx) return null;
      const receipt = await tx.wait();
      let deployed: string | null = null;
      for (const log of receipt.logs) {
        try {
          const parsed = factoryIface.parseLog(log);
          if (parsed.name === "ShareTokenDeployed") {
            deployed = parsed.args.shareToken as string;
            break;
          }
        } catch {
          /* not our event */
        }
      }
      if (deployed && chainId != null) saveShareTokenAddress(chainId, slug, deployed);
      return deployed;
    },
    [account, rawDeploy, factoryIface, chainId, slug],
  );

  // ── Owner-gated writes (via MTA.execute) ─────────────────────────────────
  const issueGrant = useExecuteRawTx(
    (classId: number, to: string, amount: string) =>
      mtaExecuteTx(requireShareToken(), shareIface.encodeFunctionData("issue", [classId, to, parseTokens(amount)])),
    (_classId, _to, amount) => `Issued ${amount} shares`,
  );

  const createClass = useExecuteRawTx(
    (params: ClassParams) =>
      mtaExecuteTx(requireShareToken(), shareIface.encodeFunctionData("createClass", [params])),
    (params) => `Class "${params.name}" created`,
  );

  const setReservedPool = useExecuteRawTx(
    (classId: number, amount: string) =>
      mtaExecuteTx(
        requireShareToken(),
        shareIface.encodeFunctionData("setReservedPool", [classId, parseTokens(amount)]),
      ),
    () => "Option pool updated",
  );

  const clawbackUnvested = useExecuteRawTx(
    (grantId: number) =>
      mtaExecuteTx(requireShareToken(), shareIface.encodeFunctionData("clawbackUnvested", [grantId])),
    () => "Unvested shares clawed back",
  );

  const cancelGrant = useExecuteRawTx(
    (grantId: number) =>
      mtaExecuteTx(requireShareToken(), shareIface.encodeFunctionData("cancelGrant", [grantId])),
    () => "Grant cancelled",
  );

  function requireConvertibles(): string {
    if (!config?.convertiblesAddress || config.convertiblesAddress === ZERO) {
      throw new Error("Convertibles address not configured for this chain.");
    }
    return config.convertiblesAddress;
  }

  const recordSafe = useExecuteRawTx(
    (investor: string, principal: string, cap: string, discountBps: number, targetClassId: number) =>
      // recordSafe(slug, investor, principal(USD), valuationCap(USD), discountBps, targetClass)
      mtaExecuteTx(
        requireConvertibles(),
        convIface.encodeFunctionData("recordSafe", [slugBytes, investor, bn(principal), bn(cap), discountBps, targetClassId]),
      ),
    () => "SAFE recorded",
  );

  const recordNote = useExecuteRawTx(
    (
      investor: string,
      principal: string,
      cap: string,
      discountBps: number,
      interestRateBps: number,
      maturityUnix: number,
      targetClassId: number,
    ) =>
      // recordNote(slug, investor, principal, cap, discountBps, interestRateBps, maturity, targetClass)
      mtaExecuteTx(
        requireConvertibles(),
        convIface.encodeFunctionData("recordNote", [
          slugBytes,
          investor,
          bn(principal),
          bn(cap),
          discountBps,
          interestRateBps,
          maturityUnix,
          targetClassId,
        ]),
      ),
    () => "Convertible note recorded",
  );

  const openRound = useExecuteRawTx(
    (pricePerShare: string, preConversionShares: string) =>
      mtaExecuteTx(
        requireConvertibles(),
        convIface.encodeFunctionData("openRound", [slugBytes, bn(pricePerShare), parseTokens(preConversionShares)]),
      ),
    () => "Priced round opened",
  );

  const convertSafes = useExecuteRawTx(
    (roundId: number, ids: number[]) =>
      mtaExecuteTx(requireConvertibles(), convIface.encodeFunctionData("convertSafes", [slugBytes, roundId, ids])),
    () => "SAFEs converted",
  );

  const convertNotes = useExecuteRawTx(
    (roundId: number, ids: number[]) =>
      mtaExecuteTx(requireConvertibles(), convIface.encodeFunctionData("convertNotes", [slugBytes, roundId, ids])),
    () => "Notes converted",
  );

  // ── Class lifecycle (owner-gated) ────────────────────────────────────────
  const retireClass = useExecuteRawTx(
    (classId: number) =>
      mtaExecuteTx(requireShareToken(), shareIface.encodeFunctionData("retireClass", [classId])),
    () => "Class retired",
  );

  const removeClass = useExecuteRawTx(
    (classId: number) =>
      mtaExecuteTx(requireShareToken(), shareIface.encodeFunctionData("removeClass", [classId])),
    () => "Class removed",
  );

  const declareLiquidityEvent = useExecuteRawTx(
    (classId: number) =>
      mtaExecuteTx(requireShareToken(), shareIface.encodeFunctionData("declareLiquidityEvent", [classId])),
    () => "Liquidity event declared",
  );

  // ── Holder-initiated direct calls ────────────────────────────────────────
  const transferShares = useExecuteRawTx(
    (classId: number, to: string, amount: string) => ({
      to: requireShareToken(),
      data: shareIface.encodeFunctionData("transfer", [classId, to, parseTokens(amount)]),
      value: undefined,
    }),
    (_classId, _to, amount) => `Transferred ${amount} shares`,
  );

  const claimVotes = useExecuteRawTx(
    (holder: string, classId: number) => ({
      to: requireShareToken(),
      data: shareIface.encodeFunctionData("claim", [holder, classId]),
      value: undefined,
    }),
    () => "Voting power claimed",
  );

  return {
    deployCapTable,
    issueGrant,
    createClass,
    setReservedPool,
    clawbackUnvested,
    cancelGrant,
    recordSafe,
    recordNote,
    openRound,
    convertSafes,
    convertNotes,
    retireClass,
    removeClass,
    declareLiquidityEvent,
    transferShares,
    claimVotes,
  };
}
