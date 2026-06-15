// Founder cap-table setup. Builds a ShareTokenFactory.deployFor config: a default Common
// class + founder allocations seeded from the org's members, deployed in a single tx.
// (Option-pool reservation is a follow-up action once the table exists — see CAPTABLE.md.)

import { useMemo, useState } from "react";
import { ethers } from "ethers";
import type { Member } from "../../types/members";
import type { DeployCapTableConfig } from "../../hooks/capTable/useCapTableActions";
import { defaultCommonClass, parseTokens } from "./capTableHelpers";

interface AllocRow {
  address: string;
  amount: string;
}

interface CapTableSetupProps {
  orgSlug: string;
  members: Member[];
  onCancel: () => void;
  onComplete: (cfg: DeployCapTableConfig) => Promise<unknown>;
}

export function CapTableSetup({ orgSlug, members, onCancel, onComplete }: CapTableSetupProps) {
  const founders = useMemo(
    () => members.filter((m) => String(m.accountType).toLowerCase() === "member"),
    [members],
  );
  const [name, setName] = useState(`${orgSlug} Common`);
  const [symbol, setSymbol] = useState("SHARE");
  const [className, setClassName] = useState("Common");
  const [rows, setRows] = useState<AllocRow[]>(() =>
    founders.length
      ? founders.map((m) => ({ address: m.wallet?.address ?? "", amount: "" }))
      : [{ address: "", amount: "" }],
  );
  const [busy, setBusy] = useState(false);

  function setRow(i: number, patch: Partial<AllocRow>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setRows((rs) => [...rs, { address: "", amount: "" }]);
  }
  function removeRow(i: number) {
    setRows((rs) => rs.filter((_, idx) => idx !== i));
  }

  const validRows = rows.filter((r) => ethers.utils.isAddress(r.address) && /^\d+$/.test(r.amount) && Number(r.amount) > 0);
  const totalShares = validRows.reduce((s, r) => s + Number(r.amount), 0);
  const canSubmit = name.trim().length > 0 && symbol.trim().length > 0 && validRows.length > 0 && !busy;

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    try {
      const cfg: DeployCapTableConfig = {
        name: name.trim(),
        symbol: symbol.trim(),
        complianceSBT: ethers.constants.AddressZero, // KYC gate off for v1
        defaultClass: defaultCommonClass(className.trim() || "Common"),
        initialHolders: validRows.map((r) => ethers.utils.getAddress(r.address)),
        // Whole shares entered → 18-decimal base units (matches the cap-table display convention).
        initialAmounts: validRows.map((r) => parseTokens(r.amount)),
      };
      await onComplete(cfg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ct-page" data-testid="captable-setup">
      <div className="ct-overview">
        <div>
          <div className="ct-kicker">Set up cap table</div>
          <div className="ct-overview-h" style={{ fontSize: 26 }}>
            Founder setup
          </div>
          <p className="ct-help" style={{ marginTop: 8, maxWidth: "60ch" }}>
            Create a default <b>Common</b> class and record founder allocations. This deploys your
            org's on-chain share register in a single transaction. You can issue employee/advisor
            grants and raise (SAFE / round) afterward.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div className="ct-field">
            <label className="ct-label">Register name</label>
            <input className="ct-input" value={name} onChange={(e) => setName(e.target.value)} data-testid="captable-setup-name" />
          </div>
          <div className="ct-field">
            <label className="ct-label">Symbol</label>
            <input className="ct-input" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} data-testid="captable-setup-symbol" />
          </div>
          <div className="ct-field">
            <label className="ct-label">Default class</label>
            <input className="ct-input" value={className} onChange={(e) => setClassName(e.target.value)} data-testid="captable-setup-class" />
          </div>
        </div>
      </div>

      <div className="ct-overview">
        <div className="ct-overview-top">
          <div className="ct-kicker">Founder allocations</div>
          <span className="ct-help">{totalShares.toLocaleString("en-US")} tokens total</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rows.map((r, i) => (
            <div className="ct-alloc-row" key={i}>
              <select
                className="ct-select"
                value={members.some((m) => m.wallet?.address?.toLowerCase() === r.address.toLowerCase()) ? r.address : ""}
                onChange={(e) => e.target.value && setRow(i, { address: e.target.value })}
                data-testid={`captable-setup-member-${i}`}
              >
                <option value="">— member or paste address below —</option>
                {members
                  .filter((m) => m.wallet?.address)
                  .map((m) => (
                    <option key={m.id} value={m.wallet.address}>
                      {m.name}
                    </option>
                  ))}
              </select>
              <input
                className="ct-input"
                inputMode="numeric"
                placeholder="tokens"
                value={r.amount}
                onChange={(e) => setRow(i, { amount: e.target.value.replace(/[^\d]/g, "") })}
                data-testid={`captable-setup-amount-${i}`}
              />
              <button className="ct-btn" onClick={() => removeRow(i)} aria-label="Remove row">
                ✕
              </button>
              {!members.some((m) => m.wallet?.address?.toLowerCase() === r.address.toLowerCase()) && (
                <input
                  className="ct-input"
                  style={{ gridColumn: "1 / 2" }}
                  placeholder="0x… address"
                  value={r.address}
                  onChange={(e) => setRow(i, { address: e.target.value })}
                  data-testid={`captable-setup-address-${i}`}
                />
              )}
            </div>
          ))}
          <button className="ct-btn" style={{ alignSelf: "flex-start" }} onClick={addRow} data-testid="captable-setup-add-row">
            + Add allocation
          </button>
        </div>
      </div>

      <div className="ct-modal-foot" style={{ border: "none", padding: 0 }}>
        <button className="ct-btn" onClick={onCancel}>
          Cancel
        </button>
        <button className="ct-btn ct-btn-primary" disabled={!canSubmit} onClick={submit} data-testid="captable-setup-submit">
          {busy ? "Creating…" : "Create cap table"}
        </button>
      </div>
    </div>
  );
}
