// Playwright globalSetup — runs ONCE per `playwright test` invocation.
// Self-bootstrapping: every test invocation starts from the same clean
// state regardless of what previous runs left behind. Pipeline:
//
//   1. If the golden chain snapshot OR subgraph deployment metadata is
//      missing, run a one-shot `npm run deploy:anvil` (which deploys
//      contracts, snapshots, and redeploys the local graph). After this
//      both files are guaranteed to exist.
//
//   2. Restore anvil's state.json from .anvil/state.golden.json (stop /
//      cp / restart). Verify the RPC actually answers before proceeding.
//
//   3. Make sure the docker graph stack (postgres + ipfs + graph-node) is
//      up. Spawn `docker compose up -d` if not.
//
//   4. Hard-reset graph-node's view of the chain: drop the existing
//      subgraph deployment via `graphman unused remove`, truncate the
//      chain block cache via `graphman chain truncate`, NULL the polling
//      ingestor's chain head in `public.ethereum_networks`. Without this
//      graph-node refuses to follow the chain "going backwards" after
//      anvil reset to a lower block.
//
//   5. subgraph_create + subgraph_deploy with the stashed IPFS hash so
//      the subgraph re-indexes the restored chain from scratch.
//
// All steps are skippable for fast iteration:
//   PLAYWRIGHT_SKIP_BOOTSTRAP=1   — don't even run deploy:anvil first time
//   PLAYWRIGHT_SKIP_ANVIL_RESTORE=1
//   PLAYWRIGHT_SKIP_GRAPH_RESET=1
//   PLAYWRIGHT_SKIP_API=1         — don't start BareBonesApi (entity-formation
//                                   tests depend on it for the SIWE gate)

import { execSync, spawn } from "node:child_process";
import { existsSync, openSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// ESM has no __dirname; derive it.
const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..", "..", "..", "..", "..");
const GOLDEN_STATE = resolve(REPO_ROOT, ".anvil", "state.golden.json");
const SUBGRAPH_DEPLOYMENT_ENV = resolve(REPO_ROOT, ".anvil", "subgraph.deployment.env");
const GRAPH_PROJECT_DIR = resolve(REPO_ROOT, "BareBonesGraph", "secure-value-reserve");
const GRAPH_ADMIN_URL = process.env.GRAPH_ADMIN_URL ?? "http://localhost:8020";
const ANVIL_RPC_URL = process.env.ANVIL_RPC_URL ?? "http://127.0.0.1:8545";
const API_DIR = resolve(REPO_ROOT, "BareBonesApi");
const API_PORT = Number(process.env.PLAYWRIGHT_API_PORT ?? 7423);
const API_HEALTH_URL = `http://localhost:${API_PORT}/health`;
const API_LOG_FILE = process.env.PLAYWRIGHT_API_LOG_FILE ?? "/tmp/barebones-api-playwright.log";

// Local docker compose project name = directory name when no `name:` set.
const GRAPH_NODE_CONTAINER = "secure-value-reserve-graph-node-1";
const POSTGRES_CONTAINER = "secure-value-reserve-postgres-1";

const TAG = "[playwright:setup]";

// ── Shell helpers ─────────────────────────────────────────────────────

function run(command: string, cwd = REPO_ROOT): void {
  execSync(command, { cwd, stdio: "inherit" });
}

function runQuiet(command: string, cwd = REPO_ROOT): { ok: boolean; stdout: string } {
  try {
    const stdout = execSync(command, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { ok: true, stdout };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string };
    return { ok: false, stdout: (e.stdout ?? "") + (e.stderr ?? "") };
  }
}

// ── Anvil RPC ─────────────────────────────────────────────────────────

async function callAnvilRpc(method: string, params: unknown[]): Promise<unknown> {
  const res = await fetch(ANVIL_RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(3000),
  });
  if (!res.ok) throw new Error(`anvil ${method}: HTTP ${res.status}`);
  const body = (await res.json()) as { result?: unknown; error?: { message: string } };
  if (body.error) throw new Error(`anvil ${method}: ${body.error.message}`);
  return body.result;
}

async function setAnvilFastMining(): Promise<void> {
  // anvil-local.sh starts anvil with --block-time 2 (mines an empty
  // block every 2s) which means tx.wait(1) sits up to 2s waiting for
  // the next interval block — that's the "slow mining" you're seeing.
  // For tests we want INSTANT per-tx mining and zero interval mining.
  // Tests still call mine() explicitly when they need to advance empty
  // blocks (e.g. for OZ Governor past-block lookups).
  //
  // - anvil_setIntervalMining(0) disables the time-based ticker
  // - evm_setAutomine(true) ensures every submitted tx is mined into a
  //   block immediately (this is anvil's default but block-time mode
  //   may have toggled it off on boot)
  try {
    await callAnvilRpc("anvil_setIntervalMining", [0]);
    await callAnvilRpc("evm_setAutomine", [true]);
    console.log(`${TAG} anvil mining → instant on tx, no interval`);
  } catch (err) {
    // Non-fatal; tests will still pass at the slower default cadence.
    console.warn(`${TAG} couldn't speed up anvil mining:`, err);
  }
}

async function isAnvilRpcReady(): Promise<boolean> {
  try {
    const res = await fetch(ANVIL_RPC_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId" }),
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return false;
    const body = (await res.json()) as { result?: string };
    return typeof body.result === "string";
  } catch {
    return false;
  }
}

async function waitForAnvilRpc(maxWaitMs: number): Promise<boolean> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    if (await isAnvilRpcReady()) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

// ── Graph admin RPC ───────────────────────────────────────────────────

async function isGraphAdminReachable(): Promise<boolean> {
  try {
    await fetch(GRAPH_ADMIN_URL, { method: "GET", signal: AbortSignal.timeout(2000) });
    return true;
  } catch {
    return false;
  }
}

async function adminRpc(method: string, params: Record<string, unknown>): Promise<void> {
  const res = await fetch(GRAPH_ADMIN_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`graph admin ${method}: HTTP ${res.status}`);
  const body = (await res.json()) as { error?: { message: string } };
  if (body.error) throw new Error(`graph admin ${method}: ${body.error.message}`);
}

// ── Subgraph deployment metadata ──────────────────────────────────────

interface SubgraphDeployment {
  name: string;
  ipfsHash: string;
  versionLabel: string;
}

function readSubgraphDeployment(): SubgraphDeployment | null {
  if (!existsSync(SUBGRAPH_DEPLOYMENT_ENV)) return null;
  const text = readFileSync(SUBGRAPH_DEPLOYMENT_ENV, "utf8");
  const map: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    map[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  if (!map.SUBGRAPH_NAME || !map.SUBGRAPH_IPFS_HASH) return null;
  return {
    name: map.SUBGRAPH_NAME,
    ipfsHash: map.SUBGRAPH_IPFS_HASH,
    versionLabel: map.SUBGRAPH_VERSION_LABEL ?? "v0.0.1",
  };
}

// ── Steps ─────────────────────────────────────────────────────────────

/** First-run bootstrap. If golden + subgraph deployment metadata are
 *  both already on disk, this is a no-op. Otherwise it kills any running
 *  anvil, wipes the persisted chain state, then runs the full
 *  `npm run deploy:anvil` (which itself runs anvil-local + forge scripts +
 *  graph:local + auto-snapshot) so subsequent steps have everything they
 *  need. Heavy on first run (a few minutes) — instant on every run after. */
function ensureBootstrap(): void {
  if (process.env.PLAYWRIGHT_SKIP_BOOTSTRAP === "1") {
    console.log(`${TAG} PLAYWRIGHT_SKIP_BOOTSTRAP=1, skipping first-run bootstrap`);
    return;
  }
  const haveGolden = existsSync(GOLDEN_STATE);
  const haveSubgraphMeta = existsSync(SUBGRAPH_DEPLOYMENT_ENV);
  if (haveGolden && haveSubgraphMeta) return;

  console.log(
    `${TAG} first-run bootstrap (missing: ` +
      [
        !haveGolden ? "state.golden.json" : null,
        !haveSubgraphMeta ? "subgraph.deployment.env" : null,
      ]
        .filter(Boolean)
        .join(", ") +
      `)\n${TAG}   wiping .anvil + running 'npm run deploy:anvil' — this is a one-time cost.`,
  );

  // Mirror what test-env.sh does on a forced redeploy: kill any running
  // anvil, wipe the persisted chain state file, and run deploy:anvil with
  // env vars that tell the deploy script not to re-load any leftover
  // state. Without this the deploy can hang or fail if state.json is
  // huge / incompatible from past sessions.
  runQuiet("npm run anvil:stop");
  runQuiet("rm -rf .anvil");
  try {
    execSync("npm run deploy:anvil", {
      cwd: REPO_ROOT,
      stdio: "inherit",
      env: {
        ...process.env,
        RESET_ANVIL_ON_DEPLOY: "1",
        ANVIL_LOAD_STATE_ON_START: "0",
      },
    });
  } catch (err) {
    console.error(
      `${TAG} 'npm run deploy:anvil' failed during bootstrap — see output above for the root cause.\n` +
        `${TAG}   common causes: missing 'forge'/'anvil'/'cast', missing .env.deploy.anvil, docker daemon down.`,
    );
    throw err;
  }

  // Belt and suspenders: deploy:anvil normally also runs graph:local and
  // stashes deployment.env. If something failed there, run graph:local
  // explicitly so subgraph reset has metadata to use.
  if (!existsSync(SUBGRAPH_DEPLOYMENT_ENV)) {
    console.log(`${TAG} subgraph metadata still missing — running 'npm run graph:local'`);
    run("npm run graph:local");
  }
}

async function restoreAnvil(): Promise<void> {
  if (process.env.PLAYWRIGHT_SKIP_ANVIL_RESTORE === "1") {
    console.log(`${TAG} PLAYWRIGHT_SKIP_ANVIL_RESTORE=1, skipping chain restore`);
    return;
  }
  if (!existsSync(GOLDEN_STATE)) {
    // Bootstrap should've created it; if not, can't restore.
    console.log(`${TAG} no golden snapshot — skipping restore`);
    return;
  }
  const start = Date.now();
  console.log(`${TAG} restoring anvil chain from golden snapshot…`);
  run("bash scripts/anvil-state.sh restore");
  const ready = await waitForAnvilRpc(120_000);
  if (!ready) {
    throw new Error(`${TAG} anvil RPC at ${ANVIL_RPC_URL} never came up — aborting`);
  }
  console.log(`${TAG} chain restored + RPC ready in ${Date.now() - start}ms`);
}

async function ensureGraphStackUp(): Promise<boolean> {
  if (await isGraphAdminReachable()) return true;
  console.log(`${TAG} graph stack not running — starting docker containers…`);
  try {
    run("docker compose up -d postgres ipfs graph-node", GRAPH_PROJECT_DIR);
  } catch (err) {
    console.error(`${TAG} docker compose up failed (daemon down?) — skipping graph reset`);
    console.error(err);
    return false;
  }
  for (let i = 0; i < 30; i++) {
    if (await isGraphAdminReachable()) {
      console.log(`${TAG} graph stack ready after ${(i + 1) * 2}s`);
      return true;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  console.error(`${TAG} graph stack didn't come up in time at ${GRAPH_ADMIN_URL}`);
  return false;
}

/** Same hard-reset as the staging refresh-staging.sh — cleans up four
 *  layers of stale state (block cache, chain head pointer, subgraph
 *  deployment, sgdN entity tables) so the new chain doesn't conflict. */
function graphmanHardReset(deployment: SubgraphDeployment): void {
  // Stage graphman config inside the graph-node container via docker cp
  // (heredoc through `docker exec bash -c` mangles TOML quoting).
  const cfgPath = `/tmp/graphman-pw-${process.pid}.toml`;
  const cfg = `[general]
query = "primary"

[store]
[store.primary]
connection = "postgresql://graph-node:let-me-in@postgres:5432/graph-node"
pool_size = 10

[chains]
ingestor = "default"

[chains.mainnet]
shard = "primary"
provider = [{ label = "mainnet-rpc-0", url = "http://host.docker.internal:8545", features = [] }]

[deployment]
[[deployment.rule]]
shards = ["primary"]
indexers = ["default"]
`;
  // Use bash redirection inside docker exec — single-quoted heredoc so
  // host shell doesn't interpolate.
  execSync(
    `docker exec -i ${GRAPH_NODE_CONTAINER} sh -c 'cat > ${cfgPath}' <<'EOF'\n${cfg}EOF`,
    { stdio: "inherit", shell: "/bin/bash" },
  );

  const graphman = (args: string) =>
    runQuiet(`docker exec ${GRAPH_NODE_CONTAINER} graphman --config ${cfgPath} ${args}`);

  // 1. Unassign the name from its deployment (if any). Non-fatal on first run.
  graphman(`remove ${deployment.name}`);

  // 2. Mark + drop unused deployments. Frees the sgdN schema + head pointer.
  graphman("unused record");
  graphman("unused remove");

  // 3. Empty per-chain block cache so old block hashes don't conflict.
  graphman("chain truncate --force mainnet");

  // 4. Stop graph-node, NULL ingestor head pointer, restart. Has to happen
  //    while graph-node is stopped or live ingestor immediately repopulates.
  console.log(`${TAG} stopping graph-node + nulling ethereum_networks head`);
  run("docker compose stop graph-node", GRAPH_PROJECT_DIR);
  execSync(
    `docker exec -i ${POSTGRES_CONTAINER} psql -U graph-node -d graph-node -v ON_ERROR_STOP=1 ` +
      `-c "UPDATE public.ethereum_networks SET head_block_number = NULL, head_block_hash = NULL, head_block_cursor = NULL;"`,
    { stdio: "inherit" },
  );
  run("docker compose up -d graph-node", GRAPH_PROJECT_DIR);
}

async function resetGraph(): Promise<void> {
  if (process.env.PLAYWRIGHT_SKIP_GRAPH_RESET === "1") {
    console.log(`${TAG} PLAYWRIGHT_SKIP_GRAPH_RESET=1, skipping graph reset`);
    return;
  }
  const deployment = readSubgraphDeployment();
  if (!deployment) {
    console.log(`${TAG} no subgraph deployment metadata — skipping graph reset`);
    return;
  }
  if (!(await ensureGraphStackUp())) return;

  const start = Date.now();
  console.log(`${TAG} resetting graph for ${deployment.name} → ${deployment.ipfsHash}`);

  // Hard-reset stale state from previous runs (block cache + chain head +
  // sgdN schema). Without this graph-node logs "Provider went backwards"
  // and refuses to index anything against the lower-block restored chain.
  try {
    graphmanHardReset(deployment);
  } catch (err) {
    console.error(`${TAG} graphman hard-reset failed — graph may not catch up cleanly`);
    console.error(err);
  }

  // Wait for graph-node admin port to come back up after the restart.
  for (let i = 0; i < 30; i++) {
    if (await isGraphAdminReachable()) break;
    await new Promise((r) => setTimeout(r, 1000));
  }

  try {
    // Subgraph_remove may fail if name still exists from graphman remove;
    // ignore — subgraph_create is the authoritative re-init.
    await adminRpc("subgraph_remove", { name: deployment.name }).catch(() => undefined);
    await adminRpc("subgraph_create", { name: deployment.name });
    await adminRpc("subgraph_deploy", {
      name: deployment.name,
      ipfs_hash: deployment.ipfsHash,
      version_label: deployment.versionLabel,
      node_id: "default",
    });
  } catch (err) {
    console.error(`${TAG} subgraph redeploy failed — tests may see stale graph data`);
    console.error(err);
    return;
  }
  console.log(`${TAG} graph reset in ${Date.now() - start}ms`);
}

// ── BareBonesApi ──────────────────────────────────────────────────────

async function isApiHealthy(): Promise<boolean> {
  try {
    const res = await fetch(API_HEALTH_URL, {
      method: "GET",
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function waitForApi(maxWaitMs: number): Promise<boolean> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    if (await isApiHealthy()) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

/** Ensure BareBonesApi is up on :7423. The entity-formation flow's SIWE
 *  gate calls /siwe/nonce, /siwe/verify; without the API the page sits on
 *  "Sign in with Ethereum" and the connected-flow test still passes because
 *  it only asserts the gate copy, but any future wizard-submit test would
 *  need the API.
 *
 *  Setup is idempotent (BareBonesApi/scripts/setup.sh): brings up its own
 *  Postgres docker container on :5433 and applies Prisma migrations. The
 *  API itself runs as a detached `npm run dev` child that survives the
 *  globalSetup process — like vite via the webServer config, we leave it
 *  running for the duration of the test session (and reuse on re-runs). */
async function ensureApi(): Promise<void> {
  if (process.env.PLAYWRIGHT_SKIP_API === "1") {
    console.log(`${TAG} PLAYWRIGHT_SKIP_API=1, skipping BareBonesApi startup`);
    return;
  }

  // When anvil was just restored from golden, the chain has gone back to
  // a state where this run's freshly-created orgSlugs do not yet exist.
  // BUT — the API's Postgres still has formation-entity rows for those
  // slugs from previous runs, so a fresh deploy collides on the unique
  // (orgSlug, chainId) key and returns 409 entity_already_exists. Wipe
  // the API's Postgres volume in lockstep with the anvil restore so each
  // test session is genuinely starting from scratch on both sides.
  const wipingDb = process.env.PLAYWRIGHT_SKIP_ANVIL_RESTORE !== "1";
  if (wipingDb) {
    console.log(`${TAG} wiping BareBonesApi Postgres volume (matched to anvil restore)…`);
    runQuiet("bash scripts/teardown.sh --wipe", API_DIR);
  }

  // The API loads `MTA_ADDRESS_<chainId>` and `CHAIN_RPC_URL_<chainId>` from
  // .env.deploy.anvil.generated at startup (see BareBonesApi/src/lib/env.ts).
  // A fresh `deploy:anvil` rewrites that file with new addresses, but a
  // long-running API process keeps the OLD values in process.env — so the
  // MTA role check reads from a contract that no longer exists, returns
  // ZeroHash, and the formation wizard 403s with "not_a_member". Force a
  // restart so the API re-reads the file every time globalSetup runs.
  //
  // Resolve listener PIDs through `lsof -t -i:PORT -sTCP:LISTEN` (LISTEN
  // filter avoids the test runner's own outbound socket on 7423) and call
  // `process.kill` directly — going through bash + pipes earlier was
  // taking down the test runner via signal cascade.
  if (await isApiHealthy()) {
    console.log(`${TAG} stopping running BareBonesApi so it re-reads MTA_ADDRESS env…`);
    const lookup = runQuiet(`lsof -t -i:${API_PORT} -sTCP:LISTEN`);
    const pids = lookup.stdout
      .split("\n")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => Number.isFinite(n) && n > 1 && n !== process.pid);
    for (const pid of pids) {
      try {
        process.kill(pid, "SIGTERM");
      } catch (err) {
        console.warn(`${TAG} could not SIGTERM api pid ${pid}:`, (err as Error).message);
      }
    }
    for (let i = 0; i < 20; i++) {
      if (!(await isApiHealthy())) break;
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  const start = Date.now();

  if (!existsSync(resolve(API_DIR, "node_modules"))) {
    console.log(`${TAG} installing BareBonesApi dependencies (first run)…`);
    run("npm install", API_DIR);
  }

  // setup.sh writes .env on first run, brings up Postgres in docker, runs
  // Prisma migrations. Idempotent — safe to call every time.
  console.log(`${TAG} preparing BareBonesApi (postgres + migrations)…`);
  run("bash scripts/setup.sh", API_DIR);

  console.log(`${TAG} spawning 'npm run dev' for BareBonesApi → ${API_LOG_FILE}`);
  const logFd = openSync(API_LOG_FILE, "a");
  const child = spawn("npm", ["run", "dev"], {
    cwd: API_DIR,
    stdio: ["ignore", logFd, logFd],
    detached: true,
    env: process.env,
  });
  // Detach so the API outlives the globalSetup process. Playwright's
  // webServer pattern works the same way (reuseExistingServer=true).
  child.unref();

  if (!(await waitForApi(60_000))) {
    throw new Error(
      `${TAG} BareBonesApi at ${API_HEALTH_URL} never came up — see ${API_LOG_FILE}`,
    );
  }
  console.log(`${TAG} BareBonesApi ready in ${Date.now() - start}ms`);
}

// ── Entry point ───────────────────────────────────────────────────────

export default async function globalSetup() {
  ensureBootstrap();
  await restoreAnvil();
  await setAnvilFastMining();
  await resetGraph();
  await ensureApi();
}
