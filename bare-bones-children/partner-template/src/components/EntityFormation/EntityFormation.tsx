import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useApiAuthContext } from "../../hooks/providers/ApiAuthContext";
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
  EF_DIAL_CODES,
  EF_STEPS,
  FormationChain,
  FormationDao,
  FormationWallet,
  ManagementType,
  OrganizerFiler,
  OrganizerMailing,
  OrganizerOrg,
  StepId,
  makeEmptyFiler,
  makeEmptyMailing,
  makeEmptyOrg,
} from "./types";
import { useFormationDraft } from "./useFormationDraft";
import "./entity-formation.css";

interface EntityFormationProps {
  activeDao?: FormationDao;
  chain?: FormationChain;
  wallet?: FormationWallet;
  /** Active org slug from the navbar (useActiveOrganization). When present
   *  the wizard operates on a per-DAO entity shared across all admins of
   *  that org; when absent it falls back to per-user DAO-decoupled mode. */
  orgSlug?: string | null;
  onConnectWallet?: () => void;
}

function isStepId(s: string | null): s is StepId {
  return !!s && EF_STEPS.some((step) => step.id === s);
}

// Backend's `incomplete_draft` returns field-level missing names. Map each
// to the step that collects it, so the wizard can jump the user to the
// first incomplete step on a submit failure.
const MISSING_TO_STEP: Record<string, StepId> = {
  legalName: "basics",
  managementType: "basics",
  daoAddress: "contract",
  chainId: "contract",
  businessEmail: "organizer",
  filerFirstName: "organizer",
  filerLastName: "organizer",
  filerRoleClaim: "organizer",
  principalOffice: "organizer",
  agentMode: "agent",
  agentServiceKey: "agent",
  agentCustom: "agent",
  agreementSource: "agreement",
  agreementStorage: "agreement",
  noticeAckedAt: "notice",
};

export function EntityFormation({
  activeDao,
  chain,
  wallet,
  orgSlug,
  onConnectWallet,
}: EntityFormationProps) {
  const { isSignedIn, signIn, loading: authLoading, error: authError } =
    useApiAuthContext();
  // Pass the navbar's org context + the resolved governor address through to
  // the draft hook. When orgSlug is set, the hook scopes find-or-create by
  // (orgSlug, chainId) and re-fetches on org switches. When the user
  // navigates between DAOs in the navbar, the wizard reloads against the
  // right entity instead of editing the previous DAO's draft.
  const draft = useFormationDraft({
    orgSlug,
    chainId: chain?.chainId,
    daoAddress: activeDao?.governor?.address,
  });

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
    () => activeDao?.governor?.address ?? "",
    [activeDao?.governor?.address],
  );

  // Local form state. Hydrated once from the server detail when it lands
  // (see hydration effect below); after that the user owns it. PII lives
  // here in React state only — never written to localStorage.
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
  const [agreementStorage, setAgreementStorage] =
    useState<AgreementStorage>("arweave");
  const [notice, setNotice] = useState(false);

  // Pre-fill from activeDao when it arrives async, but only if local state
  // is still at its pre-load stub (don't wipe user input).
  useEffect(() => {
    if (activeDao?.name && name === "Acme DAO LLC") {
      setName(`${activeDao.name} DAO LLC`);
    }
  }, [activeDao?.name, name]);
  // Pre-fill the contract address once the parent resolves the governor
  // (subgraph / RPC lookup is async). Only fires while the field is still
  // empty — never clobbers a hydrated draft value or user input.
  useEffect(() => {
    if (activeDao?.governor?.address && contractAddr === "") {
      setContractAddr(activeDao.governor.address);
    }
  }, [activeDao?.governor?.address, contractAddr]);

  // Hydrate the form once from the server's detail (after refresh, after
  // sign-in). Guarded by a per-draft id ref so we don't overwrite local
  // edits on every detail re-render. PII stays in React state only.
  const hydratedForRef = useRef<string | null>(null);
  useEffect(() => {
    const d = draft.detail;
    if (!d || hydratedForRef.current === d.id) return;
    hydratedForRef.current = d.id;

    if (d.legalName) setName(d.legalName);
    if (d.managementType) setMgmt(d.managementType === "MEMBER" ? "member" : "algo");
    if (d.daoAddress) setContractAddr(d.daoAddress);

    // Phone split: stored as E.164 (+15551234567) + ISO country (US). Look
    // up the dial code from EF_DIAL_CODES and strip it off the front.
    const splitPhone = (e164: string | null, country: string | null) => {
      if (!e164 || !country) return null;
      const match = EF_DIAL_CODES.find((c) => c.iso === country);
      if (!match) return null;
      const num = e164.startsWith(match.code) ? e164.slice(match.code.length) : e164;
      return { phoneDial: match.code, phoneIso: match.iso, phoneNum: num };
    };
    const principal = d.addresses.find((a) => a.type === "PRINCIPAL_OFFICE");
    const mailingAddr = d.addresses.find((a) => a.type === "MAILING");
    const bizPhone = splitPhone(d.businessPhoneE164, d.businessPhoneCountry);
    if (principal || d.businessEmail || bizPhone) {
      setOrg((prev) => ({
        ...prev,
        street1: principal?.street1 ?? prev.street1,
        street2: principal?.street2 ?? prev.street2,
        city: principal?.city ?? prev.city,
        region: principal?.state ?? prev.region,
        postal: principal?.postalCode ?? prev.postal,
        country: principal?.country ?? prev.country,
        email: d.businessEmail ?? prev.email,
        phoneDial: bizPhone?.phoneDial ?? prev.phoneDial,
        phoneIso: bizPhone?.phoneIso ?? prev.phoneIso,
        phoneNum: bizPhone?.phoneNum ?? prev.phoneNum,
      }));
    }
    if (mailingAddr) {
      setMailingSame(false);
      setMailing({
        street1: mailingAddr.street1,
        street2: mailingAddr.street2 ?? "",
        city: mailingAddr.city,
        region: mailingAddr.state,
        postal: mailingAddr.postalCode,
        country: mailingAddr.country,
      });
    }
    if (d.filerFirstName || d.filerLastName) {
      setFiler((prev) => ({
        ...prev,
        first: d.filerFirstName ?? prev.first,
        last: d.filerLastName ?? prev.last,
        role: (d.filerRoleClaim as OrganizerFiler["role"]) ?? prev.role,
      }));
    }
    setFilerSame(d.filerSameAsBusinessContact);
    if (d.agentMode === "SERVICE" && d.agentServiceKey) {
      setAgentMode("service");
      setAgentId(d.agentServiceKey);
    } else if (d.agentMode === "OWN") {
      setAgentMode("own");
      setAgentCustom({
        name: d.agentCustomName ?? "",
        street: d.agentCustomStreet ?? "",
        city: d.agentCustomCity ?? "",
        zip: d.agentCustomZip ?? "",
      });
    }
    if (d.agreementSource) {
      setAgreementSrc(d.agreementSource === "GENERATE" ? "generate" : "upload");
    }
    if (d.agreementStorage) {
      setAgreementStorage(
        d.agreementStorage === "OFF"
          ? "off"
          : d.agreementStorage === "ARWEAVE"
            ? "arweave"
            : "chain",
      );
    }
    if (d.completedSteps.notice) setNotice(true);
  }, [draft.detail]);

  const filed = draft.detail?.status && draft.detail.status !== "DRAFT";
  const progress = Math.round((stepIdx / (EF_STEPS.length - 1)) * 100);

  const agent = REGISTERED_AGENTS.find((a) => a.id === agentId);

  // ----- step-save handlers (wrap onNext with server save) -----

  const phoneToE164 = (dial: string, num: string) =>
    num ? `${dial}${num.replace(/\D+/g, "")}` : "";

  const handleBasicsNext = async () => {
    try {
      await draft.saveBasics({
        legalName: name,
        managementType: mgmt === "member" ? "MEMBER" : "ALGORITHMIC",
      });
      nextStep();
    } catch {
      /* error already in draft.error; stay on step */
    }
  };

  const handleOrganizerNext = async () => {
    try {
      const businessPhone = phoneToE164(org.phoneDial, org.phoneNum);
      const filerPhone = filerSame
        ? businessPhone
        : phoneToE164(filer.phoneDial, filer.phoneNum);
      await draft.saveOrganizer({
        businessEmail: org.email || null,
        businessPhoneE164: businessPhone || null,
        businessPhoneCountry: org.phoneIso || null,
        filer: {
          firstName: filer.first,
          lastName: filer.last,
          roleClaim: filer.role,
          email: (filerSame ? org.email : filer.email) || null,
          phoneE164: filerPhone || null,
          phoneCountry: (filerSame ? org.phoneIso : filer.phoneIso) || null,
        },
        filerSameAsBusinessContact: filerSame,
        principalOffice: {
          street1: org.street1,
          street2: org.street2 || null,
          city: org.city,
          state: org.region,
          postalCode: org.postal,
          country: org.country,
        },
        mailing: mailingSame
          ? null
          : {
              street1: mailing.street1,
              street2: mailing.street2 || null,
              city: mailing.city,
              state: mailing.region,
              postalCode: mailing.postal,
              country: mailing.country,
            },
      });
      nextStep();
    } catch {
      /* stay */
    }
  };

  const handleContractNext = async () => {
    try {
      await draft.saveContract({
        daoAddress: contractAddr || null,
        chainId: chain?.chainId ?? null,
      });
      nextStep();
    } catch {
      /* stay */
    }
  };

  const handleAgentNext = async () => {
    try {
      const payload =
        agentMode === "service"
          ? { agentMode: "SERVICE" as const, agentServiceKey: agentId }
          : {
              agentMode: "OWN" as const,
              agentCustomName: agentCustom.name,
              agentCustomStreet: agentCustom.street,
              agentCustomCity: agentCustom.city,
              agentCustomZip: agentCustom.zip,
            };
      await draft.saveAgent(payload);
      nextStep();
    } catch {
      /* stay */
    }
  };

  const handleAgreementNext = async () => {
    try {
      await draft.saveAgreement({
        agreementSource: agreementSrc === "generate" ? "GENERATE" : "UPLOAD",
        agreementStorage:
          agreementStorage === "off"
            ? "OFF"
            : agreementStorage === "arweave"
              ? "ARWEAVE"
              : "ONCHAIN",
      });
      nextStep();
    } catch {
      /* stay */
    }
  };

  const handleNoticeNext = async () => {
    try {
      await draft.ackNotice();
      nextStep();
    } catch {
      /* stay */
    }
  };

  // Wraps the Agreement-step file picker. Uploads immediately as
  // OPERATING_AGREEMENT — bytes go to the server right away (no local
  // caching of PII-adjacent material) and the resulting doc joins the
  // entity's document list.
  const handleAgreementUpload = async (file: File) => {
    try {
      const doc = await draft.uploadDocument(file, "OPERATING_AGREEMENT");
      toastStore.show({
        id: `doc-uploaded-${doc.id}`,
        title: "Document uploaded",
        message: `${file.name} (${Math.round(doc.sizeBytes / 1024)} KB)`,
        type: ToastType.Success,
        behavior: ToastBehavior.AutoClose,
        durationMs: 4000,
        position: ToastPosition.Top,
      });
    } catch {
      /* error captured by hook; surfaced inline */
    }
  };

  const handleFile = async () => {
    const outcome = await draft.submit();
    if (outcome.ok) {
      toastStore.show({
        id: `formation-filed-${Date.now()}`,
        title: "Filing submitted",
        message: "Articles sent to Wyoming SOS. Filing ID arrives in 1–2 days.",
        type: ToastType.Success,
        behavior: ToastBehavior.AutoClose,
        durationMs: 5000,
        position: ToastPosition.Top,
      });
      return;
    }
    // Jump to first incomplete step.
    const firstMissing = outcome.missing[0];
    const target = firstMissing ? MISSING_TO_STEP[firstMissing] : null;
    if (target) goStep(target);
    toastStore.show({
      id: `incomplete-${Date.now()}`,
      title: "Some steps are incomplete",
      message: `Missing: ${outcome.missing.join(", ")}`,
      type: ToastType.Warn,
      behavior: ToastBehavior.AutoClose,
      durationMs: 6000,
      position: ToastPosition.Top,
    });
  };

  // ----- render gates -----

  if (!wallet) {
    return (
      <div className="entity-formation-root">
        <Hero activeDao={activeDao} chain={chain} progress={0} stepIdx={0} />
        <ShellNotice
          kicker="Wallet required"
          title="Connect a wallet to file"
          lede={
            <>
              Filing signs a record on behalf of{" "}
              {activeDao?.name || "this entity"}. Connect a wallet with
              WY_FILING_ROLE or Super Admin.
            </>
          }
          action={
            onConnectWallet ? (
              <button
                type="button"
                className="btn-primary"
                onClick={onConnectWallet}
              >
                Connect wallet
              </button>
            ) : null
          }
        />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="entity-formation-root">
        <Hero activeDao={activeDao} chain={chain} progress={0} stepIdx={0} />
        <ShellNotice
          kicker="Sign in required"
          title="Sign in with your wallet to save"
          lede={
            <>
              Drafts are stored server-side under your wallet identity. Sign a
              one-time SIWE message so the API can persist your formation
              progress.
            </>
          }
          action={
            <>
              <button
                type="button"
                className="btn-primary"
                onClick={() => void signIn()}
                disabled={authLoading}
              >
                {authLoading ? "Signing…" : "Sign in with Ethereum"}
              </button>
              {authError && (
                <div
                  className="field-err"
                  style={{ marginTop: 10 }}
                >{`Sign-in failed: ${authError}`}</div>
              )}
            </>
          }
        />
      </div>
    );
  }

  if (draft.loading) {
    return (
      <div className="entity-formation-root">
        <Hero activeDao={activeDao} chain={chain} progress={0} stepIdx={0} />
        <ShellNotice
          kicker="Loading"
          title="Fetching your draft…"
          lede="One moment."
        />
      </div>
    );
  }

  if (draft.error && !draft.detail) {
    return (
      <div className="entity-formation-root">
        <Hero activeDao={activeDao} chain={chain} progress={0} stepIdx={0} />
        <ShellNotice
          kicker="Error"
          title="Could not load your draft"
          lede={`Server returned: ${draft.error}. Refresh the page to retry.`}
        />
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
        filed={!!filed}
        entityName={name}
      />

      <section className="container">
        <div className="ef-shell">
          <nav className="ef-stepnav" aria-label="Formation steps">
            <div className="ef-stepnav-head">Filing progress</div>
            <div className="ef-stepnav-list">
              {EF_STEPS.map((s, i) => {
                const completion = draft.detail?.completedSteps;
                const doneBackend =
                  s.id !== "eligibility" &&
                  s.id !== "review" &&
                  completion?.[s.id as keyof typeof completion];
                const active = i === stepIdx && !filed;
                const cls = filed
                  ? "done"
                  : active
                    ? "active"
                    : doneBackend
                      ? "done"
                      : i < stepIdx
                        ? "done"
                        : "";
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={`ef-step ${cls}`}
                    onClick={() => goStep(s.id)}
                  >
                    <span className="ef-step-dot">
                      {filed || doneBackend ? (
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
            {draft.saving && (
              <div
                className="crumb"
                style={{ marginTop: 14, color: "var(--accent)" }}
              >
                Saving…
              </div>
            )}
            {draft.error && (
              <div className="field-err" style={{ marginTop: 10 }}>
                {`Save failed: ${draft.error}`}
              </div>
            )}
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
                onNext={handleBasicsNext}
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
                onNext={handleOrganizerNext}
              />
            )}
            {step === "contract" && (
              <StepContract
                activeDao={activeDao}
                chain={chain}
                contractAddr={contractAddr}
                setContractAddr={setContractAddr}
                locked={!!draft.detail?.orgSlug}
                onPrev={prevStep}
                onNext={handleContractNext}
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
                onNext={handleAgentNext}
              />
            )}
            {step === "agreement" && (
              <StepAgreement
                src={agreementSrc}
                setSrc={setAgreementSrc}
                storage={agreementStorage}
                setStorage={setAgreementStorage}
                onUpload={handleAgreementUpload}
                uploadedDocName={
                  draft.documents.find((d) => d.type === "OPERATING_AGREEMENT")?.uri
                }
                onPrev={prevStep}
                onNext={handleAgreementNext}
              />
            )}
            {step === "notice" && (
              <StepNotice
                activeDao={activeDao}
                notice={notice}
                setNotice={setNotice}
                onPrev={prevStep}
                onNext={handleNoticeNext}
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
                filed={!!filed}
                setFiled={() => {
                  /* server is the source of truth — no local toggle */
                }}
                onPrev={prevStep}
                onEdit={goStep}
                onFile={handleFile}
              />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

interface ShellNoticeProps {
  kicker: string;
  title: string;
  lede: React.ReactNode;
  action?: React.ReactNode;
}

function ShellNotice({ kicker, title, lede, action }: ShellNoticeProps) {
  return (
    <section className="container">
      <div style={{ padding: "40px 0 80px" }}>
        <div className="ef-card">
          <div className="ef-card-head">
            <div>
              <div className="ef-card-kicker">{kicker}</div>
              <h3 className="ef-card-title">{title}</h3>
              <p className="ef-card-lede">{lede}</p>
            </div>
          </div>
          {action && <div className="ef-card-body">{action}</div>}
        </div>
      </div>
    </section>
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
