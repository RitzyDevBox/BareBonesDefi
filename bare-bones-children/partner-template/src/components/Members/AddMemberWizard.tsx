import { Fragment, useEffect, useMemo, useState } from "react";
import { ACCOUNT_TYPES } from "../../data/membersSeed";
import {
  AccountTypeId, KycStatus, Member, OnboardingStatus, Permission, Role, SbtStatus, WalletKind,
} from "../../types/members";
import { MembersModal } from "./MembersModal";

interface AddMemberWizardProps {
  roles: Role[];
  permissions: Permission[];
  onClose: () => void;
  onCreate: (member: Member) => void;
}

enum WalletMode {
  Generate = "generate",
  Connect = "connect",
}

const STEPS = ["Account type", "Identity & wallet", "Role assignment"] as const;

interface WizardForm {
  accountType: AccountTypeId | null;
  name: string;
  email: string;
  jurisdiction: string;
  walletMode: WalletMode;
  walletAddress: string;
  kycRequired: boolean;
  roles: string[];
}

const INITIAL_FORM: WizardForm = {
  accountType: null,
  name: "",
  email: "",
  jurisdiction: "",
  walletMode: WalletMode.Generate,
  walletAddress: "",
  kycRequired: true,
  roles: [],
};

const ETH_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

function generateMockAddress(seed: string): string {
  // Deterministic mock so the same name always yields the same generated
  // address — matches the design's behavior so the "wallet provisioned" hint
  // doesn't shift on every re-render.
  const safe = seed || "anon";
  let out = "0x";
  for (let i = 0; i < 40; i += 1) {
    const c = safe.charCodeAt(i % safe.length);
    out += "0123456789abcdef"[(c + i * 7) % 16];
  }
  return out;
}

export function AddMemberWizard({ roles, permissions, onClose, onCreate }: AddMemberWizardProps) {
  const [stepIdx, setStepIdx] = useState(0);
  const [form, setForm] = useState<WizardForm>(INITIAL_FORM);

  function set<K extends keyof WizardForm>(key: K, value: WizardForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // KYC default tracks the chosen account type.
  useEffect(() => {
    if (!form.accountType) return;
    const acct = ACCOUNT_TYPES.find((a) => a.id === form.accountType);
    if (acct) setForm((f) => ({ ...f, kycRequired: acct.kycDefault }));
  }, [form.accountType]);

  const canAdvance = useMemo(() => {
    if (stepIdx === 0) return !!form.accountType;
    if (stepIdx === 1) {
      if (!form.name.trim() || !form.email.trim()) return false;
      if (form.walletMode === WalletMode.Connect && !ETH_ADDRESS_RE.test(form.walletAddress.trim())) return false;
      return true;
    }
    return true;
  }, [stepIdx, form]);

  function submit() {
    if (!form.accountType) return;
    const initials = form.name
      .trim()
      .split(/\s+/)
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "??";
    const member: Member = {
      // Pre-submit draft — the real memberId is allocated by the contract
      // on `onboardMembers` and surfaces back via the subgraph. Placeholder
      // matches `id` so any consumer that reads `memberId` before the tx
      // is mined sees a value (and the post-tx subgraph refresh replaces it).
      id: `mbr_${Math.random().toString(36).slice(2, 8)}`,
      memberId: "",
      name: form.name.trim(),
      email: form.email.trim(),
      jurisdiction: form.jurisdiction.trim() || "—",
      initials,
      avatarHue: 200 + Math.floor(Math.random() * 80),
      accountType: form.accountType,
      roles: form.roles,
      wallet: {
        address: form.walletMode === WalletMode.Generate
          ? generateMockAddress(form.name)
          : form.walletAddress.trim(),
        kind: WalletKind.SmartAccount,
        deployed: form.walletMode !== WalletMode.Generate,
      },
      sbt: {
        status: form.kycRequired ? SbtStatus.Pending : SbtStatus.Active,
        tokenId: null,
        contract: "0xSBT0…anchor",
        mintedAt: null,
      },
      onboardingStatus: OnboardingStatus.Invited,
      kyc: {
        required: form.kycRequired,
        status: form.kycRequired ? KycStatus.Pending : KycStatus.NotRequired,
      },
      dateAdded: new Date().toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric",
      }),
    };
    onCreate(member);
  }

  const stepStrip = (
    <div className="bb-amw-steps">
      {STEPS.map((label, i) => {
        const done = i < stepIdx;
        const active = i === stepIdx;
        return (
          <Fragment key={label}>
            <div className={`bb-amw-step${active ? " bb-active" : ""}${done ? " bb-done" : ""}`}>
              <span className="bb-amw-step-num">{done ? "✓" : i + 1}</span>
              <span>{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <span className={`bb-amw-step-line${done ? " bb-done" : ""}`} />
            )}
          </Fragment>
        );
      })}
    </div>
  );

  const footer = (
    <>
      <div className="bb-amw-foot-hint">
        {stepIdx === 0 && "Pick one"}
        {stepIdx === 1 && (form.walletMode === WalletMode.Generate
          ? "Wallet provisioned automatically · deployed on first transaction"
          : "Address validated against EVM format")}
        {stepIdx === 2 && (form.roles.length > 0
          ? `${form.roles.length} role${form.roles.length === 1 ? "" : "s"} selected`
          : "No roles · member of record only")}
      </div>
      <div className="bb-amw-foot-actions">
        {stepIdx > 0 && (
          <button className="bb-btn-ghost bb-btn-xs" onClick={() => setStepIdx((i) => i - 1)}>Back</button>
        )}
        {stepIdx < STEPS.length - 1 ? (
          <button
            className="bb-btn-primary bb-btn-xs"
            disabled={!canAdvance}
            onClick={() => setStepIdx((i) => i + 1)}
          >
            Continue →
          </button>
        ) : (
          <button className="bb-btn-primary bb-btn-xs" onClick={submit}>
            ✓ Create &amp; invite
          </button>
        )}
      </div>
    </>
  );

  return (
    <MembersModal
      kicker="Add member"
      title={STEPS[stepIdx]}
      onClose={onClose}
      steps={stepStrip}
      footer={footer}
    >
      {stepIdx === 0 && <AccountTypeStep value={form.accountType} onPick={(t) => set("accountType", t)} />}
      {stepIdx === 1 && <IdentityStep form={form} set={set} />}
      {stepIdx === 2 && form.accountType && (
        <RoleStep
          form={form} set={set}
          accountType={form.accountType}
          allRoles={roles}
          allPermissions={permissions}
        />
      )}
    </MembersModal>
  );
}

// ────────────────────────────────────────────────────────────────────────────

const ACCT_GLYPH: Record<AccountTypeId, string> = {
  [AccountTypeId.Member]: "✦",
  [AccountTypeId.Investor]: "$",
  [AccountTypeId.Contractor]: "⊙",
};

function AccountTypeStep({
  value, onPick,
}: { value: AccountTypeId | null; onPick: (id: AccountTypeId) => void }) {
  return (
    <div className="bb-amw-body">
      <div className="bb-amw-kicker">Step 1 · Coarse classification</div>
      <h3 className="bb-amw-title">What kind of account is this?</h3>
      <p className="bb-amw-sub">
        Roles and permissions (next step) layer on top of this. You can change roles any time, but the account type is fixed once minted.
      </p>
      <div className="bb-amw-acct-grid">
        {ACCOUNT_TYPES.map((t) => (
          <button
            key={t.id}
            className={`bb-amw-acct-card${value === t.id ? " bb-selected" : ""}`}
            onClick={() => onPick(t.id)}
          >
            <span className="bb-amw-acct-icon">{ACCT_GLYPH[t.id]}</span>
            <div className="bb-amw-acct-name">{t.name}</div>
            <div className="bb-amw-acct-sub">{t.sub}</div>
            <div className="bb-amw-acct-desc">{t.desc}</div>
            <div className="bb-amw-acct-meta">{t.kycDefault ? "KYC required" : "KYC optional"}</div>
            {value === t.id && <span className="bb-amw-acct-check">✓</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

function IdentityStep({
  form, set,
}: {
  form: WizardForm;
  set: <K extends keyof WizardForm>(key: K, value: WizardForm[K]) => void;
}) {
  const acct = form.accountType ? ACCOUNT_TYPES.find((a) => a.id === form.accountType) : null;
  return (
    <div className="bb-amw-body">
      <div className="bb-amw-kicker">Step 2 · Identity &amp; wallet</div>
      <h3 className="bb-amw-title">Who are they, and how will they sign?</h3>

      <div className="bb-amw-grid">
        <div className="bb-amw-field">
          <label>Full name</label>
          <input
            className="bb-amw-input"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Alex Rivera"
          />
        </div>
        <div className="bb-amw-field">
          <label>Email</label>
          <input
            className="bb-amw-input"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="alex@quorum.xyz"
          />
        </div>
        <div className="bb-amw-field bb-full">
          <label>Jurisdiction</label>
          <input
            className="bb-amw-input"
            value={form.jurisdiction}
            onChange={(e) => set("jurisdiction", e.target.value)}
            placeholder="United States · DE"
          />
        </div>
      </div>

      <div className="bb-amw-section-head">Wallet</div>
      <div className="bb-amw-wallet-toggle">
        <button
          className={`bb-amw-wt${form.walletMode === WalletMode.Generate ? " bb-on" : ""}`}
          onClick={() => set("walletMode", WalletMode.Generate)}
        >
          <span className="bb-amw-wt-icon">+</span>
          <div>
            <div className="bb-amw-wt-name">Generate new</div>
            <div className="bb-amw-wt-sub">Counterfactual smart account · deployed on first use</div>
          </div>
        </button>
        <button
          className={`bb-amw-wt${form.walletMode === WalletMode.Connect ? " bb-on" : ""}`}
          onClick={() => set("walletMode", WalletMode.Connect)}
        >
          <span className="bb-amw-wt-icon">⊙</span>
          <div>
            <div className="bb-amw-wt-name">Connect existing</div>
            <div className="bb-amw-wt-sub">Paste an EOA or smart-account address</div>
          </div>
        </button>
      </div>
      {form.walletMode === WalletMode.Connect && (
        <div className="bb-amw-field" style={{ marginTop: 10 }}>
          <label>Wallet address</label>
          <input
            className="bb-amw-input bb-mono"
            value={form.walletAddress}
            onChange={(e) => set("walletAddress", e.target.value)}
            placeholder="0x…"
          />
        </div>
      )}

      <div className="bb-amw-kyc">
        <label className="bb-amw-kyc-row">
          <input
            type="checkbox"
            checked={form.kycRequired}
            onChange={(e) => set("kycRequired", e.target.checked)}
          />
          <span>
            <b>KYC required</b>
            <span className="bb-amw-kyc-hint">
              Default for {acct?.name ?? "this"}: {acct?.kycDefault ? "required" : "optional"}.
              Member stays in <span style={{ fontFamily: "var(--bb-font-mono)" }}>invited</span> until verification clears.
            </span>
          </span>
        </label>
      </div>
    </div>
  );
}

function RoleStep({
  form, set, accountType, allRoles, allPermissions,
}: {
  form: WizardForm;
  set: <K extends keyof WizardForm>(key: K, value: WizardForm[K]) => void;
  accountType: AccountTypeId;
  allRoles: Role[];
  allPermissions: Permission[];
}) {
  // System roles (SuperAdmin / Admin / Pauser / etc.) are managed at the
  // contract level only — never assignable through the standard onboarding
  // UX. Hide them from this picker so the user can't accidentally try to
  // assign them via assignRoles (the contract would either revert or, for
  // SuperAdmin specifically, only accept transferSuperAdmin).
  const compatible = allRoles.filter(
    (r) => !r.isSystemRole && r.accountTypes.includes(accountType),
  );

  function toggle(id: string) {
    set("roles", form.roles.includes(id) ? form.roles.filter((r) => r !== id) : [...form.roles, id]);
  }

  const effectivePerms = useMemo(() => {
    const ids = new Set<string>();
    for (const rid of form.roles) {
      const r = allRoles.find((rr) => rr.id === rid);
      if (r) for (const pid of r.permissions) ids.add(pid);
    }
    return Array.from(ids)
      .map((id) => allPermissions.find((p) => p.id === id))
      .filter((p): p is Permission => !!p);
  }, [form.roles, allRoles, allPermissions]);

  return (
    <div className="bb-amw-body">
      <div className="bb-amw-kicker">Step 3 · Role assignment</div>
      <h3 className="bb-amw-title">What can they do?</h3>
      <p className="bb-amw-sub">
        Pick one or more roles compatible with the <b>{accountType}</b> account type. The combined permission set is shown below.
      </p>

      <div className="bb-amw-roles">
        {compatible.map((r) => (
          <button
            key={r.id}
            className={`bb-amw-role-card${form.roles.includes(r.id) ? " bb-on" : ""}`}
            onClick={() => toggle(r.id)}
          >
            <div className="bb-amw-role-head">
              <span className="bb-amw-role-name">{r.name}</span>
              {r.isDefault && <span className="bb-amw-role-default">default</span>}
              <span className="bb-amw-role-perm-count">{r.permissions.length} perm</span>
            </div>
            <div className="bb-amw-role-desc">{r.desc}</div>
            <span className="bb-amw-role-check">✓</span>
          </button>
        ))}
        {compatible.length === 0 && (
          <div className="bb-amw-empty">No roles compatible with this account type yet.</div>
        )}
      </div>

      <div className="bb-amw-section-head">Effective permissions</div>
      {effectivePerms.length === 0 ? (
        <div className="bb-amw-empty">
          No on-chain permissions yet. They'll be a member of record only.
        </div>
      ) : (
        <div className="bb-amw-perm-list">
          {effectivePerms.map((p) => (
            <div key={p.id} className="bb-amw-perm-row">
              <span aria-hidden>⚡</span>
              <div>
                <div className="bb-amw-perm-name">{p.name}</div>
                <div className="bb-amw-perm-sub">
                  {p.targetName} · {p.function.split("(")[0]}
                  {p.constraints.length > 0
                    && ` · ${p.constraints.length} constraint${p.constraints.length === 1 ? "" : "s"}`}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
