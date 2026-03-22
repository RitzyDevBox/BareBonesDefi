import { ethers } from "ethers";
import OnboardingManagerABI from "../../abis/paymentPipelines/OnboardingManager.abi.json";
import type { EmployeeModel } from "../../models/payments";

export async function fetchEmployeesByOrganization(
  provider: ethers.providers.Provider,
  onboardingAddress: string,
  slugBytes: string
): Promise<EmployeeModel[]> {
  const contract = new ethers.Contract(
    onboardingAddress,
    OnboardingManagerABI as any,
    provider
  );

  const total = await contract.totalEmployeesInOrganization(slugBytes);
  const employeeIds = await contract.getEmployeesByOrganizationPaged(
    slugBytes,
    0,
    total.toNumber()
  );

  const employeeList = await Promise.all(
    employeeIds.map((id: ethers.BigNumber) => contract.getEmployee(id))
  );

  return employeeList as EmployeeModel[];
}
