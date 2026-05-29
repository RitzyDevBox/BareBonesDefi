import type { FormationAgent } from "./types";

// Wyoming registered agent options offered in the formation wizard.
//
// PLACEHOLDER ENTRIES — these are NOT real partnerships. Names + pricing
// are fabricated so the SERVICE-mode flow is exercisable end-to-end during
// staging. Before going live, replace each entry with a real partner (and
// mirror the change in `AGENT_SERVICES` in
// [BareBonesApi/src/templates/merge-fields.ts] — keys must match) or
// remove the entry. Never list a real third-party brand here without a
// signed partnership.
//
// When swapping real partners in: keep the same `id` if the partner is
// replacing a placeholder slot (existing drafts persist `agentServiceKey`
// by id, so changing the id orphans them). Bump REGISTERED_AGENTS_VERSION
// so any cached/snapshotted renders downstream invalidate.
export const REGISTERED_AGENTS_VERSION = 2;

export const REGISTERED_AGENTS: FormationAgent[] = [
  {
    id: "acme",
    name: "Acme Agent Services",
    price: 49,
    coverage: "Mail forwarding · scan-to-email",
    badge: "recommended",
  },
  {
    id: "beta",
    name: "Beta Mail Forwarding",
    price: 125,
    coverage: "Mail forwarding · privacy address",
    badge: null,
  },
  {
    id: "gamma",
    name: "Gamma Trust Services",
    price: 59,
    coverage: "Mail forwarding only",
    badge: null,
  },
  {
    id: "delta",
    name: "Delta Privacy Agent Inc.",
    price: 200,
    coverage: "Mail forwarding + privacy address service",
    badge: null,
  },
];
