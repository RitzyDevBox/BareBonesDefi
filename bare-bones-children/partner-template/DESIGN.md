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

## Changelog

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
