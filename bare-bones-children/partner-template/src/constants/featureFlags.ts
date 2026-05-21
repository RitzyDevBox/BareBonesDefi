import { DEPLOYMENT_TARGET, DeploymentTarget } from "../config/deployment";

export const FEATURE_FLAGS = {
  organizations: false,
  entityFormation: true,
  // Staging hosts the same Anvil chain as local dev (just on a remote box),
  // so include it for both targets. Production excludes it.
  localAnvilChain: DEPLOYMENT_TARGET !== DeploymentTarget.Live,
  // On staging we want a single-chain UX — only the staging Anvil shows up,
  // no real-money chains. Local dev keeps everything for parity testing.
  stagingOnlyChains: DEPLOYMENT_TARGET === DeploymentTarget.Staging,
} as const;
