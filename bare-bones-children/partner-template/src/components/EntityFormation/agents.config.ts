import type { FormationAgent } from "./types";

// Wyoming registered agent options offered in the formation wizard.
// Pricing + coverage copy comes from each provider's public pricing page;
// review periodically and bump the version below if anything changes so
// stale renders downstream are easy to spot.
export const REGISTERED_AGENTS_VERSION = 1;

export const REGISTERED_AGENTS: FormationAgent[] = [
  {
    id: "cloudpeak",
    name: "Cloud Peak Law Group",
    price: 49,
    coverage: "Mail forwarding · scan-to-email",
    badge: "recommended",
  },
  {
    id: "northwest",
    name: "Northwest Registered Agent",
    price: 125,
    coverage: "Mail forwarding · privacy address",
    badge: null,
  },
  {
    id: "wytrust",
    name: "Wyoming Trust & LLC",
    price: 59,
    coverage: "Mail forwarding only",
    badge: null,
  },
  {
    id: "rai",
    name: "Registered Agents Inc.",
    price: 200,
    coverage: "Mail forwarding + privacy address service",
    badge: null,
  },
];
