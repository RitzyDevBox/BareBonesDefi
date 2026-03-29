import { ethers } from "ethers";
import OnboardingManagerABI from "../../abis/paymentPipelines/OnboardingManager.abi.json";
import type { PayeeModel } from "../../models/payments";

export async function fetchPayeesByOrganization(
  provider: ethers.providers.Provider,
  onboardingAddress: string,
  slugBytes: string
): Promise<PayeeModel[]> {
  const contract = new ethers.Contract(
    onboardingAddress,
    OnboardingManagerABI as any,
    provider
  );

  const total = await contract.totalPayeesInOrganization(slugBytes);
  if (!total || total.isZero()) {
    return [];
  }

  const payeeIds = await contract.getPayeesByOrganizationPaged(
    slugBytes,
    0,
    total.toNumber()
  );

  const payees = await Promise.all(
    payeeIds.map((id: ethers.BigNumber) => contract.getPayee(id))
  );

  return payees.map((payee: any) => ({
    ...payee,
    payeeId: payee.payeeId,
  })) as PayeeModel[];
}
