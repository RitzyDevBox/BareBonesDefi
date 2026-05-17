import { type GovernanceForm, type FactoryTokenForm, blocksToTime } from "./validation";
import { AddressListField } from "./AddressListField";
import { TokenUnitsInput } from "../../Inputs/TokenUnitsInput";

interface StepGovernanceProps {
  form: GovernanceForm;
  onChange: (next: Partial<GovernanceForm>) => void;
  /** When false, the chain has no TokenFactory deployed — the factory toggle
   *  is hidden and the form locks to BYO mode. */
  tokenFactoryAvailable: boolean;
}

const emptyFactoryDefaults: FactoryTokenForm = {
  name: "",
  symbol: "",
  mintable: true,
  allocations: [{ holder: "", amount: "" }],
  initialMinters: [],
  initialPausers: [],
};

export function StepGovernance({ form, onChange, tokenFactoryAvailable }: StepGovernanceProps) {
  const isFactory = form.tokenSource.mode === "factory";
  const factory = form.tokenSource.mode === "factory" ? form.tokenSource.factory : null;
  const byoToken = form.tokenSource.mode === "byo" ? form.tokenSource.byoToken : "";

  function setMode(mode: "factory" | "byo") {
    if (mode === "factory") {
      onChange({ tokenSource: { mode: "factory", factory: factory ?? emptyFactoryDefaults } });
    } else {
      onChange({ tokenSource: { mode: "byo", byoToken } });
    }
  }

  function patchFactory(patch: Partial<FactoryTokenForm>) {
    if (!factory) return;
    onChange({ tokenSource: { mode: "factory", factory: { ...factory, ...patch } } });
  }

  function updateAllocation(idx: number, patch: Partial<{ holder: string; amount: string }>) {
    if (!factory) return;
    const next = factory.allocations.map((a, i) => (i === idx ? { ...a, ...patch } : a));
    patchFactory({ allocations: next });
  }

  function addAllocationRow() {
    if (!factory) return;
    patchFactory({ allocations: [...factory.allocations, { holder: "", amount: "" }] });
  }

  function removeAllocationRow(idx: number) {
    if (!factory) return;
    const next = factory.allocations.filter((_, i) => i !== idx);
    patchFactory({ allocations: next.length === 0 ? [{ holder: "", amount: "" }] : next });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <p className="bb-muted bb-small" style={{ margin: 0 }}>
        Choose how the governance token is sourced, then configure how proposals move through the governor.
      </p>

      {/* ── Token-source toggle ─────────────────────────────────────────────
       * Uses the shared `.bb-seg` / `.bb-seg-btn` segmented control pattern
       * (defined in payments.css, also used by the earnings rule-kind picker).
       * Two buttons in a bordered flex container; active button picks up the
       * accent-tinted bg + border. `bb-seg-btn-sub` renders the mono secondary
       * line below the primary label.
       */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <label style={{ fontWeight: 600 }}>Governance token</label>
        <div className="bb-seg">
          <button
            type="button"
            className={`bb-seg-btn${isFactory ? " bb-active" : ""}`}
            onClick={() => setMode("factory")}
            disabled={!tokenFactoryAvailable}
          >
            <span className="bb-seg-btn-label">Deploy new</span>
            <span className="bb-seg-btn-sub">
              {tokenFactoryAvailable ? "RECOMMENDED · MTA-OWNED" : "TOKEN FACTORY NOT DEPLOYED"}
            </span>
          </button>
          <button
            type="button"
            className={`bb-seg-btn${!isFactory ? " bb-active" : ""}`}
            onClick={() => setMode("byo")}
          >
            <span className="bb-seg-btn-label">Use existing</span>
            <span className="bb-seg-btn-sub">BYO ERC20VOTES</span>
          </button>
        </div>
        {!tokenFactoryAvailable && (
          <div className="bb-field-hint bb-muted">
            TokenFactory not deployed on this chain — falling back to "Use existing" only.
          </div>
        )}
      </div>

      {/* ── Token body — both modes use the same bb-field-grid layout so the
           visual rhythm matches. Factory mode populates more fields; BYO
           shows just the address with a contextual hint. ───────────────── */}
      <div className="bb-field-grid">
        {isFactory && factory && (
          <>
            <div className="bb-field">
              <label>Token name</label>
              <input
                className="bb-input"
                type="text"
                value={factory.name}
                onChange={(e) => patchFactory({ name: e.target.value })}
                placeholder="ACME Equity"
              />
            </div>

            <div className="bb-field">
              <label>Symbol</label>
              <input
                className="bb-input bb-mono"
                type="text"
                value={factory.symbol}
                onChange={(e) => patchFactory({ symbol: e.target.value })}
                placeholder="ACME"
              />
            </div>

            <div className="bb-field bb-full" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                id="mintable-toggle"
                checked={factory.mintable}
                onChange={(e) => patchFactory({ mintable: e.target.checked })}
              />
              <label htmlFor="mintable-toggle" style={{ margin: 0 }}>
                Mintable (cap table can grow post-deploy)
              </label>
              <div className="bb-field-hint bb-muted" style={{ marginLeft: 12 }}>
                Immutable. If unchecked, <span className="bb-mono">mint()</span> reverts forever.
              </div>
            </div>

            <div className="bb-field bb-full">
              <label>Initial allocations</label>
              <div className="bb-field-hint">
                Tokens minted at deploy, in whole-token units (e.g. "100" = 100 tokens).
                Token is deployed paused — transfers blocked until the org unpauses.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
                {factory.allocations.map((row, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 6 }}>
                    <input
                      className="bb-input bb-mono"
                      type="text"
                      value={row.holder}
                      placeholder="0x… holder address"
                      onChange={(e) => updateAllocation(i, { holder: e.target.value })}
                    />
                    <TokenUnitsInput
                      className="bb-input bb-mono"
                      value={row.amount}
                      placeholder="Amount (tokens)"
                      onChange={(amount) => updateAllocation(i, { amount })}
                    />
                    <button
                      type="button"
                      className="bb-icon-btn-sm"
                      onClick={() => removeAllocationRow(i)}
                      aria-label="Remove allocation row"
                      disabled={factory.allocations.length === 1}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="bb-addr-list-add"
                  style={{ alignSelf: "start" }}
                  onClick={addAllocationRow}
                >
                  + Add allocation
                </button>
              </div>
            </div>

            {/* ── Initial minters — staged-list, not a textarea ─────────── */}
            <div className="bb-field bb-full">
              <AddressListField
                label="Initial minters (optional)"
                subtitle={
                  "Wallets that get TOKEN_MINTER_ROLE in this org. Leave empty to keep minting " +
                  "behind a governance proposal — the timelock (Super Admin) can always mint via " +
                  "auth.execute() without holding this role, so empty here means 'DAO-vote-only minting.'"
                }
                values={factory.initialMinters}
                onChange={(initialMinters) => patchFactory({ initialMinters })}
              />
            </div>

            {/* ── Initial pausers — same pattern ───────────────────────── */}
            <div className="bb-field bb-full">
              <AddressListField
                label="Initial pausers (optional)"
                subtitle={
                  "Wallets that get TOKEN_PAUSER_ROLE. Same default story as minters — empty " +
                  "means only Super Admin (timelock) can pause/unpause token transfers."
                }
                values={factory.initialPausers}
                onChange={(initialPausers) => patchFactory({ initialPausers })}
              />
            </div>
          </>
        )}

        {!isFactory && (
          <div className="bb-field bb-full">
            <label>Existing ERC20Votes token</label>
            <input
              className="bb-input bb-mono"
              type="text"
              value={byoToken}
              onChange={(e) => onChange({ tokenSource: { mode: "byo", byoToken: e.target.value } })}
              placeholder="0x…"
            />
            <div className="bb-field-hint">
              Must implement ERC20Votes. MTA does no token-side wiring in BYO mode — the org
              keeps existing ownership / auth on the token.
            </div>
          </div>
        )}
      </div>

      {/* ── Governor params ─────────────────────────────────────────────── */}
      <div className="bb-field-grid">
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
          <label>Proposal threshold (tokens)</label>
          <TokenUnitsInput
            className="bb-input bb-mono"
            value={form.proposalThreshold}
            placeholder="1"
            onChange={(proposalThreshold) => onChange({ proposalThreshold })}
          />
          <div className="bb-field-hint">
            Minimum balance (in whole tokens) a wallet must hold to create a proposal.
          </div>
        </div>
      </div>
    </div>
  );
}
