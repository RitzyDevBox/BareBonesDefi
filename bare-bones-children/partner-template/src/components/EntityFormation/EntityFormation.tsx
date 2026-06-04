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
import { ChevronLeft, ChevronRight } from "./Icons";
import {
  StepAgent,
  StepAgreement,
  StepBasics,
  StepDocuments,
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
  /** Active org slug from the navbar (useActiveOrganization). Filing is
   *  always org-scoped — the wizard refuses to render without one. */
  orgSlug?: string | null;
  /** Resolution state of payrollManager.daoOf(orgSlug):
   *    idle      — no org selected yet, not fetched
   *    resolving — RPC call in flight
   *    missing   — call returned 0x0 / threw — org has no Governor
   *    resolved  — Governor address available on activeDao.governor.address
   *  Used to distinguish "still loading the DAO context" from "this org
   *  doesn't have a DAO, deploy one first" — both used to collapse into a
   *  silent stuck-loader.
   */
  governorStatus?: "idle" | "resolving" | "missing" | "resolved";
  /** Result of the MTA role lookup that gates wizard visibility (filing
   *  collects PII so only SuperAdmin / Admin can view it). Same shape as
   *  governorStatus — "idle" / "checking" / "allowed" / "denied". */
  viewStatus?: "idle" | "checking" | "allowed" | "denied";
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
  // Smart-contract bind happens implicitly at the eligibility step now —
  // the contract step was removed; eligibility persists daoAddress +
  // chainId on Continue. Route missing-field redirects there.
  daoAddress: "eligibility",
  chainId: "eligibility",
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
  governorStatus = "idle",
  viewStatus = "idle",
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

  // Ref to the wizard card column. On step change we keep the card in view
  // instead of yanking the page to the top (which re-revealed the hero on
  // every Continue). `block: "nearest"` only scrolls if the card top has
  // drifted out of the viewport, so a focused card stays put.
  const cardRef = useRef<HTMLDivElement | null>(null);
  const goStep = (id: StepId) => {
    const next = new URLSearchParams(params);
    next.set("step", id);
    setParams(next, { replace: true });
    cardRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  const stepIdx = EF_STEPS.findIndex((s) => s.id === step);

  // Step-nav scroller. On mobile the step list is a horizontal scroller;
  // when the user advances (Continue) we auto-center the new active chip.
  // The arrow buttons just do a fixed smooth nudge per click — earlier
  // hold-to-scroll RAF fought the smooth animation and made taps jump.
  const stepListRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const list = stepListRef.current;
    if (!list) return;
    const active = list.querySelector<HTMLElement>(".ef-step.active");
    if (!active) return;
    // `block: "nearest"` keeps the page-scroll position; `inline: "center"`
    // pulls the chip into the visible middle of the horizontal scroller.
    active.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [stepIdx]);
  const nudgeStepList = (dir: -1 | 1) => {
    const list = stepListRef.current;
    if (!list) return;
    list.scrollBy({ left: dir * 140, behavior: "smooth" });
  };
  const nextStep = () =>
    goStep(EF_STEPS[Math.min(stepIdx + 1, EF_STEPS.length - 1)].id);
  const prevStep = () => goStep(EF_STEPS[Math.max(stepIdx - 1, 0)].id);

  // Prefer the on-chain org slug (the canonical name the org was launched
  // with) over `activeDao.name`, which can resolve to "Untitled" for orgs
  // whose Governor name field is unset or wasn't read off-chain yet. The
  // slug is the launcher's `cfg.name` arg packed into bytes32 and is
  // always set for any launched org.
  const defaultName = useMemo(
    () => `${orgSlug || activeDao?.name || "Acme"} DAO LLC`,
    [orgSlug, activeDao?.name],
  );
  const defaultContract = useMemo(
    () => activeDao?.governor?.address ?? "",
    [activeDao?.governor?.address],
  );

  // Local form state. Hydrated once from the server detail when it lands
  // (see hydration effect below); after that the user owns it. PII lives
  // here in React state only — never written to localStorage.
  const [name, setName] = useState(defaultName);
  // Algorithmic management is the recommended default for DAO LLCs — the
  // whole point of forming under W.S. § 17-31 (the DAO Supplement) vs.
  // the plain LLC chapter is to elect algorithmic management. The
  // `member` option remains available for hybrid models where humans
  // retain residual authority, but it's not the default a new wizard
  // session lands on.
  const [mgmt, setMgmt] = useState<ManagementType>("algo");
  const [contractAddr, setContractAddr] = useState(defaultContract);
  const [org, setOrg] = useState<OrganizerOrg>(makeEmptyOrg);
  const [mailingSame, setMailingSame] = useState(true);
  const [mailing, setMailing] = useState<OrganizerMailing>(makeEmptyMailing);
  const [filer, setFiler] = useState<OrganizerFiler>(makeEmptyFiler);
  const [filerSame, setFilerSame] = useState(false);
  const [agentMode, setAgentMode] = useState<AgentMode>("service");
  const [agentId, setAgentId] = useState(REGISTERED_AGENTS[0]?.id ?? "");
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
  // Documents step — both flags live in React state only (no DB persistence).
  // V2 will replace this with a wallet-signed attestation that needs a
  // different shape on the server side. Reset on draft switch (see
  // hydration effect below).
  const [hasDownloaded, setHasDownloaded] = useState(false);
  const [documentsAcked, setDocumentsAcked] = useState(false);

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

  // Hydrate the form once per server-resolved draft (after refresh, after
  // sign-in, or after the user switches DAOs in the navbar). Guarded by a
  // per-draft id ref so we don't overwrite local edits on every detail
  // re-render. PII stays in React state only.
  //
  // CRITICAL: when the draft id CHANGES (e.g. user creates a new DAO from
  // a different org and the wizard rescopes), we must RESET form state to
  // defaults before applying server-derived values. Hydration only fires
  // a `setX(server.x)` when the server field is populated — so a fresh
  // draft with empty fields would leave the OLD draft's values in place
  // (bug: switching DAOs while on Review showed the previous entity's
  // name / address / filer / RA in the new entity's review pane). Reset
  // first, then layer the new draft's data on top.
  const hydratedForRef = useRef<string | null>(null);
  useEffect(() => {
    const d = draft.detail;
    if (!d || hydratedForRef.current === d.id) return;
    hydratedForRef.current = d.id;

    // Reset every form-state cell back to its useState default so stale
    // values from a prior draft don't leak through the hydration's
    // conditional setters below.
    setName(defaultName);
    setMgmt("algo");
    setContractAddr(defaultContract);
    setOrg(makeEmptyOrg());
    setMailingSame(true);
    setMailing(makeEmptyMailing());
    setFiler(makeEmptyFiler());
    setFilerSame(false);
    setAgentMode("service");
    setAgentId(REGISTERED_AGENTS[0]?.id ?? "");
    setAgentCustom({ name: "", street: "", city: "Cheyenne", zip: "82001" });
    setAgreementSrc("generate");
    setAgreementStorage("arweave");
    setNotice(false);
    // Documents-step gates: a filed entity (status != DRAFT) provably passed
    // the submit gate at StepDocuments, which requires BOTH hasDownloaded
    // AND documentsAcked — so default both to true for filed drafts. Without
    // this, navigating back to a submitted entity shows the doc step as
    // un-downloaded / un-acked even though the filing already happened.
    const alreadyFiled = !!(d.status && d.status !== "DRAFT");
    setHasDownloaded(alreadyFiled);
    setDocumentsAcked(alreadyFiled);
    // Reset wizard navigation too — if the user had advanced into a later
    // step on the previous draft (e.g. they were on Review when they
    // created a new DAO from the header), don't leave them stranded on a
    // step they haven't filled in for the new entity. Send them back to
    // eligibility so the new flow starts at step 1.
    goStep("eligibility");

    // Skip the server's legacy placeholder ("Untitled DAO LLC") so older
    // drafts that were minted before the slug-derived default landed get the
    // nicer "<Slug> DAO LLC" string from `defaultName` instead of stickily
    // showing the placeholder. User-typed names always survive.
    if (d.legalName && d.legalName !== "Untitled DAO LLC") setName(d.legalName);
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

  // Every step's Continue button shares the same shape: optionally run a
  // server save, then advance to the next step. When the formation is
  // locked (status != DRAFT) the save is skipped — the server would 409
  // (`requireDraft`) anyway, and view-only mode means there's nothing
  // meaningful to persist — but the user still gets to page forward.
  // A save error keeps the user on the current step; `draft.error`
  // already surfaces the message.
  const advanceStep = async (save: () => Promise<unknown>) => {
    if (!filed) {
      try {
        await save();
      } catch {
        return; // stay on step; error surfaced via draft.error
      }
    }
    nextStep();
  };

  const handleBasicsNext = () =>
    advanceStep(() =>
      draft.saveBasics({
        legalName: name,
        managementType: mgmt === "member" ? "MEMBER" : "ALGORITHMIC",
      }),
    );

  const handleOrganizerNext = () =>
    advanceStep(() => {
      const businessPhone = phoneToE164(org.phoneDial, org.phoneNum);
      const filerPhone = filerSame
        ? businessPhone
        : phoneToE164(filer.phoneDial, filer.phoneNum);
      return draft.saveOrganizer({
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
    });

  // Eligibility step's Continue persists the smart-contract bind that
  // used to be a dedicated step. The contract addr + chainId come from
  // the connected DAO + selected chain (already shown read-only in the
  // eligibility checks), so there's no separate input to validate — if
  // eligibility passes, the bind is valid by construction.
  const handleEligibilityNext = () =>
    advanceStep(() =>
      draft.saveContract({
        daoAddress: contractAddr || null,
        chainId: chain?.chainId ?? null,
      }),
    );

  const handleAgentNext = () =>
    advanceStep(() => {
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
      return draft.saveAgent(payload);
    });

  const handleAgreementNext = () =>
    advanceStep(() =>
      draft.saveAgreement({
        agreementSource: agreementSrc === "generate" ? "GENERATE" : "UPLOAD",
        agreementStorage:
          agreementStorage === "off"
            ? "OFF"
            : agreementStorage === "arweave"
              ? "ARWEAVE"
              : "ONCHAIN",
      }),
    );

  const handleNoticeNext = () => advanceStep(() => draft.ackNotice());

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
    // Block submit until the user has downloaded the formation documents
    // and ticked the review-ack box on the Documents step. The Review-step
    // File button already disables on this — this is a defence-in-depth
    // check (e.g., callers wiring this handler to a future shortcut).
    if (!hasDownloaded || !documentsAcked) {
      goStep("documents");
      toastStore.show({
        id: `documents-required-${Date.now()}`,
        title: "Review the documents first",
        message:
          "Download the Articles + Operating Agreement and confirm you've reviewed them before filing.",
        type: ToastType.Warn,
        behavior: ToastBehavior.AutoClose,
        durationMs: 5000,
        position: ToastPosition.Top,
      });
      return;
    }
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
              {activeDao?.name || "this entity"}. Connect the wallet you want
              to file with.
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

  // Filing is always org-scoped. Without an active org from the navbar we
  // can't deterministically locate (or mint) the formation row, and we
  // certainly can't bake in a Governor address.
  if (!orgSlug) {
    return (
      <div className="entity-formation-root">
        <Hero activeDao={activeDao} chain={chain} progress={0} stepIdx={0} />
        <ShellNotice
          kicker="Organization required"
          title="Pick an organization to file for"
          lede="Wyoming filing is tied to a specific on-chain DAO. Select the organization from the navbar, then return here."
        />
      </div>
    );
  }

  // PII gate. The wizard collects legal names, residential / business
  // addresses, phone numbers, and business emails — restrict to operational
  // owners (SuperAdmin / Admin via MTA, computed by the page). Roleless
  // members and non-filing operators see a permission notice instead.
  if (viewStatus === "checking" || viewStatus === "idle") {
    return (
      <div className="entity-formation-root">
        <Hero activeDao={activeDao} chain={chain} progress={0} stepIdx={0} />
        <ShellNotice
          kicker="Checking access"
          title="Verifying your role…"
          lede="Confirming your filing permissions for this organization."
        />
      </div>
    );
  }
  if (viewStatus === "denied") {
    return (
      <div className="entity-formation-root">
        <Hero activeDao={activeDao} chain={chain} progress={0} stepIdx={0} />
        <ShellNotice
          kicker="Permission required"
          title="You don't have access to file for this organization"
          lede="Filing collects personally identifiable information for the organizers. Only members with the SuperAdmin or Admin role can view or submit this form. Ask the org's admin to grant you access, or switch to an organization you're an admin of."
        />
      </div>
    );
  }

  // Org is selected but the Governor lookup is still in flight. Surfaced
  // explicitly so the user doesn't see a silent "Fetching your draft…"
  // while no API request is actually being made yet.
  if (governorStatus === "idle" || governorStatus === "resolving") {
    return (
      <div className="entity-formation-root">
        <Hero activeDao={activeDao} chain={chain} progress={0} stepIdx={0} />
        <ShellNotice
          kicker="Loading"
          title="Resolving your DAO…"
          lede="Looking up the Governor for this organization."
        />
      </div>
    );
  }

  // Org has no Governor registered (or the RPC lookup failed). The wizard
  // can't proceed — direct the user to deploy a DAO first.
  if (governorStatus === "missing") {
    return (
      <div className="entity-formation-root">
        <Hero activeDao={activeDao} chain={chain} progress={0} stepIdx={0} />
        <ShellNotice
          kicker="No DAO detected"
          title="This organization doesn't have a Governor yet"
          lede="Filing requires a deployed DAO Governor + Timelock. Deploy a DAO for this organization, then return here."
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
            <div className="ef-stepnav-row">
              <button
                type="button"
                className="ef-stepnav-arrow"
                aria-label="Scroll steps left"
                onClick={() => nudgeStepList(-1)}
              >
                <ChevronLeft size={18} stroke={2.25} />
              </button>
              <div className="ef-stepnav-list" ref={stepListRef}>
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
              <button
                type="button"
                className="ef-stepnav-arrow"
                aria-label="Scroll steps right"
                onClick={() => nudgeStepList(1)}
              >
                <ChevronRight size={18} stroke={2.25} />
              </button>
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

          <div ref={cardRef}>
            {filed && (
              <div className="ef-locked-banner">
                <strong>This formation is locked.</strong>{" "}
                Status is{" "}
                <code>{draft.detail?.status?.toLowerCase() ?? "submitted"}</code>{" "}
                — fields are visible but cannot be edited. Use the step nav to
                review your entries; download the stamped Articles from the
                Review step.
              </div>
            )}
            {/*
              When the formation is locked (status != DRAFT) the wrapping
              div gets `data-ef-locked="true"`. CSS in entity-formation.css
              uses that attribute to disable form-control interactivity
              (inputs, selects, tile pickers) without touching the
              `.ef-card-foot` Continue/Back buttons — so users can still
              page through the wizard to view their data, and Continue
              just navigates forward without calling save (each
              `handle*Next` short-circuits when `filed` is true).
            */}
            <div
              data-testid="formation-wrapper"
              data-ef-locked={filed ? "true" : undefined}
            >
            {step === "eligibility" && (
              <StepEligibility
                activeDao={activeDao}
                chain={chain}
                wallet={wallet}
                onNext={handleEligibilityNext}
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
                governance={activeDao?.governance}
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
            {step === "documents" && (
              <StepDocuments
                entityId={draft.detail?.id}
                hasDownloaded={hasDownloaded}
                setHasDownloaded={setHasDownloaded}
                acked={documentsAcked}
                setAcked={setDocumentsAcked}
                onPrev={prevStep}
                onNext={nextStep}
                onEdit={goStep}
              />
            )}
            {step === "review" && (
              <StepReview
                entityId={draft.detail?.id}
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
                documentsReady={hasDownloaded && documentsAcked}
                onPrev={prevStep}
                onEdit={goStep}
                onFile={handleFile}
              />
            )}
            </div>
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
