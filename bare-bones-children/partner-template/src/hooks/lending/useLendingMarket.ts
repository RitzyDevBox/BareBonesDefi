// Cross-org lending book: subgraph (on-chain state) ⋈ BareBonesApi (off-chain metadata) → the
// `Listing[]` the UI already consumes. Refetches whenever a lending tx fires (useTxRefresh.version).
import { useCallback, useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { useWalletProvider } from "../useWalletProvider";
import { useReadProvider } from "../useReadProvider";
import { useTxRefresh } from "../../providers/TxRefreshProvider";
import { DEFAULT_CHAIN_ID, getBareBonesConfiguration } from "../../constants/misc";
import { fetchLendingMarket, type GraphOrg, type GraphShareClass } from "../../utils/graph/lendingGraphService";
import { fetchListingMetadata, type ListingMetadata } from "../../utils/api/lendingMetadataService";
import { adaptListing, indexClassNames, indexOrgs } from "./lendingAdapter";
import type { Listing } from "../../components/Lending/lendingData";
import ShareLendingMarketABI from "../../abis/capTable/ShareLendingMarket.abi.json";
import ERC20ABI from "../../abis/ERC20.json";

const ZERO = ethers.constants.AddressZero;
const MARKET_ABI = ShareLendingMarketABI as ethers.ContractInterface;
const ERC20_DECIMALS_ABI = ERC20ABI as ethers.ContractInterface;

export interface MarketMeta {
  marketAddress: string;
  paymentToken: string;
  decimals: number;
  graceDays: number;
}

export interface OrgClass {
  classId: number;
  name: string;
  /** Connected wallet's free (unpledged) balance in this class, in whole shares — populated by
   *  useOrgHoldings for the "List collateral" picker. */
  free?: number;
}

export interface UseLendingMarket {
  listings: Listing[];
  meta: MarketMeta | null;
  loading: boolean;
  error: string | null;
  /** Cap-table classes for one org's slug (bytes32) — feeds the "List collateral" class picker. */
  classesForOrg: (slugBytes: string) => OrgClass[];
}

export function useLendingMarket(): UseLendingMarket {
  const { account, chainId } = useWalletProvider();
  const readProvider = useReadProvider();
  const { version } = useTxRefresh();
  const config = useMemo(() => getBareBonesConfiguration(chainId ?? DEFAULT_CHAIN_ID), [chainId]);
  const marketAddress = config.shareLendingMarketAddress;
  const effectiveChain = chainId ?? DEFAULT_CHAIN_ID;

  const [listings, setListings] = useState<Listing[]>([]);
  const [orgs, setOrgs] = useState<GraphOrg[]>([]);
  const [classes, setClasses] = useState<GraphShareClass[]>([]);
  const [meta, setMeta] = useState<MarketMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Market config (payment token + decimals + grace) — constant per market address.
  useEffect(() => {
    let cancelled = false;
    if (!readProvider || !marketAddress || marketAddress === ZERO) {
      setMeta(null);
      return;
    }
    (async () => {
      try {
        const market = new ethers.Contract(marketAddress, MARKET_ABI, readProvider);
        const [paymentToken, gracePeriod] = await Promise.all([market.paymentToken(), market.gracePeriod()]);
        const token = new ethers.Contract(paymentToken, ERC20_DECIMALS_ABI, readProvider);
        const decimals: number = await token.decimals();
        if (cancelled) return;
        setMeta({
          marketAddress,
          paymentToken,
          decimals,
          graceDays: Math.max(0, Math.round(Number(gracePeriod) / 86400)),
        });
      } catch {
        if (!cancelled) setMeta(null);
      }
    })();
    return () => { cancelled = true; };
  }, [readProvider, marketAddress]);

  // The book itself — graph + metadata, re-run on tx refresh / account / chain / meta.
  useEffect(() => {
    let cancelled = false;
    if (!marketAddress || marketAddress === ZERO || !meta) {
      setListings([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const snap = await fetchLendingMarket(effectiveChain);
        if (cancelled) return;
        if (!snap) {
          setListings([]);
          setLoading(false);
          return;
        }
        // Batch-fetch off-chain metadata, grouped by slug (the API key is per (chain, market, slug)).
        const idsBySlug = new Map<string, number[]>();
        for (const l of snap.listings) {
          const arr = idsBySlug.get(l.slug) ?? [];
          arr.push(Number(l.listingId));
          idsBySlug.set(l.slug, arr);
        }
        const metaByKey: Record<string, ListingMetadata> = {};
        await Promise.all(
          [...idsBySlug.entries()].map(async ([slug, ids]) => {
            const rows = await fetchListingMetadata(effectiveChain, marketAddress, slug, ids);
            for (const r of rows) metaByKey[`${slug.toLowerCase()}-${r.listingId}`] = r;
          }),
        );
        if (cancelled) return;
        const ctx = {
          account: account ?? null,
          decimals: meta.decimals,
          graceDays: meta.graceDays,
          orgsBySlug: indexOrgs(snap.orgs),
          classNames: indexClassNames(snap.classes),
          metaByKey,
        };
        const adapted = snap.listings
          .map((l) => adaptListing(l, ctx))
          .filter((l): l is Listing => l !== null);
        setListings(adapted);
        setOrgs(snap.orgs);
        setClasses(snap.classes);
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load the lending market");
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [marketAddress, meta, effectiveChain, account, version]);

  const classesForOrg = useCallback(
    (slugBytes: string): OrgClass[] => {
      const org = orgs.find((o) => o.slug.toLowerCase() === slugBytes.toLowerCase());
      if (!org) return [];
      const prefix = `${org.shareToken.toLowerCase()}-`;
      return classes
        .filter((c) => c.id.toLowerCase().startsWith(prefix))
        .map((c) => ({ classId: Number(c.classId), name: c.name }));
    },
    [orgs, classes],
  );

  return { listings, meta, loading, error, classesForOrg };
}
