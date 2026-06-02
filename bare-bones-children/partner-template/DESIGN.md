# partner-template — design notes

Frontend for the BareBones stack. Vite + React app. Lives as the canonical
"reference dapp" against the Diamond + PayrollManager + Governor surface.

## E2E test philosophy

Playwright e2e is the regression net for **user flows**, not a unit-test
substitute. Coverage targets the surfaces that change most often (header,
DAO/proposal builder, payments, formation) and the contracts that route
through MTA.execute (PayrollManager admin paths), because those are the
flows where a wrong role-check decision goes silently green in unit tests.

Tests live under [tests/](tests/). `globalSetup` restores anvil from the
golden snapshot and refreshes the local subgraph before each `npm run
test:e2e` invocation — see [tests/_lib/global-setup.ts](tests/_lib/global-setup.ts).
Wallet connection is faked via an injected `window.ethereum` provider that
forwards to anvil ([tests/_demo/mockWallet.ts](tests/_demo/mockWallet.ts)),
so there are no signature popups and unlocked anvil accounts sign every tx
server-side.

### What's tested (mid-2026)

- **Smoke / nav** — page renders, header nav reaches every primary route.
- **DAO setup** — create org + deploy DAO via the launcher modal.
- **Proposal flow** — create + cast vote on a Set Voting Delay proposal.
- **Wallet deploy** — `deploy-wallet.spec.ts` covers the smart-account deploy
  surface against the Calibur kernel.
- **Payments permissions** — admin (org owner) vs. non-admin (foreign EOA)
  on `/payments/:slug`. Catches role-check regressions that unit-tests would
  miss because the MTA→PayrollManager auth path is end-to-end.
- **Payments batch + payroll** — create a pay batch, see it land in the
  selector, then start an empty payroll and assert it shows up under "Open
  cycles". Stops short of finalizing — finalize needs a funded treasury,
  which adds setup churn for thin marginal coverage.
- **Entity formation gates** — exercises the ShellNotice render gates
  (wallet-required → connected). globalSetup brings up BareBonesApi on
  :7423 (idempotent — reuses any already-running instance) so the SIWE
  gate code path is fully wired in tests, but we don't drive a SIWE
  sign-in or wizard submit yet; the gates that *don't* depend on submit
  are the load-bearing ones — wrong-account / wrong-org users must never
  reach the wizard.

### Why some flows are intentionally not e2e'd

- **End-to-end payroll finalize.** Requires a populated earnings catalog +
  payees + treasury funding. Each adds a setup step that would dwarf the
  assertion. The unit tests in BareBonesDiamond exercise the on-chain path;
  e2e covers up to "payroll exists" so a regression in the create path is
  still caught.
- **Entity formation submit.** Needs the API stack running + a real SIWE
  signature. We test the gates because those are 100% frontend code; the
  submit path is covered by BareBonesApi's own integration tests.
- **Calibur ERC-4337 mempool path.** The deploy-wallet spec validates the
  deployer-side flow when the basicWallet feature flag is on; UserOp execution
  is covered by Calibur's Foundry tests.

### Demo-modal blocking

Local + staging builds open the StagingIntroModal on every page-load (see
[src/components/Staging/StagingIntroModal.tsx](src/components/Staging/StagingIntroModal.tsx)).
Its full-viewport backdrop intercepts every click on the header, so tests
that don't dismiss it time out on `Connect`, the org switcher, etc.

The fix is in [tests/_lib/installAutoDismissIntro.ts](tests/_lib/installAutoDismissIntro.ts)
— a per-page init script with a MutationObserver that clicks the modal's
"Got it" button as soon as it appears. `installMockWallet` calls it, and
specs that don't use a mock wallet (`nav-tour`) call it directly. No
per-test boilerplate, and the observer self-disconnects after the first
dismiss or after 10s.

## Chain visibility and per-build map gating

The frontend serves three deployment targets (`local`, `staging`, `live`) from one codebase, gated at build time by `VITE_DEPLOYMENT_TARGET`. `VISIBLE_CHAIN_IDS` in [src/constants/misc.ts](src/constants/misc.ts) is the single source of truth for which chains a given build exposes.

Convention: chain-keyed maps holding **values consumed at runtime** (URLs, RPC endpoints, anything that can trigger a network fetch) must be filtered by `VISIBLE_CHAIN_IDS`. Pattern:

```ts
const BASE_FOO_BY_CHAIN = { [LOCAL_CHAIN_ID]: ..., [STAGING_CHAIN_ID]: ..., [POLYGON_CHAIN_ID]: ... };
export const FOO_BY_CHAIN = Object.fromEntries(
  Object.entries(BASE_FOO_BY_CHAIN).filter(([id]) => VISIBLE_CHAIN_IDS.includes(Number(id)))
);
```

Why the gating matters even though `VISIBLE_CHAIN_IDS` already filters the UI's chain picker: MetaMask is a single shared extension across all tabs. A user with another tab connected to local anvil (chain 31337) will have the staging frontend see `chainId === 31337` when it asks the wallet. Any unfiltered map then yields the local-chain entry — including local RPC / subgraph URLs — and the resulting fetch to `127.0.0.1:*` from a public origin triggers Chrome's Private Network Access banner ("this site wants to use other apps and services on this device").

Considered and rejected: per-target ternaries that overload chain ids per build (e.g. `LOCAL_CHAIN_ID === STAGING_CHAIN_ID` on staging). Earlier code did this and silently mixed local + staging address overrides on the same map key. The current pattern — unconditional `BASE_*` map + filtered exported map — keeps every chain's data isolated and lets one switch (`VISIBLE_CHAIN_IDS`) gate everything.

Maps currently filtered: `CHAIN_INFO_MAP`, `NATIVE_TOKENS_BY_CHAIN`, `CHAIN_SVR_SUBGRAPH_URL`. Maps that hold only addresses or template names (no network fetches) intentionally aren't filtered — their accessor functions fall through to a polygon default, which is the correct production fallback.

## Changelog

### 2026-06-01 — Wallet / Vaults / Payments become user-toggleable from Settings

Started as "hide the Payments tab behind a flag" (same launch-surface posture as
`basicWallet`/`vaults`), then the ask widened: the user wants **Wallet, Vaults,
and Payments toggleable at runtime from the Settings modal on every build** —
flip one on and its full feature (nav tab **and** all its routes) lights up.

Implementation — promote those three from build-time `FEATURE_FLAGS` gates to
runtime, localStorage-persisted settings, reusing the existing `useSettings`
store rather than introducing new state machinery:
- Added `BasicWallet` / `Vaults` / `Payments` keys to `SettingsKey`
  ([src/hooks/useSettings.ts](src/hooks/useSettings.ts)). Their **defaults** read
  from `FEATURE_FLAGS` ([src/constants/featureFlags.ts](src/constants/featureFlags.ts)),
  so a build still seeds the first-load state; the user override wins after that.
- `useNavItems()` ([src/components/PageWrapper/navConfig.ts](src/components/PageWrapper/navConfig.ts))
  is now a real hook again (was a static-list shim) — it reads `useSettings()` so
  the navbar re-renders the instant a flag flips. The other gates (Organizations,
  Formation, Browser) stay build-time `FEATURE_FLAGS`.
- The router is built once at module load, so these routes can't be conditionally
  included like the build-time ones. Instead they're **always registered** and
  wrapped in `<FeatureRoute flag={…}>` ([src/Router.tsx](src/Router.tsx)), which
  redirects to home when the flag is off — this is what keeps a hidden feature
  unreachable by direct URL, not just absent from the nav.
- Three toggles added under a "Features" section in the Settings modal
  ([src/components/Settings/SettingsModal.tsx](src/components/Settings/SettingsModal.tsx)).

Decisions:
- **Public on all builds, including `live`.** The user explicitly chose this over
  a dev-only / non-production-only section. Consequence to keep in mind: any
  production visitor can un-hide Wallet/Vaults/Payments before those areas are
  launch-ready. If that becomes a problem, the narrowing point is `FeatureRoute`
  + the Settings section's render condition, not the flags themselves.
- **Only these three.** Organizations / Formation / Browser stay code-only —
  the user scoped the toggles to "wallets, payments, vaults, that's it."
- **Reused `useSettings`, no new dep/store.** Module-level `useSyncExternalStore`
  already cross-syncs every consumer (navbar, router guard, modal) on toggle.

### 2026-05-31 — gate `CHAIN_SVR_SUBGRAPH_URL` by `VISIBLE_CHAIN_IDS`

Staging bundle was leaking the local subgraph URL (`http://127.0.0.1:8000/subgraphs/name/secure-value-reserve-local`). Users with MetaMask left on local anvil (chain 31337) from a dev tab triggered the local branch of the subgraph lookup on `bear-bones.xyz`, causing Chrome to show the Private Network Access permission banner from a public origin.

Applied the same `Object.fromEntries(...).filter(...)` pattern already used for `CHAIN_INFO_MAP` / `NATIVE_TOKENS_BY_CHAIN`. The existing `if (!url) return empty;` guards in `mtaGraphService` / `daoGraphService` / `vaultGraphService` then early-return cleanly when the map has no entry for the wallet's reported chain.

Scope: only `CHAIN_SVR_SUBGRAPH_URL`. The other chain-keyed maps (`SVR_TEMPLATE_CONFIG_BY_CHAIN`, `DAO_GOVERNOR_TEMPLATE_CONFIG_BY_CHAIN`, `MOCK_GOVERNANCE_TOKEN_BY_CHAIN`, `BARE_BONES_CHAIN_OVERRIDES`) hold only addresses / template names — they don't trigger network fetches, so they don't contribute to the leak.

### 2026-05-29 — payments + formation e2e coverage

globalSetup now also brings up BareBonesApi on :7423 (idempotent — reuses
any already-running instance, spawns a detached `npm run dev` otherwise)
so SIWE-gated frontend code paths stop short-circuiting on /siwe/nonce
failures during tests. Skip with `PLAYWRIGHT_SKIP_API=1`.

Added three Playwright spec files to widen the e2e net:

- [tests/payments-permissions.spec.ts](tests/payments-permissions.spec.ts) —
  admin (anvil #0, org owner) vs. non-admin (anvil #1, foreign EOA) on
  `/payments/:slug` for both `?tab=batches` and `?tab=payrolls`. Asserts the
  ⚡ Admin badge, "Create batch" control, and Create-empty button visibility/
  enablement match the role.
- [tests/payments-batch-payroll.spec.ts](tests/payments-batch-payroll.spec.ts)
  — deploy org+DAO, create a pay batch, then start an empty payroll. Stops
  at "Open cycles shows Payroll #N" — see "why not finalize" above.
- [tests/entity-formation.spec.ts](tests/entity-formation.spec.ts) —
  unconnected vs. connected gate verification on `/entities/formation`.
  Asserts the wallet-required notice disappears once a wallet is connected
  and one of the downstream gates fires instead.

Why: until now, the only payroll/formation regression net was unit tests on
the contract side and visual inspection on the frontend. The MTA role-check
path on PayrollManager admin actions is the kind of code where a silent
"true" for a foreign EOA passes every contract test (because the contracts
are correct) while the *frontend* erroneously enabling the button is what
ships the bug. The permissions spec catches that class directly.
