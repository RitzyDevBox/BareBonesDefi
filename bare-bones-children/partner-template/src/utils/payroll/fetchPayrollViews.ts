import { ethers } from "ethers";
import PayrollManagerABI from "../../abis/paymentPipelines/PayrollManager.abi.json";

const DEFAULT_PAGE_SIZE = 100;

export interface OrganizationEarningsCodeView {
  earningsCodeId: ethers.BigNumber;
  isActive: boolean;
  rule: string;
  config: string;
}

export interface PayeeDefaultEarningView {
  earningsCodeId: ethers.BigNumber;
  isActive: boolean;
  rule: string;
  rate: ethers.BigNumber;
  config: string;
  runData: string;
}

export interface PayeeDefaultsView {
  payeeId: ethers.BigNumber;
  paymentAddress: string;
  payeeStatus: number;
  earnings: PayeeDefaultEarningView[];
}

export interface PayrollResolvedEarningView {
  source: number;
  earningsCodeId: ethers.BigNumber;
  rule: string;
  rate: ethers.BigNumber;
  config: string;
  runData: string;
}

export interface PayrollPayeeRunDataView {
  payeeId: ethers.BigNumber;
  paymentAddress: string;
  payeeStatus: number;
  earnings: PayrollResolvedEarningView[];
}

function makePayrollManager(
  provider: ethers.providers.Provider,
  payrollManagerAddress: string
) {
  return new ethers.Contract(payrollManagerAddress, PayrollManagerABI as any, provider);
}

function getFromOverride(from?: string) {
  return from ? ({ from } as ethers.CallOverrides) : undefined;
}

function normalizePagedResult<T>(result: any): { rows: T[]; hasMore: boolean } {
  return {
    rows: (result?.rows ?? result?.[0] ?? []) as T[],
    hasMore: Boolean(result?.hasMore ?? result?.[1]),
  };
}

async function readAllPages<T>(
  readPage: (cursor: number, limit: number) => Promise<any>,
  pageSize = DEFAULT_PAGE_SIZE
): Promise<T[]> {
  const allRows: T[] = [];
  let cursor = 0;
  let hasMore = true;

  while (hasMore) {
    const pageResult = await readPage(cursor, pageSize);
    const { rows, hasMore: nextHasMore } = normalizePagedResult<T>(pageResult);

    allRows.push(...rows);

    if (!nextHasMore || rows.length === 0) {
      break;
    }

    cursor += rows.length;
    hasMore = nextHasMore;
  }

  return allRows;
}

function toSlugBytes(slug: string) {
  return ethers.utils.formatBytes32String(slug);
}

export async function fetchOrganizationEarningsCodes(
  provider: ethers.providers.Provider,
  payrollManagerAddress: string,
  slug: string,
  pageSize = DEFAULT_PAGE_SIZE,
  from?: string
): Promise<OrganizationEarningsCodeView[]> {
  const contract = makePayrollManager(provider, payrollManagerAddress);
  const slugBytes = toSlugBytes(slug);
  const overrides = getFromOverride(from);

  return readAllPages<OrganizationEarningsCodeView>(
    (cursor, limit) =>
      overrides
        ? contract.getOrganizationEarningsCodes(slugBytes, cursor, limit, overrides)
        : contract.getOrganizationEarningsCodes(slugBytes, cursor, limit),
    pageSize
  );
}

export async function fetchPayeesWithDefaults(
  provider: ethers.providers.Provider,
  payrollManagerAddress: string,
  slug: string,
  pageSize = DEFAULT_PAGE_SIZE,
  from?: string
): Promise<PayeeDefaultsView[]> {
  const contract = makePayrollManager(provider, payrollManagerAddress);
  const slugBytes = toSlugBytes(slug);
  const overrides = getFromOverride(from);

  return readAllPages<PayeeDefaultsView>(
    (cursor, limit) =>
      overrides
        ? contract.getEmployeesWithDefaults(slugBytes, cursor, limit, overrides)
        : contract.getEmployeesWithDefaults(slugBytes, cursor, limit),
    pageSize
  );
}

export async function fetchPayrollPayeesWithRunData(
  provider: ethers.providers.Provider,
  payrollManagerAddress: string,
  slug: string,
  payrollId: ethers.BigNumberish,
  pageSize = DEFAULT_PAGE_SIZE,
  from?: string
): Promise<PayrollPayeeRunDataView[]> {
  const contract = makePayrollManager(provider, payrollManagerAddress);
  const slugBytes = toSlugBytes(slug);
  const overrides = getFromOverride(from);

  return readAllPages<PayrollPayeeRunDataView>(
    (cursor, limit) =>
      overrides
        ? contract.getPayrollEmployeesWithRunData(slugBytes, payrollId, cursor, limit, overrides)
        : contract.getPayrollEmployeesWithRunData(slugBytes, payrollId, cursor, limit),
    pageSize
  );
}

export async function fetchLatestPayrollId(
  provider: ethers.providers.Provider,
  payrollManagerAddress: string,
  slug: string,
  from?: string
): Promise<number | null> {
  const contract = makePayrollManager(provider, payrollManagerAddress);
  const slugBytes = toSlugBytes(slug);
  const overrides = getFromOverride(from);
  const orgInfo = overrides
    ? await contract.slugToOrgInfoMap(slugBytes, overrides)
    : await contract.slugToOrgInfoMap(slugBytes);
  const nextPayrollId: ethers.BigNumber = orgInfo.nextPayrollId;

  if (!nextPayrollId || nextPayrollId.isZero()) {
    return null;
  }

  const candidate = nextPayrollId.sub(1);

  try {
    if (overrides) {
      await contract.getPayrollStatus(slugBytes, candidate, overrides);
    } else {
      await contract.getPayrollStatus(slugBytes, candidate);
    }
    return candidate.toNumber();
  } catch {
    return null;
  }
}
