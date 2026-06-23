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
import { resolveShareTokenAddress } from "../capTable/shareTokenResolver";
import { fetchOrganizationInfo } from "../payroll/useOrganizationRegistry";
import { DEFAULT_CHAIN_ID, getBareBonesConfiguration } from "../../constants/misc";

const ZERO = ethers.constants.AddressZero;
const MARKET_ABI = [
  "function setShareToken(bytes32 slug, address shareToken)",
  "function shareTokenOf(bytes32 slug) view returns (address)",
];
const SHARE_TOKEN_ABI = [
  "function setLocker(address account, bool allowed)",
  "function isLocker(address account) view returns (bool)",
];

export interface UseLendingAdmin {
  shareToken: string | null;
  enabled: boolean;
  checking: boolean;
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
  const marketIface = useMemo(() => new ethers.utils.Interface(MARKET_ABI), []);
  const stIface = useMemo(() => new ethers.utils.Interface(SHARE_TOKEN_ABI), []);

  const [shareToken, setShareToken] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!readProvider || !slugBytes || !orgName || !marketAddress || marketAddress === ZERO || chainId == null) {
      setShareToken(null);
      setEnabled(false);
      return;
    }
    setChecking(true);
    (async () => {
      try {
        const market = new ethers.Contract(marketAddress, MARKET_ABI, readProvider);
        // Prefer the address the market already knows; else resolve via the cap-table resolver.
        let st: string = await market.shareTokenOf(slugBytes);
        if (!st || st === ZERO) {
          const orgInfo = await fetchOrganizationInfo(readProvider, config.payrollManagerAddress, orgName).catch(() => null);
          st = (await resolveShareTokenAddress(chainId, orgName, orgInfo?.exists ? orgInfo.owner : null)) ?? ZERO;
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
      } catch {
        if (!cancelled) { setShareToken(null); setEnabled(false); }
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

  return { shareToken, enabled, checking, registerCapTable, allowCollateralLock };
}
