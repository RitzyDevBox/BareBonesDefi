// Reads the connected wallet's FREE (unpledged) balance per cap-table class for one org, so the
// "List collateral" picker only offers classes the borrower actually holds and can't over-pledge
// (which would revert on-chain with ShareToken.InsufficientFree).
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useReadProvider } from "../useReadProvider";
import { useWalletProvider } from "../useWalletProvider";
import { useTxRefresh } from "../../providers/TxRefreshProvider";
import type { OrgClass } from "./useLendingMarket";
import ShareTokenABI from "../../abis/capTable/ShareToken.abi.json";

const SHARE_TOKEN_ABI = ShareTokenABI as ethers.ContractInterface;

export function useOrgHoldings(
  shareToken: string | null,
  classes: OrgClass[],
): OrgClass[] {
  const { account } = useWalletProvider();
  const readProvider = useReadProvider();
  const { version } = useTxRefresh();
  const [withFree, setWithFree] = useState<OrgClass[]>([]);
  const key = classes.map((c) => c.classId).join(",");

  useEffect(() => {
    let cancelled = false;
    if (!shareToken || !readProvider || !account || classes.length === 0) {
      setWithFree([]);
      return;
    }
    (async () => {
      try {
        const token = new ethers.Contract(shareToken, SHARE_TOKEN_ABI, readProvider);
        const out = await Promise.all(
          classes.map(async (c) => {
            try {
              const free: ethers.BigNumber = await token.freeBalanceOf(account, c.classId);
              return { ...c, free: Number(ethers.utils.formatUnits(free, 18)) };
            } catch {
              return { ...c, free: 0 };
            }
          }),
        );
        if (!cancelled) setWithFree(out);
      } catch {
        if (!cancelled) setWithFree([]);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareToken, readProvider, account, key, version]);

  return withFree;
}
