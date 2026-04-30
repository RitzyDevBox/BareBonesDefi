import type { BigNumber } from "ethers";

export interface OrganizationModel {
  slug?: string;
  owner: string;
  exists: boolean;
}

export interface PayeeModel {
  payeeId: BigNumber;
  organizationSlug: string;
  /**
   * Per-org unique handle for the payee. Used to be `role`; renamed in the
   * payroll-pipeline rework to make uniqueness semantics explicit.
   */
  nameSlug: string;
  paymentAddress: string;
  params: string;
  status: number;
}
