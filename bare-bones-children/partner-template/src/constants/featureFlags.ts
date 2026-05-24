import { DEPLOYMENT_TARGET, DeploymentTarget } from "../config/deployment";

export const FEATURE_FLAGS = {
  organizations: false,
  entityFormation: true,
  // Internal-only pages hidden from the public navbar + router for the
  // launch window. Flip to `true` to re-expose without code surgery; both
  // the nav entry and the route registration are gated on the same flag.
  // No settings UI exposes these — flipping requires a code edit, which is
  // intentional while we're stabilizing the launch surface.
  basicWallet: false,
  dappBrowser: false,
  vaults: false,
  // Staging hosts the same Anvil chain as local dev (just on a remote box),
  // so include it for both targets. Production excludes it.
  localAnvilChain: DEPLOYMENT_TARGET !== DeploymentTarget.Live,
  // On staging we want a single-chain UX — only the staging Anvil shows up,
  // no real-money chains. Local dev keeps everything for parity testing.
  stagingOnlyChains: DEPLOYMENT_TARGET === DeploymentTarget.Staging,
} as const;
