// "Enable lending" for an org — the two MTA-gated calls a Super Admin makes once so their org can
// use the market: setShareToken(slug, shareToken) on the market (authorized(slug)) + setLocker(market,
// true) on the ShareToken (onlyOwner = MTA). Both routed through MTA.execute. Decision: an admin action
// rather than baking it into formation (see SHARE_LENDING.md changelog 2026-06-21).
import { useCallback, useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { useWalletProvider } from "../useWalletProvider";
import { useReadProvider } from "../useReadProvider";
import { useTxRefresh } from "../../providers/TxRefreshProvider";
import { useMtaActions } from "../auth/useMtaActions";
import { resolveOrgShareToken } from "../capTable/shareTokenResolver";
import { fetchOrganizationInfo } from "../payroll/useOrganizationRegistry";
import { DEFAULT_CHAIN_ID, getBareBonesConfiguration } from "../../constants/misc";
import ShareLendingMarketABI from "../../abis/capTable/ShareLendingMarket.abi.json";
import ShareTokenABI from "../../abis/capTable/ShareToken.abi.json";

const ZERO = ethers.constants.AddressZero;
const MARKET_ABI = ShareLendingMarketABI as ethers.ContractInterface;
const SHARE_TOKEN_ABI = ShareTokenABI as ethers.ContractInterface;

export interface UseLendingAdmin {
  shareToken: string | null;
  enabled: boolean;
  checking: boolean;
  /** Set when the on-chain status check itself threw (RPC down, ABI/selector mismatch, wrong chain).
   *  Distinct from `shareToken === null` (a genuine "no cap table deployed"), so the UI can show the
   *  real reason instead of a misleading "no cap table" — see EnableLendingModal. */
  error: string | null;
  /** Step 1 of enabling: register the org's cap table on the market (setShareToken). */
  registerCapTable: () => Promise<unknown>;
  /** Step 2 of enabling: allow the market to lock/seize collateral (ShareToken.setLocker). */
  allowCollateralLock: () => Promise<unknown>;
}

/** @param slugBytes active org slug (bytes32 hex). @param orgName human-readable org name (for the
 *  share-token resolver's cache key). */
export function useLendingAdmin(slugBytes: string | null, orgName: string | null): UseLendingAdmin {
  const { chainId } = useWalletProvider();
  const readProvider = useReadProvider();
  const { version } = useTxRefresh();
  const config = useMemo(() => getBareBonesConfiguration(chainId ?? DEFAULT_CHAIN_ID), [chainId]);
  const marketAddress = config.shareLendingMarketAddress;
  const mta = useMtaActions(slugBytes ?? "");
  const marketIface = useMemo(() => new ethers.utils.Interface(ShareLendingMarketABI as never), []);
  const stIface = useMemo(() => new ethers.utils.Interface(ShareTokenABI as never), []);

  const [shareToken, setShareToken] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!readProvider || !slugBytes || !orgName || !marketAddress || marketAddress === ZERO || chainId == null) {
      setShareToken(null);
      setEnabled(false);
      setError(null);
      return;
    }
    setChecking(true);
    setError(null);
    (async () => {
      try {
        const market = new ethers.Contract(marketAddress, MARKET_ABI, readProvider);
        // Prefer the address the market already knows; else resolve via the cap-table resolver.
        let st: string = await market.shareTokenOf(slugBytes);
        if (!st || st === ZERO) {
          const orgInfo = await fetchOrganizationInfo(readProvider, config.payrollManagerAddress, orgName).catch(() => null);
          // RPC-first resolution across BOTH cap-table paths (formation DAO token + standalone) so enabling
          // lending works even when the subgraph is down — the cap table must not depend on the graph.
          st = (await resolveOrgShareToken(readProvider, chainId, orgName, orgInfo?.exists ? orgInfo.owner : null, {
            payrollManagerAddress: config.payrollManagerAddress,
          })) ?? ZERO;
        }
        let isEnabled = false;
        if (st && st !== ZERO) {
          const registered: string = await market.shareTokenOf(slugBytes);
          const token = new ethers.Contract(st, SHARE_TOKEN_ABI, readProvider);
          const locker: boolean = await token.isLocker(marketAddress);
          isEnabled = registered !== ZERO && locker;
        }
        if (cancelled) return;
        setShareToken(st && st !== ZERO ? st : null);
        setEnabled(isEnabled);
        setError(null);
      } catch (e) {
        // A thrown check is NOT the same as "no cap table" — surface the real reason so a bad ABI/
        // selector, RPC outage, or wrong-chain wallet doesn't masquerade as "no cap table found".
        if (!cancelled) {
          setShareToken(null);
          setEnabled(false);
          setError(e instanceof Error ? e.message : "Couldn't read lending status on-chain");
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, [readProvider, slugBytes, orgName, marketAddress, chainId, config.payrollManagerAddress, version]);

  // 1) register the org's cap table on the market (authorized(slug))
  const registerCapTable = useCallback(() => {
    if (!slugBytes || !shareToken || !marketAddress) return Promise.resolve(undefined);
    return mta.execute(
      marketAddress,
      marketIface.encodeFunctionData("setShareToken", [slugBytes, shareToken]),
      "Cap table registered on the lending market",
    );
  }, [slugBytes, shareToken, marketAddress, mta, marketIface]);

  // 2) allow-list the market to lock/seize collateral on the ShareToken (onlyOwner = MTA)
  const allowCollateralLock = useCallback(() => {
    if (!shareToken || !marketAddress) return Promise.resolve(undefined);
    return mta.execute(
      shareToken,
      stIface.encodeFunctionData("setLocker", [marketAddress, true]),
      "Market allowed to lock collateral",
    );
  }, [shareToken, marketAddress, mta, stIface]);

  return { shareToken, enabled, checking, error, registerCapTable, allowCollateralLock };
}
