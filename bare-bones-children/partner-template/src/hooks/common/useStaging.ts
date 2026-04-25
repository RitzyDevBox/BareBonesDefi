import { useEffect, useMemo, useRef, useState } from "react";

export type StageStatus = "clean" | "added" | "edited" | "deleted";

export interface StagedRowView<TRow, TChild> extends Record<string, any> {
  __status: StageStatus;
  __original?: TRow;
  __children: StagedChildView<TChild>[];
}

export interface StagedChildView<TChild> extends Record<string, any> {
  __status: StageStatus;
  __original?: TChild;
}

interface StagedChildEntry<TChild> {
  kind: "add" | "edit" | "delete" | null;
  draft: Partial<TChild> | TChild | null;
  original: TChild | null;
}

interface StagedRowEntry<TRow, TChild> {
  kind: "add" | "edit" | "delete" | null;
  draft: Partial<TRow> | TRow | null;
  original: TRow | null;
  children: Record<string, StagedChildEntry<TChild>>;
}

export interface StagingMutators<TRow, TChild> {
  addRow: (draft: TRow) => void;
  editRow: (id: string | number, patch: Partial<TRow>) => void;
  deleteRow: (id: string | number) => void;
  undoRow: (id: string | number) => void;
  addChild: (rowId: string | number, draft: TChild) => void;
  editChild: (rowId: string | number, childId: string | number, patch: Partial<TChild>) => void;
  deleteChild: (rowId: string | number, childId: string | number) => void;
  undoChild: (rowId: string | number, childId: string | number) => void;
}

export interface StagingApi<TRow, TChild> {
  view: StagedRowView<TRow, TChild>[];
  dirtyCount: number;
  mutators: StagingMutators<TRow, TChild>;
  save: () => TRow[];
  discard: () => void;
  rawRows: TRow[];
}

export interface StagingOptions {
  rowKey?: string;
  childrenKey?: string;
  childKey?: string;
}

function shallowEq(a: any, b: any) {
  if (!a || !b) return false;
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  return ak.every((k) => a[k] === b[k]);
}

export function useStaging<TRow extends Record<string, any>, TChild extends Record<string, any> = Record<string, any>>(
  initial: TRow[],
  options: StagingOptions = {},
): StagingApi<TRow, TChild> {
  const rowKey = options.rowKey || "id";
  const childrenKey = options.childrenKey || "configs";
  const childKey = options.childKey || "id";

  const [rows, setRows] = useState<TRow[]>(initial);
  const [staged, setStaged] = useState<Record<string, StagedRowEntry<TRow, TChild>>>({});

  const seedSig = JSON.stringify((initial || []).map((r) => r[rowKey]));
  const lastSeedSig = useRef(seedSig);
  useEffect(() => {
    if (lastSeedSig.current === seedSig) return;
    lastSeedSig.current = seedSig;
    setRows(initial);
    setStaged({});
  }, [seedSig, initial]);

  const mutate = (updater: (next: Record<string, StagedRowEntry<TRow, TChild>>) => void) =>
    setStaged((prev) => {
      const next = { ...prev };
      updater(next);
      return next;
    });

  const ensureRow = (
    next: Record<string, StagedRowEntry<TRow, TChild>>,
    id: string,
    original: TRow | null,
  ) => {
    if (!next[id]) next[id] = { kind: null, draft: null, original, children: {} };
    return next[id];
  };

  const mutators: StagingMutators<TRow, TChild> = {
    addRow: (draft) =>
      mutate((next) => {
        const id = String(draft[rowKey]);
        const draftWithChildren = {
          ...(draft as any),
          [childrenKey]: (draft as any)[childrenKey] || [],
        };
        next[id] = { kind: "add", draft: draftWithChildren, original: null, children: {} };
      }),
    editRow: (id, patch) =>
      mutate((next) => {
        const idStr = String(id);
        const original = rows.find((r) => String(r[rowKey]) === idStr) || null;
        const e = ensureRow(next, idStr, original);
        if (e.kind === "add") {
          e.draft = { ...(e.draft as any), ...patch };
          return;
        }
        if (e.kind === "delete") return;
        e.kind = "edit";
        e.draft = { ...((e.draft as any) || original), ...patch };
        if (original && shallowEq(e.draft, original)) {
          delete next[idStr];
        }
      }),
    deleteRow: (id) =>
      mutate((next) => {
        const idStr = String(id);
        const original = rows.find((r) => String(r[rowKey]) === idStr) || null;
        const existing = next[idStr];
        if (existing?.kind === "add") {
          delete next[idStr];
          return;
        }
        const r = ensureRow(next, idStr, original);
        r.kind = "delete";
        r.draft = null;
      }),
    undoRow: (id) =>
      mutate((next) => {
        delete next[String(id)];
      }),

    addChild: (rowId, draft) =>
      mutate((next) => {
        const rowIdStr = String(rowId);
        const original = rows.find((r) => String(r[rowKey]) === rowIdStr) || null;
        const e = ensureRow(next, rowIdStr, original);
        const cidStr = String((draft as any)[childKey]);
        e.children[cidStr] = { kind: "add", draft, original: null };
      }),
    editChild: (rowId, childId, patch) =>
      mutate((next) => {
        const rowIdStr = String(rowId);
        const cidStr = String(childId);
        const originalRow = rows.find((r) => String(r[rowKey]) === rowIdStr) || null;
        const e = ensureRow(next, rowIdStr, originalRow);
        const existing = e.children[cidStr];
        if (existing?.kind === "add") {
          existing.draft = { ...(existing.draft as any), ...patch };
          return;
        }
        const originalChild = ((originalRow?.[childrenKey] || []) as TChild[]).find(
          (c) => String(c[childKey]) === cidStr,
        ) || null;
        const cur: StagedChildEntry<TChild> = existing || {
          kind: "edit",
          draft: { ...(originalChild as any) },
          original: originalChild,
        };
        cur.kind = "edit";
        cur.draft = { ...((cur.draft as any) || originalChild), ...patch };
        if (originalChild && shallowEq(cur.draft, originalChild)) {
          delete e.children[cidStr];
        } else {
          e.children[cidStr] = cur;
        }
      }),
    deleteChild: (rowId, childId) =>
      mutate((next) => {
        const rowIdStr = String(rowId);
        const cidStr = String(childId);
        const originalRow = rows.find((r) => String(r[rowKey]) === rowIdStr) || null;
        const e = ensureRow(next, rowIdStr, originalRow);
        const existing = e.children[cidStr];
        if (existing?.kind === "add") {
          delete e.children[cidStr];
          return;
        }
        const originalChild = ((originalRow?.[childrenKey] || []) as TChild[]).find(
          (c) => String(c[childKey]) === cidStr,
        ) || null;
        e.children[cidStr] = { kind: "delete", draft: null, original: originalChild };
      }),
    undoChild: (rowId, childId) =>
      mutate((next) => {
        const e = next[String(rowId)];
        if (!e) return;
        delete e.children[String(childId)];
      }),
  };

  const view = useMemo<StagedRowView<TRow, TChild>[]>(() => {
    const out: StagedRowView<TRow, TChild>[] = [];
    for (const r of rows) {
      const idStr = String(r[rowKey]);
      const s = staged[idStr];
      if (s?.kind === "delete") {
        out.push({
          ...(r as any),
          __status: "deleted",
          __children: stageChildren<TChild>((r[childrenKey] || []) as TChild[], s.children, childKey),
        });
      } else if (s?.kind === "edit") {
        out.push({
          ...(r as any),
          ...((s.draft as any) || {}),
          __status: "edited",
          __original: r,
          __children: stageChildren<TChild>((r[childrenKey] || []) as TChild[], s.children, childKey),
        });
      } else {
        out.push({
          ...(r as any),
          __status: "clean",
          __children: stageChildren<TChild>((r[childrenKey] || []) as TChild[], s?.children, childKey),
        });
      }
    }
    for (const id of Object.keys(staged)) {
      if (staged[id].kind === "add") {
        const draft = staged[id].draft as any;
        out.push({
          ...draft,
          __status: "added",
          __children: stageChildren<TChild>((draft?.[childrenKey] || []) as TChild[], staged[id].children, childKey),
        });
      }
    }
    return out;
  }, [rows, staged, rowKey, childrenKey, childKey]);

  const dirtyCount = useMemo(() => {
    let n = 0;
    for (const id of Object.keys(staged)) {
      const s = staged[id];
      if (s.kind) n += 1;
      n += Object.values(s.children || {}).filter((c) => c.kind).length;
    }
    return n;
  }, [staged]);

  const save = (): TRow[] => {
    const next: TRow[] = [];
    for (const r of rows) {
      const idStr = String(r[rowKey]);
      const s = staged[idStr];
      if (s?.kind === "delete") continue;
      let merged: TRow = r;
      if (s?.kind === "edit") merged = { ...(r as any), ...(s.draft as any) };
      const baseChildren = ((merged[childrenKey] || []) as TChild[]).slice();
      const finalChildren: TChild[] = [];
      for (const c of baseChildren) {
        const cs = s?.children?.[String(c[childKey])];
        if (cs?.kind === "delete") continue;
        if (cs?.kind === "edit") finalChildren.push({ ...(c as any), ...(cs.draft as any) });
        else finalChildren.push(c);
      }
      if (s?.children) {
        for (const cid of Object.keys(s.children)) {
          if (s.children[cid].kind === "add") finalChildren.push(s.children[cid].draft as TChild);
        }
      }
      next.push({ ...(merged as any), [childrenKey]: finalChildren });
    }
    for (const id of Object.keys(staged)) {
      if (staged[id].kind === "add") {
        const draft = staged[id].draft as any;
        const baseChildren = ((draft[childrenKey] || []) as TChild[]).slice();
        if (staged[id].children) {
          for (const cid of Object.keys(staged[id].children)) {
            if (staged[id].children[cid].kind === "add") {
              baseChildren.push(staged[id].children[cid].draft as TChild);
            }
          }
        }
        next.push({ ...draft, [childrenKey]: baseChildren });
      }
    }
    setRows(next);
    setStaged({});
    return next;
  };

  const discard = () => setStaged({});

  return { view, dirtyCount, mutators, save, discard, rawRows: rows };
}

function stageChildren<TChild extends Record<string, any>>(
  originalChildren: TChild[],
  stagedMap: Record<string, StagedChildEntry<TChild>> | undefined,
  childKey: string,
): StagedChildView<TChild>[] {
  const out: StagedChildView<TChild>[] = [];
  for (const c of originalChildren) {
    const s = stagedMap?.[String(c[childKey])];
    if (s?.kind === "delete") out.push({ ...(c as any), __status: "deleted" });
    else if (s?.kind === "edit") out.push({ ...(c as any), ...(s.draft as any), __status: "edited", __original: c });
    else out.push({ ...(c as any), __status: "clean" });
  }
  if (stagedMap) {
    for (const id of Object.keys(stagedMap)) {
      if (stagedMap[id].kind === "add") {
        out.push({ ...(stagedMap[id].draft as any), __status: "added" });
      }
    }
  }
  return out;
}
