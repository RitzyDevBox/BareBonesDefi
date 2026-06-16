// PayrollNavigation — shared tab bar across Overview / Pay Batches / Earnings / Payrolls.
//
// Desktop  : center segmented pills with prev/next arrows.
// Mobile   : prev/next arrows + compact <select> dropdown.
//
// Wired into PaymentsPage which keeps a `payrollTab` state and passes setter in.

const PAYROLL_TABS = [
  { id: 'overview',  label: 'Overview',    sub: 'Payees' },
  { id: 'batches',   label: 'Pay Batches', sub: 'Default assignments' },
  { id: 'earnings',  label: 'Earnings',    sub: 'Codes & catalog' },
  { id: 'payrolls',  label: 'Payrolls',    sub: 'Cycles & runs' },
  { id: 'distributions', label: 'Distributions', sub: 'Shareholder payouts' },
];

function PayrollNavigation({ tab, onChange, isAdmin }) {
  const idx = PAYROLL_TABS.findIndex(t => t.id === tab);
  const prev = () => onChange(PAYROLL_TABS[(idx - 1 + PAYROLL_TABS.length) % PAYROLL_TABS.length].id);
  const next = () => onChange(PAYROLL_TABS[(idx + 1) % PAYROLL_TABS.length].id);

  return (
    <nav className="pn" role="tablist" aria-label="Payroll sections">
      <button className="pn-arrow" onClick={prev} aria-label="Previous tab"><I.Caret size={14} style={{ transform: 'rotate(90deg)' }} /></button>

      {/* desktop: segmented pills */}
      <div className="pn-tabs">
        {PAYROLL_TABS.map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={t.id === tab}
            className={`pn-tab${t.id === tab ? ' active' : ''}`}
            onClick={() => onChange(t.id)}
          >
            <span className="pn-tab-l">{t.label}</span>
            <span className="pn-tab-s">{t.sub}</span>
          </button>
        ))}
      </div>

      {/* mobile: compact select */}
      <select
        className="pn-select"
        value={tab}
        onChange={e => onChange(e.target.value)}
        aria-label="Payroll section"
      >
        {PAYROLL_TABS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
      </select>

      <button className="pn-arrow" onClick={next} aria-label="Next tab"><I.Caret size={14} style={{ transform: 'rotate(-90deg)' }} /></button>

      {isAdmin && <span className="pn-admin" title="Admin permissions active"><I.Bolt size={11} /> Admin</span>}
    </nav>
  );
}

Object.assign(window, { PayrollNavigation, PAYROLL_TABS });
