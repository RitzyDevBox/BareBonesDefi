import { useCallback, useEffect, useRef, useState } from "react";
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

// Owns the user's single formation DRAFT. On mount: find-or-create the
// draft + load its documents. Step saves POST partial bundles; the response
// is a PII-scrubbed summary, which we merge over the existing detail so
// completion flags + public fields stay fresh without overwriting the PII
// the user just typed in.
export function useFormationDraft(): FormationDraftState {
  const { isSignedIn } = useApiAuthContext();
  const [detail, setDetail] = useState<ApiEntityFull | null>(null);
  const [documents, setDocuments] = useState<ApiDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // React 18 StrictMode runs effects twice in dev. Without this guard the
  // initial findOrCreate fires twice — visible as duplicate POST /entities
  // in the network tab. Reset when the auth state actually changes.
  const initRef = useRef(false);

  useEffect(() => {
    if (!isSignedIn) {
      initRef.current = false;
      setLoading(false);
      setDetail(null);
      setDocuments([]);
      return;
    }
    if (initRef.current) return;
    initRef.current = true;

    // No AbortController / cancellation here — the ref guard above ensures
    // only one fetch ever flies between sign-in events. Adding a cleanup
    // that flipped a `cancelled` flag would race the StrictMode double-mount
    // and leave `loading` stuck at true (first run's setLoading(false)
    // gated by cancelled=true, second run early-returns).
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const draft = await api.entities.findOrCreate();
        setDetail(draft);
        const docs = await api.documents.list(draft.id);
        setDocuments(docs);
      } catch (err) {
        setError(err instanceof ApiError ? err.code : "draft_load_failed");
      } finally {
        setLoading(false);
      }
    })();
  }, [isSignedIn]);

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
