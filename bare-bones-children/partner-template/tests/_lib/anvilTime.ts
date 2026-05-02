// Anvil-only RPC time helpers. Drives `evm_increaseTime`, `evm_setNextBlockTimestamp`,
// and `evm_mine` directly from the test runner — independent of the page so we can
// warp before/after navigations without touching the dapp.

const DEFAULT_RPC_URL = "http://127.0.0.1:8545";

let rpcId = 1;

async function rpc<T = unknown>(
  method: string,
  params: unknown[] = [],
  rpcUrl: string = DEFAULT_RPC_URL
): Promise<T> {
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: rpcId++, method, params }),
  });
  const json = await res.json();
  if (json.error) {
    throw new Error(`${method} → ${json.error.message ?? "RPC error"}`);
  }
  return json.result as T;
}

/** Advance the chain clock by `seconds`, then mine one block to apply. */
export async function warpTime(seconds: number, rpcUrl?: string) {
  await rpc("evm_increaseTime", [seconds], rpcUrl);
  await rpc("evm_mine", [], rpcUrl);
}

/** Mine `blocks` blocks. Uses anvil_mine for batch counts (instant) and falls
 *  back to evm_mine if anvil_mine isn't supported (e.g., a hardhat node). */
export async function mine(blocks: number = 1, rpcUrl?: string) {
  if (blocks <= 0) return;
  try {
    await rpc("anvil_mine", ["0x" + blocks.toString(16)], rpcUrl);
    return;
  } catch {
    // anvil_mine not supported — loop with evm_mine.
    for (let i = 0; i < blocks; i++) {
      await rpc("evm_mine", [], rpcUrl);
    }
  }
}

/** Take a snapshot of chain state. Returns id usable with `revert`. */
export async function snapshot(rpcUrl?: string): Promise<string> {
  return rpc<string>("evm_snapshot", [], rpcUrl);
}

/** Revert chain state to a snapshot. */
export async function revert(snapshotId: string, rpcUrl?: string) {
  await rpc("evm_revert", [snapshotId], rpcUrl);
}

/** Current chain timestamp (seconds). */
export async function blockTimestamp(rpcUrl?: string): Promise<number> {
  const block = await rpc<{ timestamp: string }>(
    "eth_getBlockByNumber",
    ["latest", false],
    rpcUrl
  );
  return parseInt(block.timestamp, 16);
}

/** Current block number. */
export async function blockNumber(rpcUrl?: string): Promise<number> {
  const hex = await rpc<string>("eth_blockNumber", [], rpcUrl);
  return parseInt(hex, 16);
}
