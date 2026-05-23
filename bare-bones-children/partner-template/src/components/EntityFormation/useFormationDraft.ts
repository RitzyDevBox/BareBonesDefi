import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../api/client";
import type {
  ApiAgentInput,
  ApiAgreementInput,
  ApiBasicsInput,
  ApiContractInput,
  ApiDocument,
  ApiDocumentType,
  ApiEntityFull,
  ApiEntitySummary,
  ApiOrganizerInput,
} from "../../api/types";
import { ApiError } from "../../api/types";
import { useApiAuthContext } from "../../hooks/providers/ApiAuthContext";

export type SubmitOutcome =
  | { ok: true; summary: ApiEntitySummary }
  | { ok: false; missing: string[] };

export interface FormationDraftState {
  /** Full draft (incl. PII for prefill) for the user's single in-flight
   *  formation. PII lives only in React state — never in localStorage. */
  detail: ApiEntityFull | null;
  documents: ApiDocument[];
  loading: boolean;
  error: string | null;
  saving: boolean;
  // ----- step saves -----
  saveBasics: (data: ApiBasicsInput) => Promise<void>;
  saveOrganizer: (data: ApiOrganizerInput) => Promise<void>;
  saveContract: (data: ApiContractInput) => Promise<void>;
  saveAgent: (data: ApiAgentInput) => Promise<void>;
  saveAgreement: (data: ApiAgreementInput) => Promise<void>;
  ackNotice: () => Promise<void>;
  submit: () => Promise<SubmitOutcome>;
  uploadDocument: (file: File, type: ApiDocumentType) => Promise<ApiDocument>;
}

export interface FormationDraftInput {
  /** Active org slug from the navbar (useActiveOrganization). Present →
   *  org-scoped formation shared across all admins of the DAO. Absent →
   *  per-user DAO-decoupled formation. */
  orgSlug?: string | null;
  /** Chain id the org lives on. Required when orgSlug is set so the
   *  (orgSlug, chainId) lookup key is well-defined. */
  chainId?: number | null;
  /** Governor address resolved from the org (payrollManager.daoOf). Locked
   *  into the entity at creation time; ignored if the entity already exists.
   *  When orgSlug is set we wait for this to resolve before firing
   *  find-or-create so a brand-new entity doesn't get persisted with
   *  daoAddress=null. */
  daoAddress?: string | null;
}

// Owns the active formation entity for the current org context (or the
// user's single DRAFT when no org is set). On mount / org change:
// find-or-create + load documents. Step saves POST partial bundles; the
// response is a PII-scrubbed summary merged over the existing detail so
// completion flags + public fields stay fresh without overwriting PII
// the user just typed.
export function useFormationDraft(
  input: FormationDraftInput = {},
): FormationDraftState {
  const { orgSlug, chainId, daoAddress } = input;
  const { isSignedIn } = useApiAuthContext();
  const [detail, setDetail] = useState<ApiEntityFull | null>(null);
  const [documents, setDocuments] = useState<ApiDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // "Load key" controls when we re-fire findOrCreate. Changes when the
  // auth state flips OR when the org context the wizard is operating in
  // changes (user switches DAO via the navbar). For org-scoped loads we
  // also wait for daoAddress — without it a freshly-minted entity would
  // be persisted with daoAddress=null, requiring a follow-up update.
  // Returns null while we're not ready to load (signed out / waiting for
  // org context to resolve).
  const loadKey = useMemo(() => {
    if (!isSignedIn) return null;
    if (orgSlug) {
      if (chainId == null || !daoAddress) return null;
      return `org:${orgSlug}:${chainId}`;
    }
    return "decoupled";
  }, [isSignedIn, orgSlug, chainId, daoAddress]);

  // Per-key load guard. Tracks the loadKey we're currently fetching for.
  // Three guarantees:
  //   1. StrictMode double-mount in dev — second run sees the same key
  //      already in progress and early-returns.
  //   2. Org-switch staleness — if loadKey changes mid-fetch, the in-flight
  //      response is dropped via the ref-mismatch check inside the async.
  //   3. setLoading(false) only runs for the still-current key, so a
  //      cancelled fetch doesn't accidentally clear loading state owned by
  //      a newer fetch.
  const loadingForKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (loadKey == null) {
      loadingForKeyRef.current = null;
      setLoading(!!orgSlug && (chainId == null || !daoAddress));
      setDetail(null);
      setDocuments([]);
      return;
    }
    if (loadingForKeyRef.current === loadKey) return;
    loadingForKeyRef.current = loadKey;

    setLoading(true);
    setError(null);
    // Clear stale data so the wizard renders the loading state, not the
    // previously-loaded org's content.
    setDetail(null);
    setDocuments([]);

    (async () => {
      try {
        const draft = await api.entities.findOrCreate({
          orgSlug: orgSlug ?? null,
          chainId: chainId ?? null,
          daoAddress: daoAddress ?? null,
        });
        if (loadingForKeyRef.current !== loadKey) return;
        setDetail(draft);
        const docs = await api.documents.list(draft.id);
        if (loadingForKeyRef.current !== loadKey) return;
        setDocuments(docs);
      } catch (err) {
        if (loadingForKeyRef.current !== loadKey) return;
        setError(err instanceof ApiError ? err.code : "draft_load_failed");
      } finally {
        if (loadingForKeyRef.current === loadKey) setLoading(false);
      }
    })();
  }, [loadKey, orgSlug, chainId, daoAddress]);

  // Merge the summary returned by a step POST onto the existing detail —
  // keep the locally-known PII the user just sent (server doesn't echo it
  // back) while picking up new completion flags + any normalized fields.
  const mergeSummary = (s: ApiEntitySummary) =>
    setDetail((prev) => (prev ? { ...prev, ...s } : null));

  const withSave = useCallback(
    async <T,>(
      fn: (entityId: string) => Promise<T>,
      onResult?: (result: T) => void,
    ): Promise<T> => {
      if (!detail) throw new ApiError(0, "no_active_draft");
      setSaving(true);
      setError(null);
      try {
        const result = await fn(detail.id);
        onResult?.(result);
        return result;
      } catch (err) {
        setError(err instanceof ApiError ? err.code : "save_failed");
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [detail],
  );

  const saveBasics = useCallback(
    (data: ApiBasicsInput) =>
      withSave((id) => api.entities.basics(id, data), mergeSummary).then(
        () => undefined,
      ),
    [withSave],
  );
  const saveOrganizer = useCallback(
    (data: ApiOrganizerInput) =>
      withSave((id) => api.entities.organizer(id, data), mergeSummary).then(
        () => undefined,
      ),
    [withSave],
  );
  const saveContract = useCallback(
    (data: ApiContractInput) =>
      withSave((id) => api.entities.contract(id, data), mergeSummary).then(
        () => undefined,
      ),
    [withSave],
  );
  const saveAgent = useCallback(
    (data: ApiAgentInput) =>
      withSave((id) => api.entities.agent(id, data), mergeSummary).then(
        () => undefined,
      ),
    [withSave],
  );
  const saveAgreement = useCallback(
    (data: ApiAgreementInput) =>
      withSave((id) => api.entities.agreement(id, data), mergeSummary).then(
        () => undefined,
      ),
    [withSave],
  );
  const ackNotice = useCallback(
    () =>
      withSave((id) => api.entities.notice(id), mergeSummary).then(
        () => undefined,
      ),
    [withSave],
  );

  const submit = useCallback(async (): Promise<SubmitOutcome> => {
    if (!detail) return { ok: false, missing: [] };
    setSaving(true);
    setError(null);
    try {
      const result = await api.entities.submit(detail.id);
      mergeSummary(result);
      return { ok: true, summary: result };
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && err.code === "incomplete_draft") {
        const missing = (err.details?.missing as string[] | undefined) ?? [];
        return { ok: false, missing };
      }
      setError(err instanceof ApiError ? err.code : "submit_failed");
      throw err;
    } finally {
      setSaving(false);
    }
  }, [detail]);

  const uploadDocument = useCallback(
    async (file: File, type: ApiDocumentType): Promise<ApiDocument> => {
      if (!detail) throw new ApiError(0, "no_active_draft");
      setSaving(true);
      setError(null);
      try {
        const doc = await api.documents.upload(detail.id, file, type);
        setDocuments((prev) => [doc, ...prev]);
        return doc;
      } catch (err) {
        setError(err instanceof ApiError ? err.code : "upload_failed");
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [detail],
  );

  return {
    detail,
    documents,
    loading,
    error,
    saving,
    saveBasics,
    saveOrganizer,
    saveContract,
    saveAgent,
    saveAgreement,
    ackNotice,
    submit,
    uploadDocument,
  };
}
