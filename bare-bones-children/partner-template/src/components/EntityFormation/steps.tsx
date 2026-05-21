import { ReactNode } from "react";
import { shortAddress } from "../../utils/formatUtils";
import { CheckIcon } from "./CheckIcon";
import {
  AgentCustom,
  AgentMode,
  AgreementSource,
  AgreementStorage,
  EF_AGENTS,
  FormationAgent,
  FormationChain,
  FormationDao,
  FormationWallet,
  ManagementType,
  StepId,
  STUB_GOVERNOR_ADDRESS,
  efHasDesignator,
} from "./types";

// ---------- card frame primitives ----------

interface StepCardHeadProps {
  step?: number;
  total?: number;
  kicker?: string;
  title: string;
  lede?: string;
}

function StepCardHead({ step, total, kicker, title, lede }: StepCardHeadProps) {
  const k = kicker ?? (step != null && total != null ? `Step ${step} of ${total}` : undefined);
  return (
    <div className="ef-card-head">
      <div>
        {k && <div className="ef-card-kicker">{k}</div>}
        <h2 className="ef-card-title">{title}</h2>
        {lede && <p className="ef-card-lede">{lede}</p>}
      </div>
    </div>
  );
}

interface StepCardFootProps {
  onPrev?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  hint?: ReactNode;
}

function StepCardFoot({
  onPrev,
  onNext,
  nextLabel = "Continue",
  nextDisabled,
  hint,
}: StepCardFootProps) {
  return (
    <div className="ef-card-foot">
      {onPrev ? (
        <button type="button" className="btn-ghost btn-sm" onClick={onPrev}>
          ← Back
        </button>
      ) : (
        <span />
      )}
      <div className="ef-row" style={{ gap: 12 }}>
        {hint && <span className="ef-card-foot-hint">{hint}</span>}
        {onNext && (
          <button
            type="button"
            className="btn-primary btn-sm"
            onClick={onNext}
            disabled={nextDisabled}
          >
            {nextLabel} →
          </button>
        )}
      </div>
    </div>
  );
}

// ---------- step 0: Eligibility ----------

interface EligibilityProps {
  activeDao?: FormationDao;
  wallet?: FormationWallet;
  onNext: () => void;
}

export function StepEligibility({ activeDao, wallet, onNext }: EligibilityProps) {
  // Stub checks — design assumes "all passing". Replaced by real reads once
  // the backend wires up. The fail icon class is preserved so a future
  // failing check renders correctly without further CSS.
  const govAddress = activeDao?.governor?.address || STUB_GOVERNOR_ADDRESS;
  const checks = [
    {
      label: "Governor + Timelock deployed",
      detail: `${activeDao?.governor?.name || "GovernorBravo"} · ${shortAddress(govAddress)}`,
      ok: true,
    },
    {
      label: "ERC20Votes token attached",
      detail: `${activeDao?.symbol || "ACME"} · ${activeDao?.totalSupply || "12.4M supply"}`,
      ok: true,
    },
    {
      label: "You hold WY_FILING_ROLE",
      detail: wallet
        ? `Connected as ${shortAddress(wallet.address)} — Super Admin`
        : "Connect a wallet with WY_FILING_ROLE to file",
      ok: !!wallet,
    },
  ];
  const passing = checks.filter((c) => c.ok).length;
  return (
    <div className="ef-card">
      <StepCardHead
        step={0}
        total={6}
        title="Eligibility check"
        lede="Confirm your on-chain org has everything Wyoming needs to recognize it as a DAO LLC."
      />
      <div className="ef-card-body">
        <div className="ef-section">
          <div className="ef-section-head">
            On-chain prerequisites · {passing} of {checks.length} passing
          </div>
          <div className="ef-check-list">
            {checks.map((c, i) => (
              <div key={i} className="ef-check">
                <span className={`ef-check-icon ${c.ok ? "" : "fail"}`}>
                  <CheckIcon size={12} stroke={2.5} />
                </span>
                <div>
                  <div className="ef-check-l">{c.label}</div>
                  <div className="ef-check-s">{c.detail}</div>
                </div>
                <span className="ef-check-tag">{c.ok ? "Passing" : "Pending"}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="ef-section">
          <div className="ef-section-head">Note</div>
          <div className="ef-pre">
            <span style={{ color: "var(--text-dim)" }}>
              Wyoming doesn't require members to be onboarded before filing — you can mint
              tokens and add members after the entity is recognized. The contract addresses
              below are what gets recorded in the Articles.
            </span>
          </div>
        </div>
      </div>
      <StepCardFoot
        onNext={onNext}
        hint={passing === checks.length ? "All checks passing" : null}
        nextDisabled={passing !== checks.length}
      />
    </div>
  );
}

// ---------- step 1: Basics ----------

interface BasicsProps {
  name: string;
  setName: (v: string) => void;
  mgmt: ManagementType;
  setMgmt: (v: ManagementType) => void;
  onPrev: () => void;
  onNext: () => void;
}

export function StepBasics({ name, setName, mgmt, setMgmt, onPrev, onNext }: BasicsProps) {
  const valid = efHasDesignator(name);
  return (
    <div className="ef-card">
      <StepCardHead
        step={1}
        total={6}
        title="Entity basics"
        lede="The legal name on file with Wyoming, and how the LLC declares itself managed."
      />
      <div className="ef-card-body">
        <div className="ef-section">
          <div className="ef-section-head">Legal name</div>
          <div className="field full">
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={!valid}
            />
            {valid ? (
              <div className="field-hint">
                Designator detected · {name.length}/100 characters
              </div>
            ) : (
              <div className="field-err">
                Must include one of: "DAO", "DAO LLC", or "LAO"
              </div>
            )}
          </div>
        </div>

        <div className="ef-section">
          <div className="ef-section-head">Management type</div>
          <div className="ef-tiles cols-2">
            {[
              {
                id: "member" as const,
                title: "Member-managed",
                sub: "Members vote on proposals; the smart contract executes the result.",
                tag: "recommended" as const,
              },
              {
                id: "algo" as const,
                title: "Algorithmically managed",
                sub: "Smart contract executes operations without human votes.",
                tag: null,
              },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`ef-tile ${mgmt === opt.id ? "on" : ""}`}
                onClick={() => setMgmt(opt.id)}
              >
                <div className="ef-tile-h">
                  <span className="ef-tile-t">{opt.title}</span>
                  {opt.tag && <span className="ef-tile-tag accent">{opt.tag}</span>}
                </div>
                <div className="ef-tile-s">{opt.sub}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
      <StepCardFoot
        onPrev={onPrev}
        onNext={onNext}
        nextDisabled={!valid}
        hint={valid ? null : "Add a designator to continue"}
      />
    </div>
  );
}

// ---------- step 2: Contract ----------

interface ContractProps {
  activeDao?: FormationDao;
  chain?: FormationChain;
  contractAddr: string;
  setContractAddr: (v: string) => void;
  onPrev: () => void;
  onNext: () => void;
}

export function StepContract({
  activeDao,
  chain,
  contractAddr,
  setContractAddr,
  onPrev,
  onNext,
}: ContractProps) {
  const valid = /^0x[a-fA-F0-9]{40}$/.test(contractAddr);
  const supporting = [
    {
      k: "Timelock",
      v: activeDao?.timelock?.address || "0x3aD7F0d5D2C4901bBcd28b91A48Bc7Db4eC3F112",
    },
    {
      k: "ERC20Votes Token",
      v: activeDao?.token?.address || "0x91AdBcD12345678ABcDeF12345678abcDef2C04",
      sub: activeDao?.symbol || "ACME",
    },
    {
      k: "Members Registry",
      v: "0xb70212340000abcDeF000000aBcDef12345670044",
    },
  ];
  return (
    <div className="ef-card">
      <StepCardHead
        step={2}
        total={6}
        title="Smart contract bind"
        lede="Declare the on-chain identifier Wyoming will treat as the canonical DAO contract. Filed once; changes require an amendment."
      />
      <div className="ef-card-body">
        <div className="ef-section">
          <div className="ef-section-head">Canonical identifier</div>
          <div className="field full">
            <label>DAO contract address</label>
            <input
              className="input mono"
              value={contractAddr}
              onChange={(e) => setContractAddr(e.target.value)}
            />
            <div className="field-hint">Auto-filled from your Governor at launch</div>
          </div>
          <div style={{ marginTop: 10 }}>
            <span className="ef-addr-chip">
              <span className="ef-addr-chip-k">Chain</span>
              <span>
                {chain?.name || "Polygon"} · {chain?.chainId || 137}
              </span>
            </span>
          </div>
        </div>

        <div className="ef-section">
          <div className="ef-section-head">
            Supporting contracts · referenced but not canonical
          </div>
          <div className="ef-summary">
            {supporting.map((s, i) => (
              <div key={i} className="ef-summary-row">
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 500 }}>{s.k}</div>
                  {s.sub && (
                    <div className="ef-mute mono" style={{ fontSize: 11.5 }}>
                      {s.sub}
                    </div>
                  )}
                </div>
                <div className="mono ef-dim" style={{ fontSize: 12 }}>
                  {shortAddress(s.v)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <StepCardFoot onPrev={onPrev} onNext={onNext} nextDisabled={!valid} />
    </div>
  );
}

// ---------- step 3: Agent ----------

interface AgentProps {
  agentMode: AgentMode;
  setAgentMode: (v: AgentMode) => void;
  agentId: string;
  setAgentId: (v: string) => void;
  agentCustom: AgentCustom;
  setAgentCustom: (v: AgentCustom) => void;
  onPrev: () => void;
  onNext: () => void;
}

export function StepAgent({
  agentMode,
  setAgentMode,
  agentId,
  setAgentId,
  agentCustom,
  setAgentCustom,
  onPrev,
  onNext,
}: AgentProps) {
  return (
    <div className="ef-card">
      <StepCardHead
        step={3}
        total={6}
        title="Registered agent"
        lede="Wyoming requires an in-state recipient for legal mail. Most filers use a service; the cheapest is $49/yr."
      />
      <div className="ef-card-body">
        <div className="ef-section">
          <div className="ef-section-head">Source</div>
          <div className="ef-tiles cols-2">
            <button
              type="button"
              className={`ef-tile ${agentMode === "service" ? "on" : ""}`}
              onClick={() => setAgentMode("service")}
            >
              <div className="ef-tile-h">
                <span className="ef-tile-t">Use a service</span>
                <span className="ef-tile-tag accent">recommended</span>
              </div>
              <div className="ef-tile-s">Wyoming partners. From $49/yr.</div>
            </button>
            <button
              type="button"
              className={`ef-tile ${agentMode === "own" ? "on" : ""}`}
              onClick={() => setAgentMode("own")}
            >
              <div className="ef-tile-h">
                <span className="ef-tile-t">List my own</span>
              </div>
              <div className="ef-tile-s">
                Wyoming resident or WY-registered business. No P.O. boxes.
              </div>
            </button>
          </div>
        </div>

        {agentMode === "service" && (
          <div className="ef-section">
            <div className="ef-section-head">Pick a partner</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {EF_AGENTS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className={`ef-agent ${agentId === a.id ? "on" : ""}`}
                  onClick={() => setAgentId(a.id)}
                >
                  <span className="ef-radio" />
                  <div>
                    <div className="ef-agent-name">{a.name}</div>
                    <div className="ef-agent-cov">{a.coverage}</div>
                  </div>
                  <div className="ef-agent-price">
                    ${a.price}
                    <small>/yr</small>
                  </div>
                  {a.badge ? (
                    <span className="ef-agent-badge">{a.badge}</span>
                  ) : (
                    <span style={{ width: 88 }} />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {agentMode === "own" && (
          <div className="ef-section">
            <div className="ef-section-head">Agent details</div>
            <div className="field-grid">
              <div className="field full">
                <label>Agent name</label>
                <input
                  className="input"
                  value={agentCustom.name}
                  onChange={(e) => setAgentCustom({ ...agentCustom, name: e.target.value })}
                  placeholder="Jane Eberhardt"
                />
              </div>
              <div className="field full">
                <label>Street address</label>
                <input
                  className="input"
                  value={agentCustom.street}
                  onChange={(e) =>
                    setAgentCustom({ ...agentCustom, street: e.target.value })
                  }
                  placeholder="118 W 23rd St"
                />
                <div className="field-hint">Physical only — no P.O. boxes</div>
              </div>
              <div className="field">
                <label>City</label>
                <input
                  className="input"
                  value={agentCustom.city}
                  onChange={(e) =>
                    setAgentCustom({ ...agentCustom, city: e.target.value })
                  }
                />
              </div>
              <div className="field">
                <label>ZIP</label>
                <input
                  className="input mono"
                  value={agentCustom.zip}
                  onChange={(e) =>
                    setAgentCustom({ ...agentCustom, zip: e.target.value })
                  }
                />
                <div className="field-hint">Starts with 82 or 83</div>
              </div>
            </div>
          </div>
        )}
      </div>
      <StepCardFoot onPrev={onPrev} onNext={onNext} />
    </div>
  );
}

// ---------- step 4: Agreement ----------

interface AgreementProps {
  src: AgreementSource;
  setSrc: (v: AgreementSource) => void;
  storage: AgreementStorage;
  setStorage: (v: AgreementStorage) => void;
  onPrev: () => void;
  onNext: () => void;
}

export function StepAgreement({
  src,
  setSrc,
  storage,
  setStorage,
  onPrev,
  onNext,
}: AgreementProps) {
  const filled = [
    { k: "Voting procedures", v: "votingDelay 1d · votingPeriod 5d" },
    { k: "Quorum threshold", v: "4% of token supply" },
    { k: "Amendment procedure", v: "Governor proposal flow" },
    { k: "Smart contract upgrade", v: "Timelock-gated proposal" },
  ];
  return (
    <div className="ef-card">
      <StepCardHead
        step={4}
        total={6}
        title="Operating agreement"
        lede="W.S. 17-31-104 lets smart contracts substitute for parts of the agreement, but a written companion is still expected for dissolution, taxes, and dispute venue."
      />
      <div className="ef-card-body">
        <div className="ef-section">
          <div className="ef-section-head">Source</div>
          <div className="ef-tiles cols-2">
            <button
              type="button"
              className={`ef-tile ${src === "generate" ? "on" : ""}`}
              onClick={() => setSrc("generate")}
            >
              <div className="ef-tile-h">
                <span className="ef-tile-t">Generate from template</span>
                <span className="ef-tile-tag accent">recommended</span>
              </div>
              <div className="ef-tile-s">
                Pre-fills from your on-chain governance config. You fill in off-chain
                sections.
              </div>
            </button>
            <button
              type="button"
              className={`ef-tile ${src === "upload" ? "on" : ""}`}
              onClick={() => setSrc("upload")}
            >
              <div className="ef-tile-h">
                <span className="ef-tile-t">Upload my own</span>
              </div>
              <div className="ef-tile-s">
                PDF, DOC or DOCX up to 10 MB. Optional IPFS hash.
              </div>
            </button>
          </div>
        </div>

        {src === "generate" && (
          <>
            <div className="ef-section">
              <div className="ef-section-head">Auto-populated from your contracts</div>
              <div className="ef-summary">
                {filled.map((f, i) => (
                  <div key={i} className="ef-summary-row">
                    <div className="ef-summary-k">{f.k}</div>
                    <div
                      className="mono"
                      style={{ fontSize: 12.5, color: "var(--text)" }}
                    >
                      {f.v}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="ef-section">
              <div className="ef-section-head">Storage</div>
              <div className="ef-tiles cols-3">
                {[
                  { id: "off" as const, t: "Off-chain only", s: "PDF download" },
                  { id: "ipfs" as const, t: "IPFS + subgraph", s: "Public, permanent, indexable" },
                  {
                    id: "chain" as const,
                    t: "IPFS + on-chain",
                    s: "Hash written via setOperatingAgreement()",
                  },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`ef-tile ${storage === opt.id ? "on" : ""}`}
                    onClick={() => setStorage(opt.id)}
                  >
                    <div className="ef-tile-h">
                      <span className="ef-tile-t" style={{ fontSize: 13 }}>
                        {opt.t}
                      </span>
                    </div>
                    <div className="ef-tile-s" style={{ fontSize: 12 }}>
                      {opt.s}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {src === "upload" && (
          <div className="ef-section">
            <div className="ef-section-head">Upload</div>
            <div
              style={{
                border: "1px dashed var(--line-strong)",
                borderRadius: 10,
                padding: 40,
                textAlign: "center",
                background: "var(--bg-elev-2)",
                color: "var(--text-dim)",
              }}
            >
              <div style={{ fontSize: 14, marginBottom: 4 }}>
                Drop a file or click to choose
              </div>
              <div
                className="mono"
                style={{ fontSize: 11.5, color: "var(--text-mute)" }}
              >
                PDF · DOC · DOCX · 10 MB max
              </div>
            </div>
            <div className="field full" style={{ marginTop: 14 }}>
              <label>IPFS / HTTPS URI (optional)</label>
              <input className="input mono" placeholder="ipfs://QmXY… or https://…" />
            </div>
          </div>
        )}
      </div>
      <StepCardFoot onPrev={onPrev} onNext={onNext} />
    </div>
  );
}

// ---------- step 5: Notice ----------

interface NoticeProps {
  activeDao?: FormationDao;
  notice: boolean;
  setNotice: (v: boolean) => void;
  onPrev: () => void;
  onNext: () => void;
}

export function StepNotice({ activeDao, notice, setNotice, onPrev, onNext }: NoticeProps) {
  const orgName = activeDao?.name || "this DAO LLC";
  return (
    <div className="ef-card">
      <StepCardHead
        step={5}
        total={6}
        title="Member notice"
        lede="Wyoming statute § 17-31-114 requires DAO LLCs disclose risks members face that wouldn't apply to a traditional LLC."
      />
      <div className="ef-card-body">
        <div className="ef-notice">
          <div className="ef-notice-h">
            Notice of Risks — Decentralized Autonomous Organization
          </div>
          <p style={{ marginTop: 0 }}>
            By becoming a member of {orgName}, you acknowledge:
          </p>
          <ol>
            <li>
              This entity is organized under Wyoming law. Limited liability protection
              is recognized under Wyoming law and may not be recognized by other
              jurisdictions.
            </li>
            <li>
              The smart contract code identified in the Articles of Organization is, in
              part, the operating agreement. You should independently review the
              contract code before becoming a member.
            </li>
            <li>
              The governance tokens may be regulated as securities by U.S. federal or
              state authorities. The entity makes no representation that they are not.
            </li>
            <li>
              Decisions may be executed automatically by code without human
              intervention or judicial review. Errors in the code may have irreversible
              consequences.
            </li>
            <li>
              You bear sole responsibility for the security of any private keys
              associated with your membership interest.
            </li>
          </ol>
        </div>

        <label
          className={`ef-checkbox ${notice ? "on" : ""}`}
          onClick={(e) => {
            e.preventDefault();
            setNotice(!notice);
          }}
        >
          <span className="ef-checkbox-box" />
          <span>
            I have read and understand the above. Members joining{" "}
            {activeDao?.name || "this DAO"} will be required to acknowledge this notice
            on join.
          </span>
        </label>
      </div>
      <StepCardFoot
        onPrev={onPrev}
        onNext={onNext}
        nextDisabled={!notice}
        hint={!notice ? "Acknowledge to continue" : null}
      />
    </div>
  );
}

// ---------- step 6: Review & file ----------

interface ReviewProps {
  name: string;
  mgmt: ManagementType;
  contractAddr: string;
  chain?: FormationChain;
  agent: FormationAgent | undefined;
  agentMode: AgentMode;
  agreementStorage: AgreementStorage;
  filed: boolean;
  setFiled: (v: boolean) => void;
  onPrev: () => void;
  onEdit: (id: StepId) => void;
  onFile: () => void;
}

export function StepReview({
  name,
  mgmt,
  contractAddr,
  chain,
  agent,
  agentMode,
  agreementStorage,
  filed,
  setFiled,
  onPrev,
  onEdit,
  onFile,
}: ReviewProps) {
  if (filed) {
    return (
      <div className="ef-card">
        <div className="ef-success-hero">
          <span className="ef-success-glyph">
            <CheckIcon size={28} stroke={2.5} />
          </span>
          <h2 className="ef-success-title">Filed.</h2>
          <p className="ef-success-meta">
            {name} is recognized under Wyoming law as a Decentralized Autonomous
            Organization LLC.
          </p>
          <div className="ef-success-id">
            <span style={{ color: "var(--text-mute)" }}>Filing ID</span>{" "}
            2026-007821334
          </div>
        </div>
        <div className="ef-card-body">
          <div className="ef-section">
            <div className="ef-section-head">Next steps</div>
            <div className="ef-summary">
              {[
                {
                  done: true,
                  label: "Articles of Organization filed",
                  detail: "Confirmed by WY SOS · Filing 2026-007821334",
                },
                {
                  done: false,
                  label: "Collect member acknowledgments",
                  detail: "3 of 247 signatures",
                },
                {
                  done: false,
                  label: "Apply for an EIN",
                  detail: "Free at irs.gov — 15 minutes",
                },
                {
                  done: false,
                  label: "Open a bank account",
                  detail: "Mercury, Kraken Financial accept DAO LLCs",
                },
                {
                  done: true,
                  label: "Compliance reminders scheduled",
                  detail: "Annual report due Apr 1, 2027",
                },
              ].map((it, i) => (
                <div
                  key={i}
                  className="ef-summary-row"
                  style={{ alignItems: "center" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        background: it.done ? "var(--accent)" : "transparent",
                        border: it.done ? "none" : "1.5px solid var(--line-strong)",
                        display: "inline-grid",
                        placeItems: "center",
                        flexShrink: 0,
                        color: "var(--accent-ink)",
                      }}
                    >
                      {it.done && <CheckIcon size={11} stroke={2.5} />}
                    </span>
                    <div>
                      <div
                        style={{
                          fontSize: 13.5,
                          fontWeight: 500,
                          color: it.done ? "var(--text-dim)" : "var(--text)",
                          textDecoration: it.done ? "line-through" : "none",
                        }}
                      >
                        {it.label}
                      </div>
                      <div className="ef-mute mono" style={{ fontSize: 11.5 }}>
                        {it.detail}
                      </div>
                    </div>
                  </div>
                  {!it.done && (
                    <button type="button" className="btn-ghost btn-sm">
                      Open →
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="ef-card-foot">
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => setFiled(false)}
          >
            ← Back to draft
          </button>
          <button type="button" className="btn-primary btn-sm">
            ↓ Download stamped Articles
          </button>
        </div>
      </div>
    );
  }

  const summary: { k: string; v: string; edit: StepId; mono?: boolean }[] = [
    { k: "Name", v: name, edit: "basics" },
    {
      k: "Management",
      v: mgmt === "member" ? "Member-managed" : "Algorithmically managed",
      edit: "basics",
    },
    { k: "Contract", v: shortAddress(contractAddr), edit: "contract", mono: true },
    {
      k: "Chain",
      v: `${chain?.name || "Polygon"} · ${chain?.chainId || 137}`,
      edit: "contract",
    },
    {
      k: "Registered agent",
      v: agentMode === "service" ? agent?.name || "—" : "Custom (own)",
      edit: "agent",
    },
    {
      k: "Operating agreement",
      v:
        agreementStorage === "off"
          ? "PDF only"
          : agreementStorage === "ipfs"
            ? "IPFS + subgraph"
            : "IPFS + on-chain",
      edit: "agreement",
    },
  ];

  const stateFee = 100;
  const agentFee = agentMode === "service" ? (agent?.price ?? 0) : 0;
  const total = stateFee + agentFee;

  return (
    <div className="ef-card">
      <StepCardHead
        step={6}
        total={6}
        title="Review and file"
        lede="A final look at the rendered Articles, side-by-side with the summary and cost."
      />
      <div className="ef-card-body">
        <div className="ef-review">
          <div className="ef-doc">
            <h3 className="ef-doc-title">Articles of Organization</h3>
            <div className="ef-doc-sub">
              Wyoming Decentralized Autonomous Organization LLC
            </div>

            <div className="ef-doc-art">
              <div className="ef-doc-art-h">Article I — Name</div>
              <div>
                The name of the entity is <span className="ef-doc-fill">{name}</span>.
              </div>
            </div>
            <div className="ef-doc-art">
              <div className="ef-doc-art-h">Article II — Management</div>
              <div>
                This DAO shall be{" "}
                <span className="ef-doc-fill">
                  {mgmt === "member" ? "member-managed" : "algorithmically managed"}
                </span>
                .
              </div>
            </div>
            <div className="ef-doc-art">
              <div className="ef-doc-art-h">Article III — Smart Contract Identifier</div>
              <div>
                The publicly available identifier is{" "}
                <span className="ef-doc-fill mono">{shortAddress(contractAddr, 8)}</span>
                , deployed on{" "}
                <span className="ef-doc-fill">{chain?.name || "Polygon"}</span> (chain id{" "}
                <span className="mono">{chain?.chainId || 137}</span>).
              </div>
            </div>
            <div className="ef-doc-art">
              <div className="ef-doc-art-h">Article IV — Registered Agent</div>
              <div>
                <span className="ef-doc-fill">
                  {agentMode === "service" ? agent?.name || "—" : "Self-listed agent"}
                </span>
              </div>
            </div>
            <div className="ef-doc-art">
              <div className="ef-doc-art-h">Article V — Notice to Members</div>
              <div>Members are on notice of the risks specified in W.S. 17-31-114.</div>
            </div>
            <div className="ef-doc-art">
              <div className="ef-doc-art-h">Article VI — Operating Agreement</div>
              <div>
                Referenced at{" "}
                <span className="ef-doc-fill mono">ipfs://QmZ4kP…87qR</span>. Smart
                contracts may enhance per W.S. 17-31-104.
              </div>
            </div>

            <div
              style={{
                marginTop: 28,
                paddingTop: 16,
                borderTop: "1px solid var(--line)",
                fontSize: 11,
                color: "var(--text-mute)",
                textAlign: "center",
              }}
              className="mono"
            >
              Filed pursuant to W.S. 17-31-101 et seq.
            </div>
          </div>

          <div>
            <div className="ef-section-head">Summary</div>
            <div className="ef-summary">
              {summary.map((s, i) => (
                <div key={i} className="ef-summary-row">
                  <div className="ef-summary-k">{s.k}</div>
                  <div className="ef-summary-v">
                    <span
                      className={s.mono ? "mono" : ""}
                      style={{ fontSize: s.mono ? 12.5 : 13.5 }}
                    >
                      {s.v}
                    </span>
                    <button
                      type="button"
                      className="ef-summary-edit"
                      onClick={() => onEdit(s.edit)}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="ef-section-head" style={{ marginTop: 20 }}>
              Cost
            </div>
            <div className="ef-summary">
              <div className="ef-summary-row">
                <div className="ef-summary-k">Wyoming filing fee</div>
                <div className="ef-summary-v mono">${stateFee.toFixed(2)}</div>
              </div>
              <div className="ef-summary-row">
                <div className="ef-summary-k">Registered agent · year 1</div>
                <div className="ef-summary-v mono">${agentFee.toFixed(2)}</div>
              </div>
              <div className="ef-summary-row total">
                <div className="ef-summary-k">Due today</div>
                <div className="ef-summary-v mono">${total.toFixed(2)}</div>
              </div>
            </div>

            <div
              style={{
                marginTop: 18,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <button
                type="button"
                className="btn-ghost btn-sm"
                style={{ justifyContent: "flex-start" }}
              >
                ↓ Download Articles draft
              </button>
              <button
                type="button"
                className="btn-ghost btn-sm"
                style={{ justifyContent: "flex-start" }}
              >
                ↓ Download Operating Agreement
              </button>
              <button
                type="button"
                className="btn-ghost btn-sm"
                style={{ justifyContent: "flex-start" }}
              >
                ↗ Share with counsel
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="ef-card-foot">
        <button type="button" className="btn-ghost btn-sm" onClick={onPrev}>
          ← Back
        </button>
        <button type="button" className="btn-primary btn-sm" onClick={onFile}>
          File with Wyoming · ${total} →
        </button>
      </div>
    </div>
  );
}
