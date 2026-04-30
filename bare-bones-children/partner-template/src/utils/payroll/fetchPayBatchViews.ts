import { ethers } from "ethers";
import PayrollManagerABI from "../../abis/paymentPipelines/PayrollManager.abi.json";
import type { PayeeDefaultsView } from "./fetchPayrollViews";
import { orgSlugFor } from "./orgSlug";

const DEFAULT_PAGE_SIZE = 100;

function makePayrollManager(
  provider: ethers.providers.Provider,
  payrollManagerAddress: string
) {
  return new ethers.Contract(payrollManagerAddress, PayrollManagerABI as any, provider);
}

function getFromOverride(from?: string) {
  return from ? ({ from } as ethers.CallOverrides) : undefined;
}

function toSlugBytes(slug: string) {
  return orgSlugFor(slug);
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

export async function fetchPayBatchCodes(
  provider: ethers.providers.Provider,
  payrollManagerAddress: string,
  slug: string,
  from?: string
): Promise<string[]> {
  const contract = makePayrollManager(provider, payrollManagerAddress);
  const slugBytes = toSlugBytes(slug);
  const overrides = getFromOverride(from);

  const codes = overrides
    ? await contract.getPayBatchCodes(slugBytes, overrides)
    : await contract.getPayBatchCodes(slugBytes);

  return (codes ?? []) as string[];
}

export async function fetchPayBatchPayeesWithDefaults(
  provider: ethers.providers.Provider,
  payrollManagerAddress: string,
  slug: string,
  payBatchCode: string,
  pageSize = DEFAULT_PAGE_SIZE,
  from?: string
): Promise<PayeeDefaultsView[]> {
  const contract = makePayrollManager(provider, payrollManagerAddress);
  const slugBytes = toSlugBytes(slug);
  const overrides = getFromOverride(from);

  return readAllPages<PayeeDefaultsView>(
    (cursor, limit) =>
      overrides
        ? contract.getPayBatchPayeesWithDefaults(slugBytes, payBatchCode, cursor, limit, overrides)
        : contract.getPayBatchPayeesWithDefaults(slugBytes, payBatchCode, cursor, limit),
    pageSize
  );
}
