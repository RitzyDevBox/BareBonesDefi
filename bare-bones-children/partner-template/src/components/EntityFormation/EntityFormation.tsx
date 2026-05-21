import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toastStore } from "../Toasts/toast.store";
import {
  ToastBehavior,
  ToastPosition,
  ToastType,
} from "../Toasts/toast.types";
import { REGISTERED_AGENTS } from "./agents.config";
import { CheckIcon } from "./CheckIcon";
import {
  StepAgent,
  StepAgreement,
  StepBasics,
  StepContract,
  StepEligibility,
  StepNotice,
  StepOrganizer,
  StepReview,
} from "./steps";
import {
  AgentCustom,
  AgentMode,
  AgreementSource,
  AgreementStorage,
  EF_STEPS,
  FormationChain,
  FormationDao,
  FormationWallet,
  ManagementType,
  OrganizerFiler,
  OrganizerMailing,
  OrganizerOrg,
  StepId,
  STUB_GOVERNOR_ADDRESS,
  makeEmptyFiler,
  makeEmptyMailing,
  makeEmptyOrg,
} from "./types";
import "./entity-formation.css";

interface EntityFormationProps {
  /** Optional. When present, the wizard pre-fills name + addresses from this
   *  DAO. The flow remains usable when absent — entity formation isn't
   *  required to be DAO-scoped. */
  activeDao?: FormationDao;
  chain?: FormationChain;
  wallet?: FormationWallet;
  onConnectWallet?: () => void;
}

function isStepId(s: string | null): s is StepId {
  return !!s && EF_STEPS.some((step) => step.id === s);
}

export function EntityFormation({
  activeDao,
  chain,
  wallet,
  onConnectWallet,
}: EntityFormationProps) {
  const [params, setParams] = useSearchParams();
  const stepParam = params.get("step");
  const step: StepId = isStepId(stepParam) ? stepParam : "eligibility";

  const goStep = (id: StepId) => {
    const next = new URLSearchParams(params);
    next.set("step", id);
    setParams(next, { replace: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const stepIdx = EF_STEPS.findIndex((s) => s.id === step);
  const nextStep = () =>
    goStep(EF_STEPS[Math.min(stepIdx + 1, EF_STEPS.length - 1)].id);
  const prevStep = () => goStep(EF_STEPS[Math.max(stepIdx - 1, 0)].id);

  const defaultName = useMemo(
    () => `${activeDao?.name || "Acme"} DAO LLC`,
    [activeDao?.name],
  );
  const defaultContract = useMemo(
    () => activeDao?.governor?.address || STUB_GOVERNOR_ADDRESS,
    [activeDao?.governor?.address],
  );

  const [name, setName] = useState(defaultName);
  const [mgmt, setMgmt] = useState<ManagementType>("member");
  const [contractAddr, setContractAddr] = useState(defaultContract);
  const [org, setOrg] = useState<OrganizerOrg>(makeEmptyOrg);
  const [mailingSame, setMailingSame] = useState(true);
  const [mailing, setMailing] = useState<OrganizerMailing>(makeEmptyMailing);
  const [filer, setFiler] = useState<OrganizerFiler>(makeEmptyFiler);
  const [filerSame, setFilerSame] = useState(false);
  const [agentMode, setAgentMode] = useState<AgentMode>("service");
  const [agentId, setAgentId] = useState("cloudpeak");
  const [agentCustom, setAgentCustom] = useState<AgentCustom>({
    name: "",
    street: "",
    city: "Cheyenne",
    zip: "82001",
  });
  const [agreementSrc, setAgreementSrc] = useState<AgreementSource>("generate");
  const [agreementStorage, setAgreementStorage] = useState<AgreementStorage>("arweave");
  const [notice, setNotice] = useState(false);
  const [filed, setFiled] = useState(false);

  // Pre-fill from activeDao when it arrives async AND the user hasn't typed
  // anything yet (state still matches the pre-load defaults). Avoids the
  // wipe-on-late-load footgun.
  useEffect(() => {
    if (activeDao?.name && name === "Acme DAO LLC") {
      setName(`${activeDao.name} DAO LLC`);
    }
  }, [activeDao?.name, name]);
  useEffect(() => {
    if (activeDao?.governor?.address && contractAddr === STUB_GOVERNOR_ADDRESS) {
      setContractAddr(activeDao.governor.address);
    }
  }, [activeDao?.governor?.address, contractAddr]);

  const agent = REGISTERED_AGENTS.find((a) => a.id === agentId);
  const progress = Math.round((stepIdx / (EF_STEPS.length - 1)) * 100);

  const file = () => {
    setFiled(true);
    toastStore.show({
      id: `formation-filed-${Date.now()}`,
      title: "Filing submitted",
      message: "Articles sent to Wyoming SOS. Filing ID arrives in 1–2 days.",
      type: ToastType.Success,
      behavior: ToastBehavior.AutoClose,
      durationMs: 5000,
      position: ToastPosition.Top,
    });
  };

  if (!wallet) {
    return (
      <div className="entity-formation-root">
        <Hero
          activeDao={activeDao}
          chain={chain}
          progress={0}
          stepIdx={0}
        />
        <section className="container">
          <div style={{ padding: "40px 0 80px" }}>
            <div className="ef-card">
              <div className="ef-card-head">
                <div>
                  <div className="ef-card-kicker">Wallet required</div>
                  <h3 className="ef-card-title">Connect a wallet to file</h3>
                  <p className="ef-card-lede">
                    Filing signs a record on behalf of{" "}
                    {activeDao?.name || "this entity"}. Connect a wallet with
                    WY_FILING_ROLE or Super Admin.
                  </p>
                </div>
              </div>
              <div className="ef-card-body">
                {onConnectWallet ? (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={onConnectWallet}
                  >
                    Connect wallet
                  </button>
                ) : (
                  <div className="ef-pre">
                    Connect a wallet from the header to begin.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="entity-formation-root">
      <Hero
        activeDao={activeDao}
        chain={chain}
        progress={progress}
        stepIdx={stepIdx}
        filed={filed}
        entityName={name}
      />

      <section className="container">
        <div className="ef-shell">
          <nav className="ef-stepnav" aria-label="Formation steps">
            <div className="ef-stepnav-head">Filing progress</div>
            <div className="ef-stepnav-list">
              {EF_STEPS.map((s, i) => {
                const done = i < stepIdx && !filed;
                const active = i === stepIdx && !filed;
                const cls = filed ? "done" : active ? "active" : done ? "done" : "";
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={`ef-step ${cls}`}
                    onClick={() => goStep(s.id)}
                  >
                    <span className="ef-step-dot">
                      {filed || done ? (
                        <CheckIcon size={11} stroke={2.5} />
                      ) : (
                        String(i).padStart(2, "0")
                      )}
                    </span>
                    <span className="ef-step-k">
                      <span className="ef-step-l">{s.label}</span>
                      <span className="ef-step-s">{s.sub}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>

          <div>
            {step === "eligibility" && (
              <StepEligibility
                activeDao={activeDao}
                wallet={wallet}
                onNext={nextStep}
              />
            )}
            {step === "basics" && (
              <StepBasics
                name={name}
                setName={setName}
                mgmt={mgmt}
                setMgmt={setMgmt}
                onPrev={prevStep}
                onNext={nextStep}
              />
            )}
            {step === "organizer" && (
              <StepOrganizer
                org={org}
                setOrg={setOrg}
                mailingSame={mailingSame}
                setMailingSame={setMailingSame}
                mailing={mailing}
                setMailing={setMailing}
                filer={filer}
                setFiler={setFiler}
                filerSame={filerSame}
                setFilerSame={setFilerSame}
                onPrev={prevStep}
                onNext={nextStep}
              />
            )}
            {step === "contract" && (
              <StepContract
                activeDao={activeDao}
                chain={chain}
                contractAddr={contractAddr}
                setContractAddr={setContractAddr}
                onPrev={prevStep}
                onNext={nextStep}
              />
            )}
            {step === "agent" && (
              <StepAgent
                agentMode={agentMode}
                setAgentMode={setAgentMode}
                agentId={agentId}
                setAgentId={setAgentId}
                agentCustom={agentCustom}
                setAgentCustom={setAgentCustom}
                onPrev={prevStep}
                onNext={nextStep}
              />
            )}
            {step === "agreement" && (
              <StepAgreement
                src={agreementSrc}
                setSrc={setAgreementSrc}
                storage={agreementStorage}
                setStorage={setAgreementStorage}
                onPrev={prevStep}
                onNext={nextStep}
              />
            )}
            {step === "notice" && (
              <StepNotice
                activeDao={activeDao}
                notice={notice}
                setNotice={setNotice}
                onPrev={prevStep}
                onNext={nextStep}
              />
            )}
            {step === "review" && (
              <StepReview
                name={name}
                mgmt={mgmt}
                contractAddr={contractAddr}
                chain={chain}
                agent={agent}
                agentMode={agentMode}
                agreementStorage={agreementStorage}
                org={org}
                mailing={mailing}
                mailingSame={mailingSame}
                filer={filer}
                filed={filed}
                setFiled={setFiled}
                onPrev={prevStep}
                onEdit={goStep}
                onFile={file}
              />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

interface HeroProps {
  activeDao?: FormationDao;
  chain?: FormationChain;
  progress: number;
  stepIdx: number;
  filed?: boolean;
  entityName?: string;
}

function Hero({ activeDao, chain, progress, stepIdx, filed, entityName }: HeroProps) {
  return (
    <section className="ef-hero">
      <div className="container">
        <div className="ef-hero-inner">
          <div>
            <div className="crumb">
              {[activeDao?.name, chain?.name, "Entity formation"]
                .filter(Boolean)
                .join(" · ")}
            </div>
            <h1>
              {filed ? (
                <>
                  You're a <em>Wyoming DAO LLC</em>.
                </>
              ) : (
                <>
                  Register as a <em>Wyoming DAO LLC</em>.
                </>
              )}
            </h1>
            <div className="ef-sub">
              {filed
                ? `${entityName} is recognized under Wyoming law as a Decentralized Autonomous Organization LLC. Compliance reminders are tracked from your dashboard.`
                : `Wyoming statute W.S. 17-31 recognizes DAOs as a distinct LLC class. This filing binds ${activeDao?.name || "your org"}'s on-chain governance to a real legal entity.`}
            </div>
            {!filed && (
              <div className="ef-progress">
                <span>
                  Step {stepIdx} of {EF_STEPS.length - 1}
                </span>
                <div className="ef-progress-track">
                  <div
                    className="ef-progress-fill"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="mono">{progress}%</span>
              </div>
            )}
          </div>
          <div className="ef-hero-stats">
            <div className="ef-stat">
              <div className="ef-stat-k">Jurisdiction</div>
              <div className="ef-stat-v">Wyoming, USA</div>
            </div>
            <div className="ef-stat">
              <div className="ef-stat-k">Statute</div>
              <div className="ef-stat-v mono">W.S. 17-31</div>
            </div>
            <div className="ef-stat">
              <div className="ef-stat-k">Filing fee</div>
              <div className="ef-stat-v">$100 state</div>
            </div>
            <div className="ef-stat">
              <div className="ef-stat-k">Annual report</div>
              <div className="ef-stat-v">$60/yr</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
