export type PayrollNavTab = "overview" | "batches" | "earnings" | "payrolls" | "distributions";

interface PayrollNavigationProps {
  tab: PayrollNavTab;
  onChange: (next: PayrollNavTab) => void;
  isAdmin?: boolean;
  disabled?: boolean;
  // Distributions is a second Payments mode behind its own feature flag — append its tab when on.
  showDistributions?: boolean;
}

interface TabSpec {
  id: PayrollNavTab;
  label: string;
  sub: string;
}

export const PAYROLL_TABS: TabSpec[] = [
  { id: "overview", label: "Overview", sub: "Payees" },
  { id: "batches", label: "Pay Batches", sub: "Default assignments" },
  { id: "earnings", label: "Earnings", sub: "Codes & catalog" },
  { id: "payrolls", label: "Payrolls", sub: "Cycles & runs" },
];

const DISTRIBUTIONS_TAB: TabSpec = { id: "distributions", label: "Distributions", sub: "Pay by ownership" };

export function PayrollNavigation({
  tab,
  onChange,
  isAdmin = false,
  disabled = false,
  showDistributions = false,
}: PayrollNavigationProps) {
  const tabs = showDistributions ? [...PAYROLL_TABS, DISTRIBUTIONS_TAB] : PAYROLL_TABS;
  const idx = tabs.findIndex((t) => t.id === tab);
  const prev = () => onChange(tabs[(idx - 1 + tabs.length) % tabs.length].id);
  const next = () => onChange(tabs[(idx + 1) % tabs.length].id);

  return (
    <nav className="bb-pn" role="tablist" aria-label="Payroll sections">
      <button className="bb-pn-arrow" onClick={prev} disabled={disabled} aria-label="Previous tab">
        ‹
      </button>

      <div className="bb-pn-tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={t.id === tab}
            className={`bb-pn-tab${t.id === tab ? " bb-active" : ""}`}
            onClick={() => !disabled && onChange(t.id)}
            disabled={disabled}
          >
            <span className="bb-pn-tab-l">{t.label}</span>
            <span className="bb-pn-tab-s">{t.sub}</span>
          </button>
        ))}
      </div>

      <select
        className="bb-pn-select"
        value={tab}
        onChange={(e) => onChange(e.target.value as PayrollNavTab)}
        disabled={disabled}
        aria-label="Payroll section"
      >
        {tabs.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
          </option>
        ))}
      </select>

      <button className="bb-pn-arrow" onClick={next} disabled={disabled} aria-label="Next tab">
        ›
      </button>

      {isAdmin && <span className="bb-pn-admin">⚡ Admin</span>}
    </nav>
  );
}
