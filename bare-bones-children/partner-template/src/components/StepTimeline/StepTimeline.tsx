// Reusable vertical step timeline — the "cool" progress component from the Distributions surface,
// extracted so other flows (payroll processing, multi-step funding, …) share the exact same look:
// numbered dots that fill with the accent + a check when done, a spinner on the active step, and a
// connector rail that lights up as you advance. Themed off the global --accent/--text/--line tokens.
import "./stepTimeline.css";

export type StepState = "done" | "active" | "pending";

export interface TimelineStep {
  key: string;
  label: string;
  /** Optional secondary line under the label. */
  sub?: string;
  state: StepState;
}

const Check = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export function StepTimeline({
  steps,
  testIdPrefix,
}: {
  steps: TimelineStep[];
  /** When set, each row gets `data-testid={`${testIdPrefix}-${step.key}`}` + `data-status`. */
  testIdPrefix?: string;
}) {
  return (
    <div className="bb-timeline" role="list">
      {steps.map((s, i) => (
        <div
          key={s.key}
          className={`bb-timeline-step ${s.state}`}
          role="listitem"
          data-testid={testIdPrefix ? `${testIdPrefix}-${s.key}` : undefined}
          data-status={s.state}
        >
          <div className="bb-timeline-rail">
            <span className="bb-timeline-dot">
              {s.state === "done" ? <Check /> : s.state === "active" ? <span className="bb-timeline-spin" /> : i + 1}
            </span>
            {i < steps.length - 1 && <span className="bb-timeline-line" />}
          </div>
          <div className="bb-timeline-body">
            <div className="bb-timeline-label">{s.label}</div>
            {s.sub && <div className="bb-timeline-sub">{s.sub}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
