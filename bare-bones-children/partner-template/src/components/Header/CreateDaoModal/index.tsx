import { useEffect, useMemo, useState } from "react";
import { useWalletProvider } from "../../../hooks/useWalletProvider";
import { useActiveOrganization } from "../../../providers/ActiveOrganizationProvider";
import { getMockGovernanceTokenByChain } from "../../../constants/misc";
import { StepIdentity } from "./StepIdentity";
import { StepGovernance } from "./StepGovernance";
import { StepRoles } from "./StepRoles";
import {
  validateIdentity,
  validateGovernance,
  validateRoles,
  type IdentityForm,
  type GovernanceForm,
  type RolesForm,
} from "./validation";
import { useDeployDao } from "./useDeployDao";

interface CreateDaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** When provided the org slug is pre-filled and locked, step 1 is skipped. */
  lockedOrgSlug?: string;
}

type StepId = 1 | 2 | 3;

const STEPS: { id: StepId; label: string }[] = [
  { id: 1, label: "Identity" },
  { id: 2, label: "Governance" },
  { id: 3, label: "Roles" },
];

function buildInitialForm(chainId: number | null, account: string | null) {
  return {
    identity: {
      orgSlug: "",
    } as IdentityForm,
    governance: {
      token: chainId ? getMockGovernanceTokenByChain(chainId) : "",
      timelockDelay: "86400",
      votingDelay: "1",
      votingPeriod: "45818",
      proposalThreshold: "1000000000000000000",
      quorumNumerator: "4",
    } as GovernanceForm,
    roles: {
      cancellers: [account ?? ""],
    } as RolesForm,
  };
}

export function CreateDaoModal({ isOpen, onClose, lockedOrgSlug }: CreateDaoModalProps) {
  const { account, chainId } = useWalletProvider();
  const { setActiveOrgSlug, refreshOwnedOrgs } = useActiveOrganization();
  const { deploy, getCanonicalDao, isWorking, launcherConfigured, config } = useDeployDao();

  const initialStep: StepId = lockedOrgSlug ? 2 : 1;
  const [step, setStep] = useState<StepId>(initialStep);
  const [forms, setForms] = useState(() => buildInitialForm(chainId, account));
  const [error, setError] = useState<string | null>(null);
  const [existingDao, setExistingDao] = useState<{ governor: string; timelock: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const base = buildInitialForm(chainId, account);
      setForms(lockedOrgSlug ? { ...base, identity: { ...base.identity, orgSlug: lockedOrgSlug } } : base);
      setStep(lockedOrgSlug ? 2 : 1);
      setError(null);
      setExistingDao(null);
    }
  }, [isOpen, chainId, account, lockedOrgSlug]);

  // Probe for an already-deployed canonical DAO whenever the org name settles.
  // Debounced via name-trim watcher; if `daoOf` returns a non-zero governor we
  // disable the deploy CTA — the on-chain write would revert anyway.
  useEffect(() => {
    if (!isOpen) return;
    const name = forms.identity.orgSlug.trim();
    if (!name) {
      setExistingDao(null);
      return;
    }
    let cancelled = false;
    const handle = setTimeout(() => {
      void getCanonicalDao(name).then((dao) => {
        if (!cancelled) setExistingDao(dao);
      });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [isOpen, forms.identity.orgSlug, getCanonicalDao]);

  const canContinueFromIdentity = useMemo(
    () => validateIdentity(forms.identity) === null,
    [forms.identity],
  );
  const canContinueFromGovernance = useMemo(
    () => validateGovernance(forms.governance) === null,
    [forms.governance],
  );

  const daoFactoryConfigured = Boolean(config?.daoFactoryAddress) && launcherConfigured;

  if (!isOpen) return null;

  function next() {
    setError(null);
    if (step === 1) {
      const err = validateIdentity(forms.identity);
      if (err) return setError(err);
      setStep(2);
    } else if (step === 2) {
      const err = validateGovernance(forms.governance);
      if (err) return setError(err);
      setStep(3);
    }
  }

  function back() {
    setError(null);
    if (step === 3) setStep(2);
    else if (step === 2 && !lockedOrgSlug) setStep(1);
  }

  async function handleDeploy() {
    setError(null);
    const idErr = validateIdentity(forms.identity);
    if (idErr) return setError(idErr);
    const govErr = validateGovernance(forms.governance);
    if (govErr) return setError(govErr);
    const rolesErr = validateRoles(forms.roles);
    if (rolesErr) return setError(rolesErr);

    const orgName = forms.identity.orgSlug.trim();
    const ok = await deploy({
      orgName,
      token: forms.governance.token,
      timelockDelay: forms.governance.timelockDelay,
      votingDelay: forms.governance.votingDelay,
      votingPeriod: forms.governance.votingPeriod,
      proposalThreshold: forms.governance.proposalThreshold,
      quorumNumerator: forms.governance.quorumNumerator,
      cancellers: forms.roles.cancellers.map((c) => c.trim()).filter(Boolean),
    });
    if (ok) {
      await refreshOwnedOrgs();
      setActiveOrgSlug(orgName);
      onClose();
    }
  }

  const updateIdentity = (patch: Partial<IdentityForm>) =>
    setForms((s) => ({ ...s, identity: { ...s.identity, ...patch } }));
  const updateGovernance = (patch: Partial<GovernanceForm>) =>
    setForms((s) => ({ ...s, governance: { ...s.governance, ...patch } }));
  const updateRoles = (patch: Partial<RolesForm>) =>
    setForms((s) => ({ ...s, roles: { ...s.roles, ...patch } }));

  return (
    <div
      className="bb-modal-scrim"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          (e.currentTarget as any).__scrimPress = true;
        }
      }}
      onMouseUp={(e) => {
        if ((e.currentTarget as any).__scrimPress && e.target === e.currentTarget) {
          onClose();
        }
        (e.currentTarget as any).__scrimPress = false;
      }}
    >
      <div className="bb-modal bb-modal-lg">
        <div className="bb-modal-head">
          <div>
            <div className="bb-modal-kicker">{lockedOrgSlug ? `Deploying DAO for "${lockedOrgSlug}"` : "Deploy a new DAO"}</div>
            <h3>Create DAO</h3>
          </div>
          <button className="bb-icon-btn" onClick={onClose} aria-label="Close" disabled={isWorking}>
            ✕
          </button>
        </div>

        <div className="bb-cd-steps">
          {STEPS.map((s, i) => {
            const effectiveDone: boolean = !!(lockedOrgSlug && s.id === 1);
            const state = effectiveDone ? "bb-done" : step === s.id ? "bb-active" : step > s.id ? "bb-done" : "";
            return (
              <span key={s.id} style={{ display: "inline-flex", alignItems: "center", gap: 0, flex: i < STEPS.length - 1 ? 1 : 0 }}>
                <button
                  type="button"
                  className={`bb-cd-step ${state}`}
                  onClick={() => !effectiveDone && step > s.id && setStep(s.id)}
                  disabled={effectiveDone}
                >
                  <span className="bb-cd-step-num">{s.id}</span>
                  <span>{s.label}</span>
                </button>
                {i < STEPS.length - 1 && <span className={`bb-cd-step-line${(effectiveDone || step > s.id) ? " bb-done" : ""}`} />}
              </span>
            );
          })}
        </div>

        <div className="bb-modal-body">
          {step === 1 && <StepIdentity form={forms.identity} onChange={updateIdentity} locked={!!lockedOrgSlug} />}
          {step === 2 && <StepGovernance form={forms.governance} onChange={updateGovernance} />}
          {step === 3 && <StepRoles form={forms.roles} onChange={updateRoles} />}

          {error && (
            <div className="bb-banner bb-banner-warn" style={{ marginTop: 16, marginBottom: 0 }}>
              <span>⚠</span>
              <div>{error}</div>
              <span />
            </div>
          )}

          {!daoFactoryConfigured && step > 1 && (
            <div className="bb-banner bb-banner-warn" style={{ marginTop: 12, marginBottom: 0 }}>
              <span>⚠</span>
              <div>OrgAndDaoLauncher is not configured for this chain — only "Register organization only" will succeed.</div>
              <span />
            </div>
          )}

          {existingDao && step > 1 && (
            <div className="bb-banner bb-banner-warn" style={{ marginTop: 12, marginBottom: 0 }}>
              <span>⚠</span>
              <div>
                This org already has a canonical DAO — Governor at{" "}
                <span className="bb-mono bb-small">{existingDao.governor}</span>. Deploying again will revert.
              </div>
              <span />
            </div>
          )}
        </div>

        <div className="bb-modal-foot" style={{ justifyContent: "space-between" }}>
          <div>
            {step > (lockedOrgSlug ? 2 : 1) && (
              <button className="bb-btn-ghost" onClick={back} disabled={isWorking}>
                ← Back
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {step < 3 && (
              <button
                className="bb-btn-primary"
                onClick={next}
                disabled={
                  isWorking ||
                  (step === 1 && !canContinueFromIdentity) ||
                  (step === 2 && !canContinueFromGovernance)
                }
                data-testid="dao-modal-continue"
              >
                Continue →
              </button>
            )}
            {step === 3 && (
              <button
                className="bb-btn-primary"
                onClick={() => void handleDeploy()}
                disabled={isWorking || !daoFactoryConfigured || existingDao !== null}
                data-testid="dao-modal-deploy"
              >
                {isWorking ? <span className="bb-spinner bb-sm" /> : null}
                Deploy DAO
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
