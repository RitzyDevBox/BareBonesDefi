// Reads an org's on-chain distributions from the DistributionManager and maps them to the
// distribution view-model the UI renders. Re-fetches on every TxRefresh bump. The classes/holders
// the UI needs for payout math come from the cap table (useCapTable) in the component — this hook
// only owns the distribution list + each one's paid-holder set (from HolderPaid events).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ethers } from "ethers";
import DistributionManagerABI from "../../abis/capTable/DistributionManager.abi.json";
import { useReadProvider } from "../useReadProvider";
import { useWalletProvider } from "../useWalletProvider";
import { useTxRefresh } from "../../providers/TxRefreshProvider";
import { getBareBonesConfiguration } from "../../constants/misc";
import { orgSlugFor } from "../../utils/payroll/orgSlug";
import { usePaymentDecimals } from "./usePaymentDecimals";
import type { Distribution, DistStatus } from "../../components/Distributions/distributionsMockData";

const ZERO = ethers.constants.AddressZero;
// on-chain DistributionManager.Status enum
const STATUS: Record<number, DistStatus | undefined> = { 1: "processing", 2: "done", 3: "cancelled" };

function fmtDate(tsSec: number): { date: string; time: string } {
  const d = new Date(tsSec * 1000);
  return {
    date: d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
    time: d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }) + " UTC",
  };
}

export interface UseDistributionsResult {
  distributions: Distribution[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useDistributions(slug: string): UseDistributionsResult {
  const readProvider = useReadProvider();
  const { chainId } = useWalletProvider();
  const { version } = useTxRefresh();
  const decimals = usePaymentDecimals();
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reqId = useRef(0);

  const dmAddress = useMemo(() => {
    if (chainId == null) return null;
    const a = getBareBonesConfiguration(chainId)?.distributionManagerAddress;
    return a && a !== ZERO ? a : null;
  }, [chainId]);

  const slugBytes = useMemo(() => (slug ? orgSlugFor(slug) : null), [slug]);

  const refresh = useCallback(async () => {
    if (!readProvider || !dmAddress || !slugBytes) {
      setDistributions([]);
      return;
    }
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    try {
      const dm = new ethers.Contract(dmAddress, DistributionManagerABI as ethers.ContractInterface, readProvider);
      const count = Number(await dm.distributionCount());
      const fmt = (x: ethers.BigNumberish) => Number(ethers.utils.formatUnits(x, decimals));
      const out: Distribution[] = [];
      for (let i = 1; i <= count; i++) {
        const d = await dm.getDistribution(i);
        if ((d.slug as string).toLowerCase() !== slugBytes.toLowerCase()) continue;
        const status = STATUS[Number(d.status)];
        if (!status) continue;

        const allocations = d.allocations as Array<{ classId: ethers.BigNumber; ratePerShare: ethers.BigNumber }>;
        const classIds = allocations.map((a) => a.classId.toString());
        const ratePerShare = allocations.length ? fmt(allocations[0].ratePerShare) : 0;
        const { date, time } = fmtDate(Number(d.recordDate));

        // Which holders have been paid — from HolderPaid(id, …) events (the subgraph doesn't index
        // distributions). For a finished run everyone eligible is paid; we still read events so the
        // detail table reflects exactly who got paid.
        let paidHolderIds: string[] | "all" = [];
        if (status === "done") {
          paidHolderIds = "all";
        } else {
          const logs = await dm.queryFilter(dm.filters.HolderPaid(i));
          paidHolderIds = logs.map((l) => (l.args?.holder as string).toLowerCase());
        }

        // bytes32 UTF-8 label → string (empty bytes32 → fall back to a numbered name).
        let label = `Distribution #${i}`;
        try {
          const decoded = ethers.utils.parseBytes32String(d.label);
          if (decoded) label = decoded;
        } catch {
          /* malformed bytes32 — keep the fallback */
        }

        out.push({
          id: String(i),
          label,
          mode: "pershare", // on-chain stores only per-class rates; show the rate.
          classIds,
          token: "USDC",
          pool: fmt(d.funded),
          ratePerShare,
          status,
          recordDate: date,
          recordTime: time,
          paidHolderIds,
          totalPaid: fmt(d.paid),
          // cancelled → unspent pool still sits in the treasury (recoverable via withdraw), not "paid".
          refunded: status === "cancelled" ? fmt(ethers.BigNumber.from(d.funded).sub(d.paid)) : undefined,
        });
      }
      if (id === reqId.current) setDistributions(out.reverse()); // newest first
    } catch (e) {
      if (id === reqId.current) setError(e instanceof Error ? e.message : "Failed to load distributions");
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [readProvider, dmAddress, slugBytes, decimals]);

  useEffect(() => {
    void refresh();
  }, [refresh, version]);

  return { distributions, loading, error, refresh };
}
