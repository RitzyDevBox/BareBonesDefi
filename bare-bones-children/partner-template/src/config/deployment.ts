export enum DeploymentTarget {
  Local = "local",
  Staging = "staging",
  Live = "live",
}

function normalizeDeploymentTarget(value: unknown): DeploymentTarget {
  const normalized = String(value ?? DeploymentTarget.Local).trim().toLowerCase();

  if (normalized === DeploymentTarget.Staging) return DeploymentTarget.Staging;
  if (normalized === DeploymentTarget.Live) return DeploymentTarget.Live;
  return DeploymentTarget.Local;
}

export const DEPLOYMENT_TARGET = normalizeDeploymentTarget(import.meta.env.VITE_DEPLOYMENT_TARGET);

export const DEPLOYMENT_CONFIG = {
  target: DEPLOYMENT_TARGET,
  showLocalChains: DEPLOYMENT_TARGET === DeploymentTarget.Local,
  showTestnetsByDefault: DEPLOYMENT_TARGET !== DeploymentTarget.Live,
};

// Staging chain endpoints. The staging Anvil + graph live behind a single
// reverse proxy at staging.bear-bones.xyz (see StagingServer/server/Caddyfile).
// We hardcode the public URLs here instead of reading VITE_LOCAL_RPC_URL,
// because that var is set by the local-anvil deploy to 127.0.0.1 and Vite's
// `.env.local` always loads — so without an override the staging build bakes
// localhost into the bundle.
const STAGING_BASE_URL =
  import.meta.env.VITE_STAGING_BASE_URL ?? "https://staging.bear-bones.xyz";
const STAGING_SUBGRAPH_NAME =
  import.meta.env.VITE_STAGING_SVR_SUBGRAPH_NAME ?? "secure-value-reserve-staging";

export const STAGING_RPC_URL =
  import.meta.env.VITE_STAGING_RPC_URL ?? `${STAGING_BASE_URL}/rpc`;
export const STAGING_SVR_GRAPH_URL =
  import.meta.env.VITE_STAGING_SVR_GRAPH_URL
    ?? `${STAGING_BASE_URL}/subgraphs/name/${STAGING_SUBGRAPH_NAME}`;
// Must match `ANVIL_CHAIN_ID` in StagingServer/server/.env. We picked a
// non-standard id so a visitor's local 31337 anvil/hardhat network can't
// collide with the staging chain in their wallet.
export const STAGING_CHAIN_ID = Number(
  import.meta.env.VITE_STAGING_CHAIN_ID ?? 1155337,
);
