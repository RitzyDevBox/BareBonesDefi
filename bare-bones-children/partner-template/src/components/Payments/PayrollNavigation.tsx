export type PayrollNavTab = "overview" | "batches" | "earnings" | "payrolls";

interface PayrollNavigationProps {
  tab: PayrollNavTab;
  onChange: (next: PayrollNavTab) => void;
  isAdmin?: boolean;
  disabled?: boolean;
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

export function PayrollNavigation({ tab, onChange, isAdmin = false, disabled = false }: PayrollNavigationProps) {
  const idx = PAYROLL_TABS.findIndex((t) => t.id === tab);
  const prev = () => onChange(PAYROLL_TABS[(idx - 1 + PAYROLL_TABS.length) % PAYROLL_TABS.length].id);
  const next = () => onChange(PAYROLL_TABS[(idx + 1) % PAYROLL_TABS.length].id);

  return (
    <nav className="bb-pn" role="tablist" aria-label="Payroll sections">
      <button className="bb-pn-arrow" onClick={prev} disabled={disabled} aria-label="Previous tab">
        ‹
      </button>

      <div className="bb-pn-tabs">
        {PAYROLL_TABS.map((t) => (
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
        {PAYROLL_TABS.map((t) => (
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
