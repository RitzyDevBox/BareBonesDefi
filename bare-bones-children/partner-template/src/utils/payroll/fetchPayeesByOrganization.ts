import { ethers } from "ethers";
import type { PayeeModel } from "../../models/payments";
import { fetchMtaState } from "../graph/mtaGraphService";

/// @notice "Payees" is now a view over MTA's unified member roster — every
/// member is implicitly a payee, regardless of accountType / role. We pull
/// from the subgraph instead of PayrollManager because the on-chain payee
/// registry has been merged into MTA: PayrollManager.getPayee(id) still
/// exists for back-compat but the source of truth for member identity is
/// MTA. The `provider` + `payrollManagerAddress` args are kept for signature
/// stability with callers that haven't been migrated yet, but only `chainId`
/// + `slugBytes` are actually used.
export async function fetchPayeesByOrganization(
  _provider: ethers.providers.Provider,
  _payrollManagerAddress: string,
  slugBytes: string,
  chainId?: number,
): Promise<PayeeModel[]> {
  if (chainId == null) return [];

  const graph = await fetchMtaState(chainId, slugBytes);
  // Map every member into the existing PayeeModel shape so downstream
  // components (PayeesView, payroll editors) keep working without changes.
  // The two status axes (membershipStatus + paymentStatus) collapse back to
  // the legacy 3-value PayeeStatus the UI already renders:
  //   2 = Terminated (membership), 1 = Deactivated (payment), 0 = Active
  return graph.members
    .filter((m) => m.memberId !== "0" && m.memberId !== "")
    .map((m) => {
      let collapsed = 0;
      if ((m.membershipStatus ?? 0) === 1)      collapsed = 2; // Terminated
      else if ((m.paymentStatus ?? 0) === 1)    collapsed = 1; // Deactivated
      return {
        payeeId: ethers.BigNumber.from(m.memberId),
        organizationSlug: slugBytes,
        nameSlug: m.nameSlug ?? "",
        paymentAddress: m.wallet,
        params: "0x",
        status: collapsed,
      };
    });
}
