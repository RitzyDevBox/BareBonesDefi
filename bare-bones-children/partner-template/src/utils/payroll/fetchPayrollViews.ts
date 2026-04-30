import { ethers } from "ethers";
import PayrollManagerABI from "../../abis/paymentPipelines/PayrollManager.abi.json";
import { DEFAULT_PAY_BATCH_CODE } from "../../constants/payroll";
import { orgSlugFor } from "./orgSlug";

const DEFAULT_PAGE_SIZE = 100;

export interface OrganizationEarningsCodeView {
  earningsCodeId: ethers.BigNumber;
  isActive: boolean;
  name: string;
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
  name?: string;
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
  return orgSlugFor(slug);
}

export async function fetchOrganizationEarningsCodes(
  provider: ethers.providers.Provider,
  payrollManagerAddress: string,
  slug: string,
  pageSize = DEFAULT_PAGE_SIZE
): Promise<OrganizationEarningsCodeView[]> {
  const contract = makePayrollManager(provider, payrollManagerAddress);
  const slugBytes = toSlugBytes(slug);

  return readAllPages<OrganizationEarningsCodeView>(
    (cursor, limit) =>
      contract.getOrganizationEarningsCodes(slugBytes, cursor, limit),
    pageSize
  );
}

export async function fetchPayeesWithDefaults(
  provider: ethers.providers.Provider,
  payrollManagerAddress: string,
  slug: string,
  payBatchCode: string = DEFAULT_PAY_BATCH_CODE,
  pageSize = DEFAULT_PAGE_SIZE
): Promise<PayeeDefaultsView[]> {
  const contract = makePayrollManager(provider, payrollManagerAddress);
  const slugBytes = toSlugBytes(slug);

  return readAllPages<PayeeDefaultsView>(
    (cursor, limit) =>
      contract.getPayBatchPayeesWithDefaults(slugBytes, payBatchCode, cursor, limit),
    pageSize
  );
}

export async function fetchPayrollPayeesWithRunData(
  provider: ethers.providers.Provider,
  payrollManagerAddress: string,
  slug: string,
  payrollId: ethers.BigNumberish,
  pageSize = DEFAULT_PAGE_SIZE
): Promise<PayrollPayeeRunDataView[]> {
  const contract = makePayrollManager(provider, payrollManagerAddress);
  const slugBytes = toSlugBytes(slug);

  const allRows: PayrollPayeeRunDataView[] = [];
  let cursor = 0;
  let remaining = 1;

  while (remaining > 0) {
    const page = await contract.getPayrollPage(slugBytes, payrollId, cursor, pageSize);

    const rows: PayrollPayeeRunDataView[] = (page?.payees ?? page?.[0] ?? []) as PayrollPayeeRunDataView[];
    const nextRemaining: ethers.BigNumber = page?.remaining ?? page?.[1] ?? ethers.BigNumber.from(0);
    const nextCursor: ethers.BigNumber = page?.nextCursor ?? page?.[2] ?? ethers.BigNumber.from(cursor);

    allRows.push(...rows);

    const nextRemainingNumber = Number(nextRemaining.toString());
    const nextCursorNumber = Number(nextCursor.toString());

    if (nextRemainingNumber <= 0 || rows.length === 0) {
      break;
    }

    remaining = nextRemainingNumber;
    cursor = nextCursorNumber;
  }

  return allRows;
}

export interface PayrollGrossView {
  payeeId: ethers.BigNumber;
  gross: ethers.BigNumber;
}

export async function fetchPayrollGrosses(
  provider: ethers.providers.Provider,
  payrollManagerAddress: string,
  slug: string,
  payrollId: ethers.BigNumberish,
  pageSize = DEFAULT_PAGE_SIZE
): Promise<PayrollGrossView[]> {
  const contract = makePayrollManager(provider, payrollManagerAddress);
  const slugBytes = toSlugBytes(slug);

  const allRows: PayrollGrossView[] = [];
  let cursor = 0;
  let hasMore = true;

  while (hasMore) {
    const page = await contract.getPayrollGrosses(slugBytes, payrollId, cursor, pageSize);

    const rows: PayrollGrossView[] = (page?.rows ?? page?.[0] ?? []) as PayrollGrossView[];
    const nextCursor: ethers.BigNumber = page?.nextCursor ?? page?.[1] ?? ethers.BigNumber.from(0);
    const more: boolean = Boolean(page?.hasMore ?? page?.[2] ?? false);

    allRows.push(...rows);

    if (!more || rows.length === 0) {
      break;
    }

    cursor = Number(nextCursor.toString());
    hasMore = more;
  }

  return allRows;
}

export async function fetchLatestPayrollId(
  provider: ethers.providers.Provider,
  payrollManagerAddress: string,
  slug: string
): Promise<number | null> {
  const contract = makePayrollManager(provider, payrollManagerAddress);
  const slugBytes = toSlugBytes(slug);
  const orgInfo = await contract.slugToOrgInfoMap(slugBytes);
  const nextPayrollId: ethers.BigNumber = orgInfo.nextPayrollId;

  if (!nextPayrollId || nextPayrollId.isZero()) {
    return null;
  }

  const candidate = nextPayrollId.sub(1);

  try {
    const payrollInfo = await contract.getPayrollInfo(slugBytes, candidate);
    
    // getPayrollInfo returns a PayrollRun struct; check the status property
    const status = payrollInfo?.status ?? payrollInfo?.[0];
    if (status === undefined) {
      return null;
    }
    return candidate.toNumber();
  } catch {
    return null;
  }
}
