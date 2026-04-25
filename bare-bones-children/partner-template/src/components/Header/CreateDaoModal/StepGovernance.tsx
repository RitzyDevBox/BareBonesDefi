import { type GovernanceForm, blocksToTime } from "./validation";

interface StepGovernanceProps {
  form: GovernanceForm;
  onChange: (next: Partial<GovernanceForm>) => void;
}

export function StepGovernance({ form, onChange }: StepGovernanceProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p className="bb-muted bb-small" style={{ margin: 0 }}>
        Configure how proposals move through the governor. Block-based fields show the rough time at 12s blocks.
      </p>

      <div className="bb-field-grid">
        <div className="bb-field bb-full">
          <label>Governance token</label>
          <input
            className="bb-input bb-mono"
            type="text"
            value={form.token}
            onChange={(e) => onChange({ token: e.target.value })}
            placeholder="0x…"
          />
          <div className="bb-field-hint">ERC20Votes-compatible token contract address.</div>
        </div>

        <div className="bb-field">
          <label>Timelock delay (seconds)</label>
          <input
            className="bb-input bb-mono"
            type="text"
            inputMode="numeric"
            value={form.timelockDelay}
            onChange={(e) => onChange({ timelockDelay: e.target.value.replace(/[^0-9]/g, "") })}
          />
        </div>

        <div className="bb-field">
          <label>Quorum (%)</label>
          <input
            className="bb-input bb-mono"
            type="text"
            inputMode="numeric"
            value={form.quorumNumerator}
            onChange={(e) => onChange({ quorumNumerator: e.target.value.replace(/[^0-9]/g, "") })}
          />
        </div>

        <div className="bb-field">
          <label>Voting delay (blocks)</label>
          <input
            className="bb-input bb-mono"
            type="text"
            inputMode="numeric"
            value={form.votingDelay}
            onChange={(e) => onChange({ votingDelay: e.target.value.replace(/[^0-9]/g, "") })}
          />
          <div className="bb-field-hint">{blocksToTime(form.votingDelay) || "—"}</div>
        </div>

        <div className="bb-field">
          <label>Voting period (blocks)</label>
          <input
            className="bb-input bb-mono"
            type="text"
            inputMode="numeric"
            value={form.votingPeriod}
            onChange={(e) => onChange({ votingPeriod: e.target.value.replace(/[^0-9]/g, "") })}
          />
          <div className="bb-field-hint">{blocksToTime(form.votingPeriod) || "—"}</div>
        </div>

        <div className="bb-field bb-full">
          <label>Proposal threshold (raw token units)</label>
          <input
            className="bb-input bb-mono"
            type="text"
            inputMode="numeric"
            value={form.proposalThreshold}
            onChange={(e) => onChange({ proposalThreshold: e.target.value.replace(/[^0-9]/g, "") })}
          />
        </div>
      </div>
    </div>
  );
}
