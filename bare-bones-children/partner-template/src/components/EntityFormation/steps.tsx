import { ReactNode, useEffect } from "react";
import { shortAddress } from "../../utils/formatUtils";
import { REGISTERED_AGENTS } from "./agents.config";
import { CheckIcon } from "./CheckIcon";
import { PhoneInput } from "./PhoneInput";
import { api } from "../../api/client";
import { ChevronRight, DownloadIcon } from "./Icons";
import {
  activeSections,
  ARTICLES_FOOTER,
  ARTICLES_SUBTITLE,
  ARTICLES_TITLE,
  ArticlesMergeData,
  Inline,
} from "../../../../../../BareBonesApi/src/templates/articles-of-organization";
import {
  AgentCustom,
  AgentMode,
  AgreementSource,
  AgreementStorage,
  FilerRole,
  FormationAgent,
  FormationChain,
  FormationDao,
  FormationWallet,
  ManagementType,
  OrganizerFiler,
  OrganizerMailing,
  OrganizerOrg,
  StepId,
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
          Back
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
            {nextLabel}
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
  const govAddress = activeDao?.governor?.address;
  const tokenAddress = activeDao?.token?.address;
  const checks = [
    {
      label: "Governor + Timelock deployed",
      detail: govAddress
        ? `${activeDao?.governor?.name || "DAOGovernor"} · ${shortAddress(govAddress)}`
        : "No Governor detected for this org — deploy one before filing",
      ok: !!govAddress,
    },
    {
      label: "ERC20Votes token attached",
      detail: tokenAddress
        ? `${activeDao?.symbol || "—"} · ${activeDao?.totalSupply || ""}`.trim()
        : "No governance token detected for this org",
      ok: !!tokenAddress,
    },
    {
      label: "Wallet connected",
      detail: wallet
        ? `Connected as ${shortAddress(wallet.address)}`
        : "Connect a wallet to file",
      ok: !!wallet,
    },
  ];
  const passing = checks.filter((c) => c.ok).length;
  return (
    <div className="ef-card">
      <StepCardHead
        step={0}
        total={7}
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
        total={7}
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

// ---------- step 2: Organizer ----------
// Two contact forms on one card:
//   1. Principal office — the LLC's own address + business email/phone
//      (with an optional separate mailing/legal address)
//   2. Organizer / filer — the human submitting the filing, with a
//      "same as principal office contact" helper to skip re-typing
// Phone fields use a curated dial-code dropdown. Validation is
// presence-only for required fields; emails get a shape check.

const validEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s || "");

interface OrganizerProps {
  org: OrganizerOrg;
  setOrg: (v: OrganizerOrg) => void;
  mailingSame: boolean;
  setMailingSame: (v: boolean) => void;
  mailing: OrganizerMailing;
  setMailing: (v: OrganizerMailing) => void;
  filer: OrganizerFiler;
  setFiler: React.Dispatch<React.SetStateAction<OrganizerFiler>>;
  filerSame: boolean;
  setFilerSame: (v: boolean) => void;
  onPrev: () => void;
  onNext: () => void;
}

export function StepOrganizer({
  org,
  setOrg,
  mailingSame,
  setMailingSame,
  mailing,
  setMailing,
  filer,
  setFiler,
  filerSame,
  setFilerSame,
  onPrev,
  onNext,
}: OrganizerProps) {
  // US phones are 10 digits (NANP). The PhoneInput strips formatting +
  // caps length, so we just check digit count here.
  const orgOk =
    !!org.street1 &&
    !!org.city &&
    !!org.region &&
    !!org.postal &&
    validEmail(org.email) &&
    org.phoneNum.length === 10;
  const mailingOk =
    mailingSame || (!!mailing.street1 && !!mailing.city && !!mailing.region && !!mailing.postal);
  const filerOk = filerSame
    ? !!filer.first && !!filer.last
    : !!filer.first && !!filer.last && validEmail(filer.email) && filer.phoneNum.length === 10;
  const allOk = orgOk && mailingOk && filerOk;

  // Mirror org email/phone into filer when "same as" is on, so review renders
  // populated rows instead of empty placeholders.
  useEffect(() => {
    if (!filerSame) return;
    setFiler((f) => ({
      ...f,
      email: org.email,
      phoneDial: org.phoneDial,
      phoneIso: org.phoneIso,
      phoneNum: org.phoneNum,
    }));
  }, [filerSame, org.email, org.phoneDial, org.phoneIso, org.phoneNum, setFiler]);

  return (
    <div className="ef-card">
      <StepCardHead
        step={2}
        total={7}
        title="Organizer & contact"
        lede="Wyoming requires the LLC's principal office and the person filing on its behalf. Both go on the public record; only the organizer signs."
      />
      <div className="ef-card-body">
        <div className="ef-forms">
          {/* -------- Form 1: Principal office -------- */}
          <section className="ef-form">
            <div className="ef-form-head">
              <div className="ef-form-head-k">
                <div className="ef-form-kicker">Form 1 of 2</div>
                <div className="ef-form-title">Principal office</div>
              </div>
              <span className="ef-stat-pill">W.S. 17-29-201(a)(iii)</span>
            </div>
            <div className="ef-form-body">
              <div className="field full">
                <label>Street address</label>
                <input
                  className="input"
                  placeholder="118 W 23rd St"
                  value={org.street1}
                  onChange={(e) => setOrg({ ...org, street1: e.target.value })}
                />
              </div>
              <div className="field full">
                <label>Suite / unit (optional)</label>
                <input
                  className="input"
                  placeholder="Floor 4"
                  value={org.street2}
                  onChange={(e) => setOrg({ ...org, street2: e.target.value })}
                />
              </div>
              <div className="ef-row-3">
                <div className="field">
                  <label>City</label>
                  <input
                    className="input"
                    placeholder="Cheyenne"
                    value={org.city}
                    onChange={(e) => setOrg({ ...org, city: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>State</label>
                  <input
                    className="input"
                    placeholder="WY"
                    value={org.region}
                    onChange={(e) => setOrg({ ...org, region: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Postal</label>
                  <input
                    className="input mono"
                    placeholder="82001"
                    value={org.postal}
                    onChange={(e) => setOrg({ ...org, postal: e.target.value })}
                  />
                </div>
              </div>
              <div className="field full">
                <label>Country</label>
                <select
                  className="ef-select"
                  value={org.country}
                  onChange={(e) => setOrg({ ...org, country: e.target.value })}
                >
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                  <option value="GB">United Kingdom</option>
                  <option value="DE">Germany</option>
                  <option value="CH">Switzerland</option>
                  <option value="SG">Singapore</option>
                  <option value="AE">United Arab Emirates</option>
                  <option value="other">Other…</option>
                </select>
                <div className="field-hint">
                  Principal office may be outside Wyoming. Registered agent must be in-state
                  (next step).
                </div>
              </div>
              <div className="field full">
                <label>Business email</label>
                <input
                  className="input"
                  type="email"
                  placeholder="filings@your-dao.xyz"
                  value={org.email}
                  onChange={(e) => setOrg({ ...org, email: e.target.value })}
                  aria-invalid={!!org.email && !validEmail(org.email)}
                />
                <div className="field-hint">Statutory notices from Wyoming SOS land here.</div>
              </div>
              <div className="field full">
                <label>Business phone</label>
                <PhoneInput
                  value={{ phoneDial: org.phoneDial, phoneIso: org.phoneIso, phoneNum: org.phoneNum }}
                  onChange={(v) => setOrg({ ...org, ...v })}
                  placeholder="555 123 4567"
                />
              </div>
            </div>
          </section>

          {/* -------- Form 2: Organizer / filer -------- */}
          <section className="ef-form">
            <div className="ef-form-head">
              <div className="ef-form-head-k">
                <div className="ef-form-kicker">Form 2 of 2</div>
                <div className="ef-form-title">Organizer (filer)</div>
              </div>
              <span className="ef-stat-pill">Signs Articles</span>
            </div>

            <div className="ef-sameas">
              <button
                type="button"
                className={`ef-sameas-toggle ${filerSame ? "on" : ""}`}
                onClick={() => setFilerSame(!filerSame)}
                aria-pressed={filerSame}
              />
              <span>Use principal office email & phone for the organizer</span>
            </div>

            <div className="ef-form-body">
              <div className="ef-row-2">
                <div className="field">
                  <label>First name</label>
                  <input
                    className="input"
                    placeholder="Jane"
                    value={filer.first}
                    onChange={(e) => setFiler((f) => ({ ...f, first: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label>Last name</label>
                  <input
                    className="input"
                    placeholder="Eberhardt"
                    value={filer.last}
                    onChange={(e) => setFiler((f) => ({ ...f, last: e.target.value }))}
                  />
                </div>
              </div>
              <div className="field full">
                <label>Capacity / role</label>
                <select
                  className="ef-select"
                  value={filer.role}
                  onChange={(e) =>
                    setFiler((f) => ({ ...f, role: e.target.value as FilerRole }))
                  }
                >
                  <option value="member">Member</option>
                  <option value="manager">Manager</option>
                  <option value="attorney">Attorney</option>
                  <option value="agent">Formation agent</option>
                  <option value="other">Other authorized person</option>
                </select>
              </div>
              <div className="field full">
                <label>Email</label>
                <input
                  className="input"
                  type="email"
                  placeholder="jane@your-dao.xyz"
                  value={filer.email}
                  onChange={(e) => setFiler((f) => ({ ...f, email: e.target.value }))}
                  disabled={filerSame}
                  aria-invalid={!!filer.email && !validEmail(filer.email)}
                  style={filerSame ? { opacity: 0.55 } : undefined}
                />
              </div>
              <div className="field full">
                <label>Phone</label>
                {filerSame ? (
                  <div
                    className="ef-pre"
                    style={{ height: 40, display: "flex", alignItems: "center" }}
                  >
                    {filer.phoneDial}{" "}
                    {filer.phoneNum || (
                      <span style={{ marginLeft: 4 }}>(uses business phone)</span>
                    )}
                  </div>
                ) : (
                  <PhoneInput
                    value={{
                      phoneDial: filer.phoneDial,
                      phoneIso: filer.phoneIso,
                      phoneNum: filer.phoneNum,
                    }}
                    onChange={(v) => setFiler((f) => ({ ...f, ...v }))}
                    placeholder="555 123 4567"
                  />
                )}
              </div>
            </div>
          </section>
        </div>

        {/* -------- Mailing / legal address (collapsible) -------- */}
        <div className="ef-section" style={{ marginTop: 22 }}>
          <div
            className="ef-sameas"
            style={{
              borderRadius: 10,
              border: "1px solid var(--line)",
              borderBottom: "1px solid var(--line)",
            }}
          >
            <button
              type="button"
              className={`ef-sameas-toggle ${mailingSame ? "on" : ""}`}
              onClick={() => setMailingSame(!mailingSame)}
              aria-pressed={mailingSame}
            />
            <span>
              {mailingSame
                ? "Mailing / legal address is the same as principal office"
                : "Use a separate mailing / legal address"}
            </span>
          </div>

          {!mailingSame && (
            <div className="ef-form" style={{ marginTop: 12 }}>
              <div className="ef-form-head">
                <div className="ef-form-head-k">
                  <div className="ef-form-kicker">Legal correspondence</div>
                  <div className="ef-form-title">Mailing address</div>
                </div>
                <span className="ef-stat-pill">P.O. boxes allowed</span>
              </div>
              <div className="ef-form-body">
                <div className="field full">
                  <label>Street address</label>
                  <input
                    className="input"
                    placeholder="P.O. Box 4421"
                    value={mailing.street1}
                    onChange={(e) => setMailing({ ...mailing, street1: e.target.value })}
                  />
                </div>
                <div className="ef-row-3">
                  <div className="field">
                    <label>City</label>
                    <input
                      className="input"
                      value={mailing.city}
                      onChange={(e) => setMailing({ ...mailing, city: e.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label>State</label>
                    <input
                      className="input"
                      value={mailing.region}
                      onChange={(e) => setMailing({ ...mailing, region: e.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label>Postal</label>
                    <input
                      className="input mono"
                      value={mailing.postal}
                      onChange={(e) => setMailing({ ...mailing, postal: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <StepCardFoot
        onPrev={onPrev}
        onNext={onNext}
        nextDisabled={!allOk}
        hint={
          allOk
            ? "Both forms complete"
            : !orgOk
              ? "Complete the principal office form"
              : !mailingOk
                ? "Complete the mailing address"
                : "Complete the organizer form"
        }
      />
    </div>
  );
}

// ---------- step 3: Contract ----------

interface ContractProps {
  activeDao?: FormationDao;
  chain?: FormationChain;
  contractAddr: string;
  onPrev: () => void;
  onNext: () => void;
}

export function StepContract({
  activeDao,
  chain,
  contractAddr,
  onPrev,
  onNext,
}: ContractProps) {
  const valid = /^0x[a-fA-F0-9]{40}$/.test(contractAddr);
  const supporting: { k: string; v: string | null; sub?: string }[] = [
    {
      k: "Timelock",
      v: activeDao?.timelock?.address ?? null,
    },
    {
      k: "ERC20Votes Token",
      v: activeDao?.token?.address ?? null,
      sub: activeDao?.symbol,
    },
  ];
  return (
    <div className="ef-card">
      <StepCardHead
        step={3}
        total={7}
        title="Smart contract bind"
        lede="The on-chain identifier Wyoming will treat as the canonical DAO contract. Sourced from your organization's Governor; switch orgs from the navbar to file a different entity."
      />
      <div className="ef-card-body">
        <div className="ef-section">
          <div className="ef-section-head">Canonical identifier</div>
          <div className="ef-summary">
            <div className="ef-summary-row">
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 500 }}>
                  DAO contract (Governor)
                </div>
                {activeDao?.governor?.name && (
                  <div className="ef-mute mono" style={{ fontSize: 11.5 }}>
                    {activeDao.governor.name}
                  </div>
                )}
              </div>
              <div className="mono ef-dim" style={{ fontSize: 12 }}>
                {contractAddr ? shortAddress(contractAddr) : "Not detected"}
              </div>
            </div>
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
                  {s.v ? shortAddress(s.v) : "Not detected"}
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

// ---------- step 4: Agent ----------

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
        step={4}
        total={7}
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
              {REGISTERED_AGENTS.map((a) => (
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

// ---------- step 5: Agreement ----------

interface AgreementProps {
  src: AgreementSource;
  setSrc: (v: AgreementSource) => void;
  storage: AgreementStorage;
  setStorage: (v: AgreementStorage) => void;
  /** Live on-chain governance parameters used to describe the voting +
   *  delay config in the generated agreement. Undefined while the read is
   *  still in flight; falls back to "—" placeholders. */
  governance?: FormationDao["governance"];
  /** Invoked when the user picks a file in the Upload tile. */
  onUpload?: (file: File) => void | Promise<void>;
  /** When set, shows that a doc is on file (path/uri) so the user knows
   *  the upload succeeded across page refreshes. */
  uploadedDocName?: string;
  onPrev: () => void;
  onNext: () => void;
}

export function StepAgreement({
  src,
  setSrc,
  storage,
  setStorage,
  governance,
  onUpload,
  uploadedDocName,
  onPrev,
  onNext,
}: AgreementProps) {
  const votingDelay = governance?.votingDelay || "—";
  const votingPeriod = governance?.votingPeriod || "—";
  const quorum = governance?.quorumRatio || "—";
  const timelockDelay = governance?.timelockMinDelay || "—";
  const filled = [
    {
      k: "Voting procedures",
      v: `votingDelay ${votingDelay} · votingPeriod ${votingPeriod}`,
    },
    { k: "Quorum threshold", v: `${quorum} of token supply` },
    { k: "Amendment procedure", v: "Governor proposal flow" },
    {
      k: "Smart contract upgrade",
      v: `Timelock-gated proposal · minDelay ${timelockDelay}`,
    },
  ];
  return (
    <div className="ef-card">
      <StepCardHead
        step={5}
        total={7}
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
                PDF, DOC or DOCX up to 10 MB. Optional Arweave URL.
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
                  {
                    id: "arweave" as const,
                    t: "Arweave",
                    s: "Public, permanent, indexable",
                  },
                  {
                    id: "chain" as const,
                    t: "Arweave + on-chain hash",
                    s: "Hash committed to the DAO contract (planned)",
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
            <label
              style={{
                display: "block",
                border: "1px dashed var(--line-strong)",
                borderRadius: 10,
                padding: 40,
                textAlign: "center",
                background: "var(--bg-elev-2)",
                color: "var(--text-dim)",
                cursor: onUpload ? "pointer" : "not-allowed",
              }}
            >
              <input
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f && onUpload) void onUpload(f);
                  // Reset so picking the same file again re-triggers onChange.
                  e.target.value = "";
                }}
                disabled={!onUpload}
              />
              <div style={{ fontSize: 14, marginBottom: 4 }}>
                {uploadedDocName
                  ? "File on record — pick another to replace"
                  : "Click to choose a file"}
              </div>
              <div
                className="mono"
                style={{ fontSize: 11.5, color: "var(--text-mute)" }}
              >
                PDF · DOC · DOCX · 10 MB max
              </div>
            </label>
            {uploadedDocName && (
              <div
                className="ef-pre"
                style={{ marginTop: 10 }}
              >{`Uploaded: ${uploadedDocName}`}</div>
            )}
            <div className="field full" style={{ marginTop: 14 }}>
              <label>Arweave / HTTPS URI (optional)</label>
              <input className="input mono" placeholder="ar://… or https://…" />
            </div>
          </div>
        )}
      </div>
      <StepCardFoot onPrev={onPrev} onNext={onNext} />
    </div>
  );
}

// ---------- step 6: Notice ----------

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
        step={6}
        total={7}
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

// ---------- step 7: Review & file ----------

interface ReviewProps {
  /** Server-side entity id — used as the path param when downloading the
   *  rendered Articles PDF. Optional only so the wizard can render the
   *  review step before the draft has been created server-side (which
   *  shouldn't happen in normal flow but keeps the type honest). When
   *  unset, the Download buttons disable themselves. */
  entityId?: string;
  name: string;
  mgmt: ManagementType;
  contractAddr: string;
  chain?: FormationChain;
  agent: FormationAgent | undefined;
  agentMode: AgentMode;
  agreementStorage: AgreementStorage;
  org: OrganizerOrg;
  mailing: OrganizerMailing;
  mailingSame: boolean;
  filer: OrganizerFiler;
  filed: boolean;
  setFiled: (v: boolean) => void;
  onPrev: () => void;
  onEdit: (id: StepId) => void;
  onFile: () => void;
}

export function StepReview({
  entityId,
  name,
  mgmt,
  contractAddr,
  chain,
  agent,
  agentMode,
  agreementStorage,
  org,
  mailing,
  mailingSame,
  filer,
  filed,
  setFiled,
  onPrev,
  onEdit,
  onFile,
}: ReviewProps) {
  // Download handler — defined before the `if (filed)` early return so
  // both the draft-mode "Download Articles draft" button and the post-
  // filing "Download stamped Articles" button can reuse it. Today both
  // hit the same endpoint; once the WY SOS handoff is wired up the
  // stamped variant will switch to whatever artifact the SOS returns.
  const downloadArticles = async () => {
    if (!entityId) return;
    try {
      await api.entities.downloadArticlesPdf(entityId);
    } catch (err) {
      console.error("Failed to download Articles PDF", err);
    }
  };

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
                      Open
                      <ChevronRight size={14} />
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
            Back to draft
          </button>
          <button
            type="button"
            className="btn-primary btn-sm"
            onClick={downloadArticles}
            disabled={!entityId}
          >
            <DownloadIcon size={14} />
            Download stamped Articles
          </button>
        </div>
      </div>
    );
  }

  const fullName = `${filer.first} ${filer.last}`.trim();
  const summary: { k: string; v: string; edit: StepId; mono?: boolean }[] = [
    { k: "Name", v: name, edit: "basics" },
    {
      k: "Management",
      v: mgmt === "member" ? "Member-managed" : "Algorithmically managed",
      edit: "basics",
    },
    {
      k: "Principal office",
      v: org.street1
        ? `${org.street1}, ${org.city} ${org.region} ${org.postal}`
        : "— Not set",
      edit: "organizer",
    },
    {
      k: "Mailing address",
      v: mailingSame
        ? "Same as principal office"
        : mailing.street1
          ? `${mailing.street1}, ${mailing.city} ${mailing.region} ${mailing.postal}`
          : "— Not set",
      edit: "organizer",
    },
    {
      k: "Business contact",
      v: org.email
        ? `${org.email} · ${org.phoneDial} ${org.phoneNum}`
        : "— Not set",
      edit: "organizer",
    },
    {
      k: "Organizer",
      v: fullName
        ? `${fullName}${filer.role ? " · " + filer.role : ""}`
        : "— Not set",
      edit: "organizer",
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
          : agreementStorage === "arweave"
            ? "Arweave"
            : "Arweave + on-chain hash",
      edit: "agreement",
    },
  ];

  const stateFee = 100;
  const agentFee = agentMode === "service" ? (agent?.price ?? 0) : 0;
  const total = stateFee + agentFee;

  // Build the same `ArticlesMergeData` the API uses when rendering the
  // PDF, so the on-screen preview and the downloadable PDF stay byte-for-
  // byte aligned. The PDF endpoint pulls these values from the persisted
  // Entity row; here we read them from local React state so the preview
  // reflects unsaved edits the user is still typing into the wizard.
  // Address composition mirrors the server's `composeAddress` helper.
  const principalOfficeFull = org.street1
    ? `${org.street2 ? `${org.street1}, ${org.street2}` : org.street1}, ${org.city} ${org.region} ${org.postal}`
    : "";
  const articlesData: ArticlesMergeData = {
    legalName: name,
    principalOffice: principalOfficeFull,
    businessEmail: org.email || "",
    businessPhone: org.phoneNum ? `${org.phoneDial} ${org.phoneNum}` : "",
    filerFirstName: filer.first || "",
    filerLastName: filer.last || "",
    filerRoleClaim: filer.role || "",
    managementClause:
      mgmt === "member" ? "member-managed" : "algorithmically managed",
    contractAddress: contractAddr || "",
    chainName: chain?.name || "Polygon",
    chainId: String(chain?.chainId ?? 137),
    registeredAgentName:
      agentMode === "service" ? agent?.name || "" : "Self-listed agent",
    operatingAgreementUri: "ar://placeholder-tx-id",
    agreementStorageActive: agreementStorage !== "off",
  };

  // Inline runs come from the template; we just style them. `merge` =
  // body text in a highlighted span so the user can see what was pulled
  // from their inputs; `mergeMono` = same, plus monospace. Resolve the
  // placeholder fallback locally so unset values show as e.g. "[legalName]"
  // both here and in the PDF.
  const renderInline = (run: Inline, key: number): ReactNode => {
    if (run.kind === "text") return <span key={key}>{run.value}</span>;
    const raw = articlesData[run.field];
    const value =
      typeof raw === "boolean"
        ? ""
        : raw && raw.length > 0
          ? raw
          : `[${run.field}]`;
    return (
      <span
        key={key}
        className={`ef-doc-fill${run.kind === "mergeMono" ? " mono" : ""}`}
      >
        {value}
      </span>
    );
  };

  return (
    <div className="ef-card">
      <StepCardHead
        step={7}
        total={7}
        title="Review and file"
        lede="A final look at the rendered Articles, side-by-side with the summary and cost."
      />
      <div className="ef-card-body">
        <div className="ef-review">
          <div className="ef-doc">
            <h3 className="ef-doc-title">{ARTICLES_TITLE}</h3>
            <div className="ef-doc-sub">{ARTICLES_SUBTITLE}</div>

            {activeSections(articlesData).map((section) => (
              <div key={section.id} className="ef-doc-art">
                <div className="ef-doc-art-h">{section.heading}</div>
                {section.paragraphs.map((paragraph, pi) => (
                  <div key={pi}>{paragraph.map(renderInline)}</div>
                ))}
              </div>
            ))}

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
              {ARTICLES_FOOTER}
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
                onClick={downloadArticles}
                disabled={!entityId}
              >
                <DownloadIcon size={14} />
                Download Articles draft
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="ef-card-foot">
        <button type="button" className="btn-ghost btn-sm" onClick={onPrev}>
          Back
        </button>
        <button type="button" className="btn-primary btn-sm" onClick={onFile}>
          File with Wyoming · ${total}
        </button>
      </div>
    </div>
  );
}
