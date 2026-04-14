# AGENTS.md

This file gives coding agents project-specific guidance for `bare-bones-children/partner-template`.

## Project layout

- App root: `bare-bones-children/partner-template`
- Main app source: `src/`
- Pages live in: `src/pages/`
- Reusable low-level UI primitives live in:
  - `src/components/BasicComponents.tsx`
  - `src/components/Primitives.tsx`
  - `src/components/Primitives/`
- Common app-level wrappers live in:
  - `src/components/PageWrapper/`
- Buttons live in:
  - `src/components/Button/`
- Form controls live in:
  - `src/components/FormField/`
  - `src/components/Inputs/`
  - `src/components/Select/`

## UI conventions

- Prefer existing primitives before creating new UI wrappers.
- For simple surface/card/input building blocks, check `src/components/BasicComponents.tsx` first.
- For layout helpers like stacks/rows/clickable surfaces, check:
  - `src/components/Primitives.tsx`
- For typography, use:
  - `src/components/Primitives/Text.tsx`
- For icon/button actions, reuse existing button components in:
  - `src/components/Button/`
  - `src/components/Button/Actions/`
- Keep styling inline when that matches surrounding code. This codebase frequently uses inline style objects rather than separate CSS modules for page-local layout.

## Themes

Theme files live in `src/themes/`.

Important files:
- `src/themes/lightTheme.ts`
- `src/themes/darkTheme.ts`
- `src/themes/baseTheme.ts`
- `src/themes/theme.ts`
- `src/themes/AppThemeProvider.tsx`

Theme notes:
- Light and dark themes both derive from `baseTheme`.
- Use CSS variables and theme tokens instead of hardcoding colors when possible.
- Common token patterns in components include:
  - `var(--colors-surface)`
  - `var(--colors-text-main)`
  - `var(--colors-text-muted)`
  - `var(--colors-border)`
  - `var(--colors-primary)`
- If a one-off test value is truly page-specific and not reusable, it can stay local to that page instead of being added to global constants.

## Constants

Check constants in:
- `src/constants/misc.ts`
- `src/constants/featureFlags.ts`
- `src/constants/payroll.ts`

Guidance:
- Put app-wide addresses, config, chain info, and long-lived defaults in `src/constants/misc.ts`.
- Put feature gating in `src/constants/featureFlags.ts`.
- Put payroll-specific labels/defaults in `src/constants/payroll.ts`.
- Do **not** put temporary test-only values into `misc.ts` unless they are truly shared application config.
- Page-local testing constants should remain near the page that uses them.

## Transactions

Preferred transaction workflow:
- Build transaction calls with `useExecuteRawTx` from:
  - `src/hooks/useExecuteRawTx.ts`
- `useExecuteRawTx` expects:
  - a raw-tx builder returning `{ to, data, value? }`
  - a success message builder
- It already handles:
  - wallet/provider/account checks
  - toast lifecycle integration
  - duplicate submission guard
  - waiting for 1 confirmation
  - triggering tx refresh after success

### How to make code compatible with `useExecuteRawTx`

- Build tx data with `ethers.utils.Interface(...).encodeFunctionData(...)` or `contract.populateTransaction...`.
- Return a raw tx object only; do not send the transaction manually if using `useExecuteRawTx`.
- Keep builder inputs serializable/simple where possible.
- Use clear success messages because they are reused in refresh metadata and user feedback.

Example pattern:
- Create interface with ABI via `useMemo`
- Create `useExecuteRawTx(builder, successMessage)`
- Call returned function from UI handlers
- Use local loading state only for page/UI coordination, not for duplicating the transaction mechanics already handled by the hook

## Refreshing state after transactions

Use `useTxRefresh` from:
- `src/providers/TxRefreshProvider.tsx`

Notes:
- `useExecuteRawTx` already triggers `useTxRefresh().triggerRefresh(...)` after a successful confirmed transaction.
- Data-loading pages should subscribe to `version` from `useTxRefresh()` and include it in effect dependencies when transaction-driven reloads are needed.
- The provider intentionally uses a delay (`DEFAULT_REFRESH_DELAY`) to allow indexed/subgraph-backed state to catch up.
- `useTxRefresh()` has a safe fallback when the provider is absent, but app pages should still assume the provider exists in normal usage.

## Organization / payroll patterns

Organization and payroll-related contract patterns are centered around:
- `src/abis/paymentPipelines/PayrollManager.abi.json`
- `src/hooks/payroll/useOrganizationRegistry.ts`
- `src/utils/payroll/fetchPayeesByOrganization.ts`

Guidance:
- Reuse `useOwnedOrganizations` and `fetchOrganizationInfo` instead of duplicating organization lookup logic in pages.
- When a page needs organization selection + creation, reuse:
  - `src/components/Organizations/OrganizationPicker.tsx`
- The Payments page is the main reference implementation for organization-driven workflows:
  - `src/pages/PaymentPage.tsx`

## Routing and navigation

Routes live in:
- `src/routes.ts`
- `src/Router.tsx`

Top-level nav config lives in:
- `src/components/PageWrapper/navConfig.ts`

When adding a page:
- add the route helper to `src/routes.ts`
- wire the route in `src/Router.tsx`
- add nav entry in `navConfig.ts` if it belongs in main navigation

## Editing guidance for this repo

- Prefer minimal surgical edits.
- Match existing inline-style-heavy React patterns.
- Prefer existing components/utilities/hooks over new abstractions.
- If extracting shared logic, place it near the domain it belongs to, e.g. payroll/org helpers under `src/hooks/payroll/` or `src/utils/payroll/`.
- Avoid inventing new global config for temporary staging/testing-only values.
- For blockchain state that must survive refreshes, do not use `localStorage` as the source of truth unless the requirement is explicitly local-only UI memory.
