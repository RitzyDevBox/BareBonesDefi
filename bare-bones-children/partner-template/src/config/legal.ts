// Variable injection for the legal docs rendered in Settings (Privacy
// Policy today; ToS / other notices to follow as needed).
//
// Source of truth is the canonical markdown at
// `docs/privacy_policy_template.md` (monorepo root) — that's what counsel
// reviews. At render time the {{COMPANY_NAME}}-style placeholders get
// replaced with the values below, which come from `VITE_LEGAL_*` env vars
// at build time. Anything unset falls back to an obvious placeholder so a
// dev build is visually correct but clearly not configured for prod.
//
// When you bump the policy text, only the `LAST_UPDATED_DATE` needs to
// move; EFFECTIVE_DATE is the original go-live and shouldn't change.

export interface LegalVars {
  COMPANY_NAME: string
  SERVICE_NAME: string
  WEBSITE_URL: string
  COMPANY_ADDRESS: string
  PRIVACY_CONTACT_EMAIL: string
  EFFECTIVE_DATE: string
  LAST_UPDATED_DATE: string
}

function fromEnv(key: string, fallback: string): string {
  const raw = (import.meta.env as Record<string, string | undefined>)[
    `VITE_LEGAL_${key}`
  ]
  return raw && raw.trim().length > 0 ? raw : fallback
}

// Defaults are deliberately not bracketed — earlier "[Your Company, Inc.]"
// values read like unsubstituted template tokens in the rendered policy
// and confused testers. Unbracketed dummy strings make it clear the
// variables ARE being substituted; the placeholder content still signals
// "not prod-configured" via the obviously-fake "Dummy" prefix.
export const LEGAL_VARS: LegalVars = {
  COMPANY_NAME: fromEnv("COMPANY_NAME", "Dummy Company, Inc."),
  SERVICE_NAME: fromEnv("SERVICE_NAME", "Dummy DAO Service"),
  WEBSITE_URL: fromEnv("WEBSITE_URL", "https://dummy.example"),
  COMPANY_ADDRESS: fromEnv(
    "COMPANY_ADDRESS",
    "123 Dummy Street, Cheyenne, WY 82001",
  ),
  PRIVACY_CONTACT_EMAIL: fromEnv("PRIVACY_CONTACT_EMAIL", "privacy@dummy.example"),
  EFFECTIVE_DATE: fromEnv("EFFECTIVE_DATE", "January 1, 2026"),
  LAST_UPDATED_DATE: fromEnv("LAST_UPDATED_DATE", "May 24, 2026"),
}
