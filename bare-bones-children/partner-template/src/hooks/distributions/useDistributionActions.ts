// Write actions for cap-table distributions (DistributionManager + DistributionTreasury).
//
// Funds live in the org's DistributionTreasury (the org `deposit`s ahead of time, mirroring payroll).
//  • create  — ensure the org's treasury holds the pool (approve → deposit the shortfall), then open
//    the distribution via `MTA.execute(slug, manager, create(slug, shareToken, label, classIds, rates,
//    amount))`. No `funder` — the money is the org's, already in the treasury.
//  • processChunk — permissionless keeper push; a plain direct call.
//  • cancel — MTA-gated; just unlocks the classes (no refund — unspent funds never left the treasury).
//  • withdraw — MTA-gated; recover unused org funds from the treasury.
//
// Amounts/rates are scaled with the payment token's real decimals (usePaymentDecimals).

import { useCallback, useMemo } from "react";
import { ethers } from "ethers";
import DistributionManagerABI from "../../abis/capTable/DistributionManager.abi.json";
import DistributionTreasuryABI from "../../abis/capTable/DistributionTreasury.abi.json";
import MultiTenantAuthABI from "../../abis/auth/MultiTenantAuth.abi.json";
import { useExecuteRawTx } from "../useExecuteRawTx";
import { useWalletProvider } from "../useWalletProvider";
import { useReadProvider } from "../useReadProvider";
import { getBareBonesConfiguration } from "../../constants/misc";
import { orgSlugFor } from "../../utils/payroll/orgSlug";
import { usePaymentDecimals } from "./usePaymentDecimals";

const ZERO = ethers.constants.AddressZero;
const ERC20_APPROVE_ABI = ["function approve(address spender, uint256 amount) returns (bool)"];

/** Phases of the create flow, surfaced to the modal so the user sees approve → fund → open. */
export type CreateStep = "approving" | "funding" | "opening" | "done";

export function useDistributionActions(slug: string, shareTokenAddress: string | null) {
  const { chainId } = useWalletProvider();
  const readProvider = useReadProvider();
  const decimals = usePaymentDecimals();
  const config = useMemo(() => (chainId != null ? getBareBonesConfiguration(chainId) : null), [chainId]);

  const dmIface = useMemo(() => new ethers.utils.Interface(DistributionManagerABI as any), []);
  const dtIface = useMemo(() => new ethers.utils.Interface(DistributionTreasuryABI as any), []);
  const mtaIface = useMemo(() => new ethers.utils.Interface(MultiTenantAuthABI as any), []);
  const erc20Iface = useMemo(() => new ethers.utils.Interface(ERC20_APPROVE_ABI), []);

  const slugBytes = useMemo(() => (slug ? orgSlugFor(slug) : ZERO), [slug]);

  function dmAddress(): string {
    const a = config?.distributionManagerAddress;
    if (!a || a === ZERO) throw new Error("DistributionManager address not configured for this chain.");
    return a;
  }

  const mtaExecuteTx = useCallback(
    (innerData: string) => {
      if (!config?.multiTenantAuthAddress || config.multiTenantAuthAddress === ZERO) {
        throw new Error("MultiTenantAuth address not configured for this chain.");
      }
      return {
        to: config.multiTenantAuthAddress,
        data: mtaIface.encodeFunctionData("execute", [slugBytes, dmAddress(), innerData, "0x"]),
        value: undefined,
      };
    },
    [config, mtaIface, slugBytes],
  );

  // raw txs
  const rawApprove = useExecuteRawTx(
    (token: string, spender: string, amount: string) => ({
      to: token,
      data: erc20Iface.encodeFunctionData("approve", [spender, amount]),
      value: undefined,
    }),
    () => "Payment token approved",
  );

  const rawDeposit = useExecuteRawTx(
    (treasury: string, amount: string) => ({
      to: treasury,
      data: dtIface.encodeFunctionData("deposit", [slugBytes, amount]),
      value: undefined,
    }),
    () => "Treasury funded",
  );

  const rawCreate = useExecuteRawTx(
    (shareToken: string, label: string, classIds: number[], rates: string[], amount: string) =>
      mtaExecuteTx(dmIface.encodeFunctionData("create", [slugBytes, shareToken, label, classIds, rates, amount])),
    () => "Distribution opened",
  );

  /**
   * Fund (if needed) + open a distribution.
   * @param classIds   on-chain class ids the distribution targets
   * @param rates      per-share rate per class, as whole payment-token units per whole share
   * @param poolWhole  total pool, as whole payment-token units
   * @param name       display name — stored on-chain as a bytes32 (UTF-8, ≤31 bytes)
   */
  const createDistribution = useCallback(
    async (
      classIds: number[],
      rates: string[],
      poolWhole: string,
      name: string,
      onStep?: (s: CreateStep) => void,
    ): Promise<boolean> => {
      if (!shareTokenAddress) throw new Error("This org has no cap table (ShareToken) yet.");
      const paymentToken = config?.mockPaymentTokenAddress;
      if (!paymentToken || paymentToken === ZERO) throw new Error("Payment token not configured for this chain.");
      if (!readProvider) throw new Error("No provider.");

      const amount = ethers.utils.parseUnits(poolWhole || "0", decimals);
      const scaledRates = rates.map((r) => ethers.utils.parseUnits(r || "0", decimals).toString());
      const label = ethers.utils.formatBytes32String((name || "").slice(0, 31));

      // Resolve the org's treasury + how much (if any) we still need to deposit.
      const dm = new ethers.Contract(dmAddress(), DistributionManagerABI as any, readProvider);
      const treasury: string = await dm.treasury();
      const treasuryC = new ethers.Contract(treasury, DistributionTreasuryABI as any, readProvider);
      const balance: ethers.BigNumber = await treasuryC.balanceOf(slugBytes);
      const shortfall = amount.gt(balance) ? amount.sub(balance) : ethers.constants.Zero;

      // 1) top up the org's distribution pool by the shortfall (approve treasury → deposit).
      //    Skipped entirely when the treasury already holds enough (shortfall == 0).
      if (shortfall.gt(0)) {
        onStep?.("approving");
        const approveTx = await rawApprove(paymentToken, treasury, shortfall.toString());
        if (!approveTx) return false;
        await approveTx.wait();
        onStep?.("funding");
        const depositTx = await rawDeposit(treasury, shortfall.toString());
        if (!depositTx) return false;
        await depositTx.wait();
      }

      // 2) open the distribution against the treasury balance (MTA-gated)
      onStep?.("opening");
      const createTx = await rawCreate(shareTokenAddress, label, classIds, scaledRates, amount.toString());
      if (!createTx) return false;
      await createTx.wait();
      onStep?.("done");
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shareTokenAddress, config, readProvider, decimals, rawApprove, rawDeposit, rawCreate, slugBytes],
  );

  // permissionless direct keeper call
  const processChunk = useExecuteRawTx(
    (id: number, limit: number) => ({
      to: dmAddress(),
      data: dmIface.encodeFunctionData("processChunk", [id, limit]),
      value: undefined,
    }),
    () => "Batch processed",
  );

  // MTA-gated: cancel (just unlocks) + withdraw unused org funds
  const cancel = useExecuteRawTx(
    (id: number) => mtaExecuteTx(dmIface.encodeFunctionData("cancel", [slugBytes, id])),
    () => "Distribution cancelled",
  );

  const withdraw = useExecuteRawTx(
    (to: string, amountWhole: string) =>
      mtaExecuteTx(
        dmIface.encodeFunctionData("withdraw", [
          slugBytes,
          to,
          ethers.utils.parseUnits(amountWhole || "0", decimals).toString(),
        ]),
      ),
    () => "Funds withdrawn",
  );

  return { createDistribution, processChunk, cancel, withdraw };
}
