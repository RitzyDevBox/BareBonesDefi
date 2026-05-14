import { Link } from "react-router-dom";
import { ROUTES } from "../routes";

/**
 * Landing page. Mirrors `Designs/Bare Bones/app/landing.jsx` — hero +
 * bordered 4-pillar grid. The "Formation" pillar from the original
 * design is intentionally not exposed here yet (the WY DAO LLC flow
 * is a separate workstream); the four pillars in the live app route
 * to surfaces that actually exist today.
 *
 * Layout: wrapped in `.bb-landing` which counteracts the <main>
 * `page-padding` (App.tsx) via negative margins so the hero and
 * pillars stretch to the viewport edges and the page picks up the
 * design's own background. Each section uses `.bb-container` (the
 * design's 1200px max-width content shell) for its inner alignment.
 *
 * Styling lives in `src/styles/payments.css` under the `bb-hero-*` /
 * `bb-pillars-*` / `bb-container` / `bb-landing` classes; see
 * skills/apply-design-styles for the convention.
 */

type Pillar = {
  key: string;
  kicker: string;
  title: string;
  body: string;
  cta: string;
  to: string;
  /** Compact glyph for the icon slot — keeps the component dependency-free.
   *  When the design adds proper SVG icons we'll swap these. */
  glyph: string;
};

const PILLARS: Pillar[] = [
  {
    key: "create",
    kicker: "01 — Deploy",
    title: "Create your DAO",
    body:
      "Pick a governance token (or deploy a fresh one), set the rules — voting delay, period, quorum, and timelock — and deploy contracts to the chain you're connected to.",
    cta: "Open governance",
    to: ROUTES.DAOS,
    glyph: "◇",
  },
  {
    key: "organize",
    kicker: "02 — Organize",
    title: "Run the org",
    body:
      "Member roster, roles, permissions. MultiTenantAuth handles per-slug auth; you onboard members at launch and the rest is just role assignment.",
    cta: "Open organizations",
    to: ROUTES.ORGANIZATIONS,
    glyph: "❖",
  },
  {
    key: "treasury",
    kicker: "03 — Hold",
    title: "Manage your treasury",
    body:
      "A vault for long-term reserves with rule-based controls. Track balances and route transactions through governance proposals.",
    cta: "Open vaults",
    to: ROUTES.VAULTS,
    glyph: "◆",
  },
  {
    key: "pay",
    kicker: "04 — Pay",
    title: "Pay your members",
    body:
      "Batch payouts, recurring payrolls, and a member roster with roles and earnings. Every payment is an executed proposal — on-chain, with a receipt.",
    cta: "Open payments",
    to: ROUTES.PAYMENTS,
    glyph: "✦",
  },
];

export function LandingPage() {
  return (
    <div className="bb-landing">
      <section className="bb-ld-hero">
        <div className="bb-container bb-ld-hero-grid">
          <div>
            <div className="bb-eyebrow">For collectives that want a real legal home</div>
            <h1>
              The bare bones<br />
              of a <em>real DAO</em>.
            </h1>
            <p className="bb-ld-hero-sub">
              Four things every DAO actually needs — governance contracts, an org
              roster, a treasury, and a way to pay people. Bare Bones gives you
              those, in order, and skips everything else.
            </p>
            <div className="bb-ld-hero-cta">
              <Link to={ROUTES.DAOS} className="bb-btn-primary">
                Create your DAO →
              </Link>
              <Link to={ROUTES.VAULTS} className="bb-btn-ghost">
                Already deployed? Open the treasury
              </Link>
            </div>
          </div>
          {/* Right-hand column intentionally empty — the design uses it for a
              future visual; for now the hero-grid keeps the 1.2fr / 1fr ratio
              so the H1 doesn't sprawl across the full width on wide screens. */}
          <div />
        </div>
      </section>

      <section className="bb-pillars-section">
        <div className="bb-container">
          <div className="bb-pillars-head">
            <h2>
              Four <em>pillars</em>.
            </h2>
            <div className="bb-eyebrow">Everything Bare Bones does</div>
          </div>
          <div className="bb-pillars">
            {PILLARS.map(({ key, kicker, title, body, cta, to, glyph }) => (
              <Link key={key} to={to} className="bb-pillar">
                <div className="bb-pillar-icon" aria-hidden>{glyph}</div>
                <div className="bb-pillar-num">{kicker}</div>
                <div className="bb-pillar-title">{title}</div>
                <div className="bb-pillar-body">{body}</div>
                <div className="bb-pillar-cta">
                  {cta} →
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
