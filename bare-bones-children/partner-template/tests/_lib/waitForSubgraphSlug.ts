import { ethers } from "ethers";

const GRAPHQL_URL =
  process.env.PLAYWRIGHT_SUBGRAPH_URL ??
  "http://localhost:8000/subgraphs/name/secure-value-reserve-local";

/** Poll the subgraph until the given org slug has indexed (slugConfig +
 *  at least one member). The frontend's role check (useMtaState) reads
 *  this same data and decides "denied" on the first response — there's no
 *  re-fetch on subgraph catchup — so the test must wait for indexing
 *  before triggering the role-check render path (i.e. before SIWE). */
export async function waitForSubgraphSlug(
  orgSlug: string,
  timeoutMs: number = 30_000,
): Promise<void> {
  const slugBytes = ethers.utils.formatBytes32String(orgSlug);
  const query = `{
    slugConfigs(where:{slug:"${slugBytes}"}) { slug bootstrapped }
    members(where:{slug:"${slugBytes}"}) { id }
  }`;
  const deadline = Date.now() + timeoutMs;
  let lastBody: string | null = null;
  let lastErr: string | null = null;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(GRAPHQL_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query }),
        signal: AbortSignal.timeout(2_000),
      });
      const text = await res.text();
      lastBody = text.slice(0, 500);
      const body = JSON.parse(text) as {
        data?: {
          slugConfigs?: { bootstrapped?: boolean }[];
          members?: unknown[];
        };
      };
      const cfg = body.data?.slugConfigs?.[0];
      const memberCount = body.data?.members?.length ?? 0;
      if (cfg?.bootstrapped && memberCount > 0) return;
    } catch (err) {
      lastErr = (err as Error).message;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(
    `subgraph never indexed slug "${orgSlug}" within ${timeoutMs}ms; ` +
      `last body=${lastBody ?? "(no response)"} lastErr=${lastErr ?? "(none)"}`,
  );
}
