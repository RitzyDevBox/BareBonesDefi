// Loads an org's full cap-table state from its on-chain ShareToken (the multi-class
// equity register). Resolves the address via shareTokenResolver, then reads classes,
// per-class holders, and vested/issued balances. Re-fetches on every TxRefresh bump so
// writes (issue / transfer / clawback / claim) reflect immediately. Holder names are
// joined from the MTA member registry passed in by the page.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ethers } from "ethers";
import ShareTokenABI from "../../abis/capTable/ShareToken.abi.json";
import { useReadProvider } from "../useReadProvider";
import { useWalletProvider } from "../useWalletProvider";
import { useTxRefresh } from "../../providers/TxRefreshProvider";
import { getBareBonesConfiguration } from "../../constants/misc";
import type { Member } from "../../types/members";
import {
  type CapClass,
  type CapHolder,
  type CapTableState,
  type ClassParams,
  ClassStatus,
  EMPTY_CAP_TABLE_STATE,
  classColor,
} from "./capTableTypes";
import { resolveOrgShareToken } from "./shareTokenResolver";
// Shared scaling — the contract never scales (stores raw 18-dec base units); the frontend always
// does. `formatTokens` = base units → whole-token display. Reused across all cap-table surfaces.
import { formatTokens as toTokens } from "../../components/CapTable/capTableHelpers";

function toNum(v: ethers.BigNumberish): number {
  return Number(ethers.BigNumber.from(v).toString());
}

function shortAddr(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function roleLabelForType(accountType: string): string {
  switch (accountType.toLowerCase()) {
    case "member":
      return "Team";
    case "investor":
      return "Investor";
    case "authorizeduser":
      return "Advisor / external";
    default:
      return "Shareholder";
  }
}

function decodeClassParams(raw: any): ClassParams {
  return {
    name: raw.name,
    voteWeightBps: Number(raw.voteWeightBps),
    transferLockDuration: Number(raw.transferLockDuration),
    transferGate: raw.transferGate,
    payoutPriority: Number(raw.payoutPriority),
    distributionWeightBps: Number(raw.distributionWeightBps),
    distributionPolicy: Number(raw.distributionPolicy),
    authorizedCap: ethers.BigNumber.from(raw.authorizedCap).toString(),
    excludeFromFullyDiluted: Boolean(raw.excludeFromFullyDiluted),
    excludeFromVotingTotal: Boolean(raw.excludeFromVotingTotal),
    unvestedVotes: Boolean(raw.unvestedVotes),
    requiresLiquidityEvent: Boolean(raw.requiresLiquidityEvent),
    transferPolicy: raw.transferPolicy,
    voteStrategy: raw.voteStrategy,
    defaultTerms: {
      vestKind: Number(raw.defaultTerms.vestKind),
      vestCliff: Number(raw.defaultTerms.vestCliff),
      vestDuration: Number(raw.defaultTerms.vestDuration),
      vestPeriod: Number(raw.defaultTerms.vestPeriod),
      chunkAmount: ethers.BigNumber.from(raw.defaultTerms.chunkAmount).toString(),
      vestingStrategy: raw.defaultTerms.vestingStrategy,
    },
  };
}

async function loadCapTable(
  st: ethers.Contract,
  shareTokenAddress: string,
  membersByAddr: Map<string, Member>,
): Promise<Omit<CapTableState, "loading" | "error">> {
  const classCount = toNum(await st.classCount());

  const classes: CapClass[] = [];
  const holders: CapHolder[] = [];

  for (let classId = 0; classId < classCount; classId++) {
    const [rawParams, statusRaw, totalIssuedRaw, reservedRaw, holderAddrs] = await Promise.all([
      st.classParams(classId),
      st.classStatus(classId),
      st.totalIssued(classId),
      st.reservedPool(classId),
      st.holdersOf(classId),
    ]);
    const params = decodeClassParams(rawParams);
    const totalIssued = toTokens(totalIssuedRaw);
    const reservedPool = toTokens(reservedRaw);

    classes.push({
      classId,
      params,
      status: Number(statusRaw) as ClassStatus,
      totalIssued,
      reservedPool,
      color: classColor(classId),
      isPool: reservedPool > 0 && totalIssued === 0,
    });

    const addrs: string[] = holderAddrs;
    const balances = await Promise.all(
      addrs.map((addr) =>
        Promise.all([st.balanceOf(addr, classId), st.vestedBalanceOf(addr, classId)]),
      ),
    );
    addrs.forEach((addr, i) => {
      const shares = toTokens(balances[i][0]);
      if (shares === 0) return;
      const member = membersByAddr.get(addr.toLowerCase());
      holders.push({
        id: `${addr.toLowerCase()}-${classId}`,
        address: addr,
        classId,
        shares,
        vested: toTokens(balances[i][1]),
        name: member?.name ?? shortAddr(addr),
        initials: member?.initials ?? addr.slice(2, 4).toUpperCase(),
        avatarHue: member?.avatarHue ?? (parseInt(addr.slice(2, 6), 16) % 360),
        type: member ? String(member.accountType) : "holder",
        role: member ? roleLabelForType(String(member.accountType)) : "Shareholder",
      });
    });
  }

  const fullyDiluted = toTokens(await st.fullyDilutedShares());
  const issuedTotal = holders.reduce((s, h) => s + h.shares, 0);
  const vestedTotal = holders.reduce((s, h) => s + h.vested, 0);

  return { hasTable: true, shareTokenAddress, classes, holders, fullyDiluted, issuedTotal, vestedTotal };
}

export function useCapTable(slug: string, owner: string | null | undefined, members: Member[]) {
  const readProvider = useReadProvider();
  const { chainId } = useWalletProvider();
  const { version } = useTxRefresh();
  const [state, setState] = useState<CapTableState>(EMPTY_CAP_TABLE_STATE);
  const reqId = useRef(0);

  const membersByAddr = useMemo(() => {
    const m = new Map<string, Member>();
    for (const member of members) {
      if (member.wallet?.address) m.set(member.wallet.address.toLowerCase(), member);
    }
    return m;
  }, [members]);

  const refresh = useCallback(async () => {
    if (!readProvider || chainId == null || !slug) {
      setState(EMPTY_CAP_TABLE_STATE);
      return;
    }
    const id = ++reqId.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      // Primary: the cap table is the DAO token (formation path). Fall back to the standalone
      // resolver (localStorage record / subgraph) for cap tables created outside formation.
      const cfg = getBareBonesConfiguration(chainId);
      const address = await resolveOrgShareToken(readProvider, chainId, slug, owner, {
        payrollManagerAddress: cfg.payrollManagerAddress,
      });
      if (!address) {
        if (id === reqId.current) setState({ ...EMPTY_CAP_TABLE_STATE, hasTable: false });
        return;
      }
      const st = new ethers.Contract(address, ShareTokenABI as ethers.ContractInterface, readProvider);
      const loaded = await loadCapTable(st, address, membersByAddr);
      if (id === reqId.current) setState({ ...loaded, loading: false, error: null });
    } catch (e) {
      if (id === reqId.current) {
        setState((s) => ({
          ...s,
          loading: false,
          error: e instanceof Error ? e.message : "Failed to load cap table",
        }));
      }
    }
  }, [readProvider, chainId, slug, owner, membersByAddr]);

  useEffect(() => {
    void refresh();
  }, [refresh, version]);

  return { state, refresh };
}
