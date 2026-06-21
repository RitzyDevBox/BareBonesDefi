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
  // Cap table — on-chain equity register (ShareToken). Visible by default (like payments) so it's
  // reachable on staging/live where the Settings "Features" toggles are hidden (showFeatureToggles
  // is local-only). Seeds the SettingsKey.CapTable default; gates both the nav entry and the routes.
  capTable: true,
  // Distributions — pay shareholders by ownership (a second mode of the Payments tab).
  // Currently a visual MOCK behind this flag; self-enabled from Settings like the others.
  distributions: false,
  // Lending — the cross-org Share Lending Market (borrow cash against pledged cap-table shares).
  // Wired to the real stack (ShareLendingMarket contract + subgraph + BareBonesApi metadata).
  // Visible by default (like capTable) so the tab shows on staging/live where the Settings
  // toggles are hidden. NB: showing the tab ≠ an org being able to transact — each org still
  // does a one-time on-chain "Enable lending" (setShareToken + setLocker). Gates the nav + routes.
  lending: true,
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
