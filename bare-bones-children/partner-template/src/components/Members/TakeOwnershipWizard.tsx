import { useEffect, useState } from "react";
import { MembersModal } from "./MembersModal";

interface TakeOwnershipWizardProps {
  /** MTA address to forward ownership to; rendered for the user to copy. */
  mtaAddress: string;
  onClose: () => void;
  onComplete: (entry: { address: string; name: string }) => void;
}

const STEPS = ["Pre-claim", "Transfer ownership", "Register"] as const;

const ETH_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

interface Form {
  contractAddress: string;
  contractName: string;
  preClaimed: boolean;
  ownershipVerified: boolean;
  registered: boolean;
}

const INITIAL: Form = {
  contractAddress: "",
  contractName: "",
  preClaimed: false,
  ownershipVerified: false,
  registered: false,
};

export function TakeOwnershipWizard({ mtaAddress, onClose, onComplete }: TakeOwnershipWizardProps) {
  const [stepIdx, setStepIdx] = useState(0);
  const [form, setForm] = useState<Form>(INITIAL);

  // Auto-advance to step 2 once pre-claim succeeds, etc. Keeps the flow snappy
  // without surprising the user — they always click the action button first.
  useEffect(() => {
    if (form.preClaimed && stepIdx === 0) setStepIdx(1);
  }, [form.preClaimed, stepIdx]);
  useEffect(() => {
    if (form.ownershipVerified && stepIdx === 1) setStepIdx(2);
  }, [form.ownershipVerified, stepIdx]);

  function set<K extends keyof Form>(k: K, v: Form[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const validAddress = ETH_ADDRESS_RE.test(form.contractAddress.trim());

  function copyMta() {
    void navigator.clipboard?.writeText(mtaAddress);
  }

  function preClaim() {
    if (!validAddress) return;
    set("preClaimed", true);
  }

  function verifyOwnership() {
    set("ownershipVerified", true);
  }

  function register() {
    if (!form.ownershipVerified) return;
    set("registered", true);
    onComplete({
      address: form.contractAddress.trim(),
      name: form.contractName.trim() || `External · ${form.contractAddress.slice(0, 6)}…${form.contractAddress.slice(-4)}`,
    });
  }

  const footer = (
    <>
      <div className="bb-amw-foot-hint">
        {stepIdx === 0 && "Pre-claim reserves your intent on-chain so an attacker can't frontrun the registration."}
        {stepIdx === 1 && "After pre-claim, transfer ownership of the contract to the MTA. We'll verify on-chain."}
        {stepIdx === 2 && "Final step — register the contract under this slug. After this, MTA enforces all calls."}
      </div>
      <div className="bb-amw-foot-actions">
        <button className="bb-btn-ghost bb-btn-xs" onClick={onClose}>
          {form.registered ? "Done" : "Cancel"}
        </button>
        {!form.registered && stepIdx > 0 && (
          <button className="bb-btn-ghost bb-btn-xs" onClick={() => setStepIdx(stepIdx - 1)}>
            Back
          </button>
        )}
      </div>
    </>
  );

  return (
    <MembersModal
      kicker="Take ownership"
      title={form.contractName || form.contractAddress || "External contract"}
      onClose={onClose}
      footer={footer}
      steps={
        <div className="bb-amw-steps">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`bb-amw-step${i === stepIdx ? " bb-on" : ""}${i < stepIdx ? " bb-done" : ""}`}
            >
              <span className="bb-amw-step-num">{i + 1}</span>
              <span className="bb-amw-step-label">{s}</span>
            </div>
          ))}
        </div>
      }
    >
      <div className="bb-amw-body">
        {stepIdx === 0 && (
          <>
            <div className="bb-amw-section-head">External contract</div>
            <div className="bb-amw-grid">
              <div className="bb-amw-field bb-full">
                <label>Contract address</label>
                <input
                  className="bb-amw-input bb-mono"
                  value={form.contractAddress}
                  onChange={(e) => set("contractAddress", e.target.value)}
                  placeholder="0x… (must be IERC173-compatible)"
                  readOnly={form.preClaimed}
                />
              </div>
              <div className="bb-amw-field bb-full">
                <label>Display name (optional)</label>
                <input
                  className="bb-amw-input"
                  value={form.contractName}
                  onChange={(e) => set("contractName", e.target.value)}
                  placeholder="Treasury Safe, Liquidity Vault, …"
                  readOnly={form.preClaimed}
                />
              </div>
            </div>
            <div className="bb-amw-section-head">Pre-claim</div>
            <div className="bb-amw-empty" style={{ padding: 14 }}>
              Reserves your intent on-chain. Until step 3 completes, only this slug can register the contract — protects against frontrun.
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
              <button
                className="bb-btn-primary bb-btn-xs"
                disabled={!validAddress || form.preClaimed}
                onClick={preClaim}
              >
                {form.preClaimed ? "✓ Pre-claimed" : "Pre-claim contract"}
              </button>
            </div>
          </>
        )}

        {stepIdx === 1 && (
          <>
            <div className="bb-amw-section-head">Transfer ownership</div>
            <div className="bb-amw-grid">
              <div className="bb-amw-field bb-full">
                <label>Call this on the contract (as current owner)</label>
                <div style={{
                  padding: "10px 12px",
                  border: "1px solid var(--bb-border)",
                  borderRadius: 6,
                  background: "var(--bb-surface-subtle)",
                  fontFamily: "var(--bb-font-mono)",
                  fontSize: 12,
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  <span style={{ flex: 1, wordBreak: "break-all" }}>
                    transferOwnership(<span style={{ color: "var(--bb-success)" }}>{mtaAddress}</span>)
                  </span>
                  <button className="bb-btn-ghost bb-btn-xs" onClick={copyMta}>Copy MTA</button>
                </div>
              </div>
            </div>
            <div className="bb-amw-empty" style={{ padding: 14, marginTop: 10 }}>
              Once the transfer transaction confirms, click below to verify. We'll read <code>IERC173.owner()</code> from {form.contractAddress.slice(0, 6)}…{form.contractAddress.slice(-4)} and only advance if it matches the MTA address.
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10, gap: 8 }}>
              <button
                className={form.ownershipVerified ? "bb-btn-ghost bb-btn-xs" : "bb-btn-primary bb-btn-xs"}
                onClick={verifyOwnership}
                disabled={form.ownershipVerified}
              >
                {form.ownershipVerified ? "✓ Verified" : "Verify ownership"}
              </button>
            </div>
          </>
        )}

        {stepIdx === 2 && (
          <>
            <div className="bb-amw-section-head">Register under slug</div>
            <div className="bb-amw-grid">
              <div className="bb-amw-field bb-full">
                <label>Contract</label>
                <input className="bb-amw-input bb-mono" value={form.contractAddress} readOnly />
              </div>
              <div className="bb-amw-field bb-full">
                <label>Display name</label>
                <input
                  className="bb-amw-input"
                  value={form.contractName}
                  onChange={(e) => set("contractName", e.target.value)}
                  placeholder="External contract"
                  readOnly={form.registered}
                />
              </div>
            </div>
            <div className="bb-amw-empty" style={{ padding: 14 }}>
              Calls <code>MTA.registerOrgContract(slug, contract)</code>. After this, all calls into the contract route through this slug's authorizer.
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
              <button
                className="bb-btn-primary bb-btn-xs"
                onClick={register}
                disabled={form.registered}
              >
                {form.registered ? "✓ Registered" : "Register"}
              </button>
            </div>
          </>
        )}
      </div>
    </MembersModal>
  );
}
