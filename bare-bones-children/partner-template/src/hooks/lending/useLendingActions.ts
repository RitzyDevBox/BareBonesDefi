// Real lifecycle actions for the lending market. Each is a direct EOA call to ShareLendingMarket
// (the user actions are NOT MTA-gated — msg.sender is the borrower/lender), with ERC20 approvals
// pulled inline before the deposit/principal/repay calls. Produces the SAME `LendingActions`
// interface the ported UI already calls, so the components are untouched.
import { useCallback, useMemo } from "react";
import { ethers } from "ethers";
import { useExecuteRawTx } from "../useExecuteRawTx";
import { useReadProvider } from "../useReadProvider";
import { useWalletProvider } from "../useWalletProvider";
import { useToastStore } from "../../components/Toasts/useToastStore";
import { ToastBehavior, ToastPosition, ToastType } from "../../components/Toasts/toast.types";
import { postListingMetadata } from "../../utils/api/lendingMetadataService";
import type { RawTx } from "../../utils/basicWalletUtils";
import type { Listing } from "../../components/Lending/lendingData";
import type { LendingActions } from "../../components/Lending/lendingShared";
import ShareLendingMarketABI from "../../abis/capTable/ShareLendingMarket.abi.json";
import ERC20ABI from "../../abis/ERC20.json";

const MARKET_ABI = ShareLendingMarketABI as ethers.ContractInterface;

export interface UseLendingActionsArgs {
  marketAddress: string;
  decimals: number;
  /** Active org slug (bytes32 hex) — only used by listCollateral (the org pledging collateral). */
  activeSlugBytes: string | null;
  getListing: (id: string) => Listing | undefined;
}

export function useLendingActions({
  marketAddress, decimals, activeSlugBytes, getListing,
}: UseLendingActionsArgs): LendingActions {
  const { chainId } = useWalletProvider();
  const readProvider = useReadProvider();
  const { showToast } = useToastStore();

  const market = useMemo(() => new ethers.utils.Interface(ShareLendingMarketABI as never), []);
  const erc20 = useMemo(() => new ethers.utils.Interface(ERC20ABI as never), []);

  // One generic raw-tx executor (approve + every market call go through it).
  const rawTx = useExecuteRawTx(
    (tx: RawTx, _label: string) => tx,
    (_tx: RawTx, label: string) => label,
  );

  const toBase = useCallback(
    (amount: number) => ethers.utils.parseUnits(String(amount), decimals),
    [decimals],
  );
  const toShares = (n: number) => ethers.utils.parseUnits(String(n), 18);
  const call = useCallback(
    (data: string, label: string) => rawTx({ to: marketAddress, data, value: undefined }, label),
    [rawTx, marketAddress],
  );
  const approve = useCallback(
    async (token: string, amount: ethers.BigNumber, label = "Payment token approved") => {
      const data = erc20.encodeFunctionData("approve", [marketAddress, amount]);
      return rawTx({ to: token, data, value: undefined }, label);
    },
    [erc20, marketAddress, rawTx],
  );

  // Resolve the on-chain identity carried on an adapted Listing.
  const slugOf = (l: Listing) => l.slugBytes as string;
  const listingIdOf = (l: Listing) => l.chainListingId as number;

  const note = (title: string, message: string, type: ToastType = ToastType.Info) =>
    showToast({ id: `lm-${Date.now()}`, title, message, type, behavior: ToastBehavior.AutoClose, position: ToastPosition.Top, durationMs: 4500 });

  // Resolve the org's payment token from the market (for approvals).
  const paymentTokenOf = useCallback(async (): Promise<string> => {
    const c = new ethers.Contract(marketAddress, MARKET_ABI, readProvider);
    return c.paymentToken();
  }, [marketAddress, readProvider]);

  return {
    postQuote: async (id, draft) => {
      const l = getListing(id);
      if (!l) return;
      const slug = slugOf(l);
      const lid = listingIdOf(l);
      const termSeconds = draft.termMonths * 30 * 86400;
      const expiry = Math.floor(Date.now() / 1000) + Math.max(1, draft.expiryDays) * 86400;
      if (l.requireDeposit && l.depositAmount > 0) {
        const token = await paymentTokenOf();
        const ok = await approve(token, toBase(l.depositAmount), "Good-faith deposit approved");
        if (!ok) return;
      }
      const mediator = draft.mediator && ethers.utils.isAddress(draft.mediator) ? draft.mediator : ethers.constants.AddressZero;
      const data = market.encodeFunctionData("postQuote", [slug, lid, toBase(draft.amount), draft.rateBps, termSeconds, expiry, mediator]);
      await call(data, "Quote posted");
    },

    withdrawQuote: async (id, qid) => {
      const l = getListing(id);
      const q = l?.quotes.find((x) => x.id === qid);
      if (!l || !q || q.chainQuoteId == null) return;
      await call(market.encodeFunctionData("withdrawQuote", [slugOf(l), listingIdOf(l), q.chainQuoteId]), "Quote withdrawn");
    },

    acceptQuote: async (id, qid) => {
      const l = getListing(id);
      const q = l?.quotes.find((x) => x.id === qid);
      if (!l || !q || q.chainQuoteId == null) return;
      await call(market.encodeFunctionData("acceptQuote", [slugOf(l), listingIdOf(l), q.chainQuoteId]), "Quote accepted · documents released");
    },

    declineQuote: async (id, qid) => {
      const l = getListing(id);
      const q = l?.quotes.find((x) => x.id === qid);
      if (!l || !q || q.chainQuoteId == null) return;
      await call(market.encodeFunctionData("rejectQuote", [slugOf(l), listingIdOf(l), q.chainQuoteId]), "Quote declined");
    },

    fundLoan: async (id) => {
      const l = getListing(id);
      if (!l || l.loanId == null) return;
      const matched = l.quotes.find((q) => q.status === "accepted");
      const principal = matched ? toBase(matched.amount) : toBase(l.wantAmount);
      const token = await paymentTokenOf();
      const ok = await approve(token, principal, "Principal approved");
      if (!ok) return;
      await call(market.encodeFunctionData("fundLoan", [slugOf(l), l.loanId]), "Loan funded · collateral locked");
    },

    repayLoan: async (id) => {
      const l = getListing(id);
      if (!l || l.loanId == null) return;
      const slug = slugOf(l);
      // Read live owed and approve a small buffer over it (interest accrues until the tx mines).
      let owed: ethers.BigNumber;
      try {
        const c = new ethers.Contract(marketAddress, MARKET_ABI, readProvider);
        owed = await c.amountOwed(slug, l.loanId, Math.floor(Date.now() / 1000));
      } catch {
        note("Couldn't read payoff", "Try again in a moment.", ToastType.Error);
        return;
      }
      const buffered = owed.mul(102).div(100);
      const token = await paymentTokenOf();
      const ok = await approve(token, buffered, "Payoff approved");
      if (!ok) return;
      await call(market.encodeFunctionData("repay", [slug, l.loanId]), "Loan repaid · shares unlocked");
    },

    foreclose: async (id) => {
      const l = getListing(id);
      if (!l || l.loanId == null) return;
      await call(market.encodeFunctionData("foreclose", [slugOf(l), l.loanId]), "Foreclosure executed");
    },

    forfeitDeposit: async (id) => {
      const l = getListing(id);
      if (!l) return;
      await call(market.encodeFunctionData("forfeitDeposit", [slugOf(l), listingIdOf(l)]), "Deposit forfeited to the platform");
    },

    listCollateral: async (draft) => {
      if (!activeSlugBytes) {
        note("No org selected", "Pick the borrowing organization first.", ToastType.Warn);
        return;
      }
      const classId = (draft as { classIdNum?: number }).classIdNum ?? 0;
      const termSeconds = draft.termMonths * 30 * 86400;
      const canonical = JSON.stringify({
        asset: draft.asset, assetSub: draft.assetSub, assetType: draft.assetType, teaser: {
          lien: draft.lien, title: draft.title, rented: draft.rented, rentRate: draft.rentRate,
          occupancy: draft.occupancy, noi: draft.noi, appraisal: draft.appraisal,
        }, docLink: draft.docLink,
      });
      const metadataHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(canonical));
      const data = market.encodeFunctionData("listCollateral", [
        activeSlugBytes, classId, toShares(draft.pledgedShares), toBase(draft.wantAmount),
        draft.maxRateBps, termSeconds, metadataHash, draft.requireDeposit,
        draft.requireDeposit ? toBase(draft.depositAmount) : 0,
      ]);
      const tx = await call(data, "Collateral listed · shares pledged");
      if (!tx) return;
      // Parse the Listed event → listingId, then persist the off-chain metadata.
      try {
        const receipt = await tx.wait();
        let listingId: number | null = null;
        for (const log of receipt.logs) {
          try {
            const parsed = market.parseLog(log);
            if (parsed.name === "Listed") { listingId = Number(parsed.args.listingId); break; }
          } catch { /* not ours */ }
        }
        if (listingId != null && chainId != null) {
          await postListingMetadata({
            chainId, marketAddress, slug: activeSlugBytes, listingId, metadataHash,
            asset: draft.asset, assetSub: draft.assetSub, assetType: draft.assetType,
            teaser: { lien: draft.lien, title: draft.title, rented: draft.rented, rentRate: draft.rentRate, occupancy: draft.occupancy, noi: draft.noi, appraisal: draft.appraisal },
            docLink: draft.docLink,
          });
        }
      } catch (e) {
        note("Listing on-chain, details not saved", e instanceof Error ? e.message : "Sign in and edit the listing to add its details.", ToastType.Warn);
      }
    },

    release: async (id, choice) => {
      const l = getListing(id);
      if (!l || l.loanId == null) return;
      const slug = slugOf(l);
      const borrower = l.borrower.address;
      const lender = l.loan?.lender.address ?? borrower;
      if (choice === "mediator") {
        await call(market.encodeFunctionData("mediatorRelease", [slug, l.loanId, borrower]), "Mediator release executed");
      } else {
        const to = choice === "mutual-lender" ? lender : borrower;
        await call(market.encodeFunctionData("mutualRelease", [slug, l.loanId, to]), "Release approval recorded");
      }
    },
  };
}
