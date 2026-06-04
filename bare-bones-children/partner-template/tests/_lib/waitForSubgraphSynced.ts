const GRAPHQL_URL =
  process.env.PLAYWRIGHT_SUBGRAPH_URL ??
  "http://localhost:8000/subgraphs/name/secure-value-reserve-local";
const RPC_URL = process.env.ANVIL_RPC_URL ?? "http://127.0.0.1:8545";

/** Wait until the subgraph has indexed up to (within 1 block of) the chain
 *  head, with no indexing errors. After a graph reset the subgraph re-indexes
 *  from scratch; loading the dapp before it's caught up leaves the org-loading
 *  UI stuck in a spinner (the switcher never becomes actionable). Call this
 *  BEFORE the first page load on a freshly-reset chain. */
export async function waitForSubgraphSynced(timeoutMs = 90_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let last = "(no response)";
  while (Date.now() < deadline) {
    try {
      const headRes = await fetch(RPC_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] }),
        signal: AbortSignal.timeout(2_000),
      });
      const head = parseInt((await headRes.json()).result, 16);

      const sgRes = await fetch(GRAPHQL_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: "{ _meta { block { number } hasIndexingErrors } }" }),
        signal: AbortSignal.timeout(2_000),
      });
      const meta = ((await sgRes.json()) as {
        data?: { _meta?: { block?: { number?: number }; hasIndexingErrors?: boolean } };
      }).data?._meta;
      const sg = meta?.block?.number ?? -1;
      last = `head=${head} subgraph=${sg} err=${meta?.hasIndexingErrors}`;
      if (meta && !meta.hasIndexingErrors && Number.isFinite(head) && sg >= head - 1) return;
    } catch (err) {
      last = (err as Error).message;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`subgraph not synced to head within ${timeoutMs}ms; last=${last}`);
}
