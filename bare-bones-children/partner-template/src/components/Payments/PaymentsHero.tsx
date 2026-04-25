interface PaymentsHeroProps {
  orgSlug: string | null;
  chainName?: string;
}

export function PaymentsHero({ orgSlug, chainName }: PaymentsHeroProps) {
  return (
    <section className="bb-hero">
      <div className="bb-hero-top">
        <div>
          <div className="bb-hero-crumb">
            {orgSlug ? `${orgSlug}` : "No organization"}
            {chainName ? ` · ${chainName}` : ""} · Payroll
          </div>
          <h1>Payments</h1>
          <div className="bb-hero-sub">
            Manage payees, define earnings codes, group payees into batches, and run payroll cycles.
          </div>
        </div>
        <div className="bb-hero-meta">
          {orgSlug && (
            <div>
              Org · <b>{orgSlug}</b>
            </div>
          )}
          {chainName && (
            <div>
              Chain · <b>{chainName}</b>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
