import { DEPLOYMENT_TARGET, DeploymentTarget } from "../config/deployment";

export const FEATURE_FLAGS = {
  organizations: false,
  entityFormation: true,
  // dappBrowser is still a pure build-time gate: hidden from navbar + router
  // for the launch window, flip to `true` (code edit) to re-expose. Both the
  // nav entry and the route registration read the same flag.
  dappBrowser: false,
  // basicWallet / vaults / payments seed the *default* for the matching
  // runtime Settings toggle (see `SettingsKey` in hooks/useSettings.ts). The
  // user can flip these from the Settings modal on any build; this value is
  // only the first-load default before they've touched the toggle. Each
  // controls both its nav entry and its routes (gated via <FeatureRoute>).
  basicWallet: false,
  vaults: false,
  payments: true,
  // Staging hosts the same Anvil chain as local dev (just on a remote box),
  // so include it for both targets. Production excludes it.
  localAnvilChain: DEPLOYMENT_TARGET !== DeploymentTarget.Live,
  // On staging we want a single-chain UX — only the staging Anvil shows up,
  // no real-money chains. Local dev keeps everything for parity testing.
  stagingOnlyChains: DEPLOYMENT_TARGET === DeploymentTarget.Staging,
  // The Settings "Features" toggles (Wallet / Payments / Vaults) let a user
  // self-enable pre-launch tabs. Deployed builds shouldn't expose those
  // toggles yet — show the section only on local dev so the features stay off
  // (and unreachable) on staging/live until they're ready to launch.
  showFeatureToggles: DEPLOYMENT_TARGET === DeploymentTarget.Local,
} as const;
