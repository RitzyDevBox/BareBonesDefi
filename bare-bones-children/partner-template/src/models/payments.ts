import type { BigNumber } from "ethers";

export interface OrganizationModel {
  slug?: string;
  owner: string;
  exists: boolean;
}

export interface PayeeModel {
  payeeId: BigNumber;
  organizationSlug: string;
  role: string;
  paymentAddress: string;
  params: string;
  status: number;
}
