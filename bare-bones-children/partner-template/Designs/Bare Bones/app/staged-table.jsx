// Generic staged-changes table primitives.
//
// useStaging(initialRows, { rowKey, childrenKey, childKey })
//   returns: { view, dirtyCount, mutators, save, discard }
//   - view: rows enriched with __status: 'clean' | 'added' | 'edited' | 'deleted'
//           children get __status too. Edited rows expose __original.
//   - mutators: addRow, editRow, deleteRow, undoRow,
//               addChild, editChild, deleteChild, undoChild
//
// Stage colors are applied via the `__status` className. Saving collapses
// the staged map back into the canonical rows.

const StagingCtx = React.createContext(null);

function useStaging(initial, opts = {}) {
  const rowKey = opts.rowKey || 'id';
  const childrenKey = opts.childrenKey || 'configs';
  const childKey = opts.childKey || 'id';

  // canonical rows = source of truth between saves
  const [rows, setRows] = React.useState(initial);
  // staged ops keyed by rowId
  // shape: { [rowId]: { kind: 'add' | 'edit' | 'delete', draft, original, children: { [childId]: {kind, draft, original} } } }
  const [staged, setStaged] = React.useState({});

  // when seed/initial changes (chain or org switch), reset everything.
  // Compare by row-id signature so a fresh array reference with the same data
  // doesn't trigger a reset → setState loop.
  const seedSig = JSON.stringify((initial || []).map(r => r[rowKey]));
  const lastSeedSig = React.useRef(seedSig);
  React.useEffect(() => {
    if (lastSeedSig.current === seedSig) return;
    lastSeedSig.current = seedSig;
    setRows(initial);
    setStaged({});
  }, [seedSig]);

  const mutate = (updater) => setStaged(prev => {
    const next = { ...prev };
    updater(next);
    return next;
  });

  const ensureRow = (next, id, original) => {
    if (!next[id]) next[id] = { kind: null, draft: null, original, children: {} };
    return next[id];
  };

  const mutators = {
    addRow: (draft) => mutate(next => {
      const id = draft[rowKey];
      next[id] = { kind: 'add', draft: { ...draft, [childrenKey]: draft[childrenKey] || [] }, original: null, children: {} };
    }),
    editRow: (id, patch) => mutate(next => {
      const original = rows.find(r => r[rowKey] === id);
      const e = ensureRow(next, id, original);
      if (e.kind === 'add') {
        e.draft = { ...e.draft, ...patch };
      } else if (e.kind === 'delete') {
        // shouldn't be editing a deleted row — undo first
      } else {
        e.kind = 'edit';
        e.draft = { ...(e.draft || original), ...patch };
        // if draft equals original, clear it
        const same = original && Object.keys(patch).every(k => patch[k] === original[k]);
        if (same && e.draft && shallowEq(e.draft, original)) {
          delete next[id];
        }
      }
    }),
    deleteRow: (id) => mutate(next => {
      const original = rows.find(r => r[rowKey] === id);
      const e = next[id];
      if (e?.kind === 'add') { delete next[id]; return; }
      const r = ensureRow(next, id, original);
      r.kind = 'delete';
      r.draft = null;
    }),
    undoRow: (id) => mutate(next => { delete next[id]; }),

    addChild: (rowId, draft) => mutate(next => {
      const original = rows.find(r => r[rowKey] === rowId);
      const e = ensureRow(next, rowId, original);
      e.children[draft[childKey]] = { kind: 'add', draft, original: null };
    }),
    editChild: (rowId, childId, patch) => mutate(next => {
      const originalRow = rows.find(r => r[rowKey] === rowId);
      const e = ensureRow(next, rowId, originalRow);
      const existing = e.children[childId];
      if (existing?.kind === 'add') {
        existing.draft = { ...existing.draft, ...patch };
        return;
      }
      const originalChild = (originalRow?.[childrenKey] || []).find(c => c[childKey] === childId);
      const cur = existing || { kind: 'edit', draft: { ...originalChild }, original: originalChild };
      cur.kind = 'edit';
      cur.draft = { ...(cur.draft || originalChild), ...patch };
      if (originalChild && shallowEq(cur.draft, originalChild)) {
        delete e.children[childId];
      } else {
        e.children[childId] = cur;
      }
    }),
    deleteChild: (rowId, childId) => mutate(next => {
      const originalRow = rows.find(r => r[rowKey] === rowId);
      const e = ensureRow(next, rowId, originalRow);
      const existing = e.children[childId];
      if (existing?.kind === 'add') { delete e.children[childId]; return; }
      const originalChild = (originalRow?.[childrenKey] || []).find(c => c[childKey] === childId);
      e.children[childId] = { kind: 'delete', draft: null, original: originalChild };
    }),
    undoChild: (rowId, childId) => mutate(next => {
      const e = next[rowId];
      if (!e) return;
      delete e.children[childId];
    }),
  };

  // build view: merge canonical + staged
  const view = React.useMemo(() => {
    // map of staged rows
    const out = [];
    // existing rows
    for (const r of rows) {
      const s = staged[r[rowKey]];
      if (s?.kind === 'delete') {
        out.push({ ...r, __status: 'deleted', __children: stageChildren(r[childrenKey] || [], s.children, childKey) });
      } else if (s?.kind === 'edit') {
        out.push({ ...r, ...s.draft, __status: 'edited', __original: r, __children: stageChildren(r[childrenKey] || [], s.children, childKey) });
      } else {
        out.push({ ...r, __status: 'clean', __children: stageChildren(r[childrenKey] || [], s?.children, childKey) });
      }
    }
    // newly added rows
    for (const id of Object.keys(staged)) {
      if (staged[id].kind === 'add') {
        const draft = staged[id].draft;
        out.push({ ...draft, __status: 'added', __children: stageChildren(draft[childrenKey] || [], staged[id].children, childKey) });
      }
    }
    return out;
  }, [rows, staged]);

  const dirtyCount = React.useMemo(() => {
    let n = 0;
    for (const id of Object.keys(staged)) {
      const s = staged[id];
      if (s.kind) n += 1;
      n += Object.values(s.children || {}).filter(c => c.kind).length;
    }
    return n;
  }, [staged]);

  const save = () => {
    // collapse staged into rows
    const next = [];
    for (const r of rows) {
      const s = staged[r[rowKey]];
      if (s?.kind === 'delete') continue;
      let merged = r;
      if (s?.kind === 'edit') merged = { ...r, ...s.draft };
      // children
      const baseChildren = merged[childrenKey] || [];
      const finalChildren = [];
      for (const c of baseChildren) {
        const cs = s?.children?.[c[childKey]];
        if (cs?.kind === 'delete') continue;
        if (cs?.kind === 'edit') finalChildren.push({ ...c, ...cs.draft });
        else finalChildren.push(c);
      }
      // newly added children
      if (s?.children) {
        for (const cid of Object.keys(s.children)) {
          if (s.children[cid].kind === 'add') finalChildren.push(s.children[cid].draft);
        }
      }
      next.push({ ...merged, [childrenKey]: finalChildren });
    }
    // newly added rows
    for (const id of Object.keys(staged)) {
      if (staged[id].kind === 'add') {
        const draft = staged[id].draft;
        const baseChildren = draft[childrenKey] || [];
        const finalChildren = baseChildren.slice();
        if (staged[id].children) {
          for (const cid of Object.keys(staged[id].children)) {
            if (staged[id].children[cid].kind === 'add') finalChildren.push(staged[id].children[cid].draft);
          }
        }
        next.push({ ...draft, [childrenKey]: finalChildren });
      }
    }
    setRows(next);
    setStaged({});
    return next;
  };

  const discard = () => setStaged({});

  return { view, dirtyCount, mutators, save, discard, rawRows: rows };
}

function stageChildren(originalChildren, stagedMap, childKey) {
  const out = [];
  for (const c of originalChildren) {
    const s = stagedMap?.[c[childKey]];
    if (s?.kind === 'delete') out.push({ ...c, __status: 'deleted' });
    else if (s?.kind === 'edit') out.push({ ...c, ...s.draft, __status: 'edited', __original: c });
    else out.push({ ...c, __status: 'clean' });
  }
  if (stagedMap) {
    for (const id of Object.keys(stagedMap)) {
      if (stagedMap[id].kind === 'add') out.push({ ...stagedMap[id].draft, __status: 'added' });
    }
  }
  return out;
}

function shallowEq(a, b) {
  if (!a || !b) return false;
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  return ak.every(k => a[k] === b[k]);
}

// ---- presentational pieces ----

function StageBadge({ status }) {
  if (status === 'clean' || !status) return null;
  const map = {
    added:   { label: 'New',     cls: 'stg-add' },
    edited:  { label: 'Edited',  cls: 'stg-edit' },
    deleted: { label: 'Removed', cls: 'stg-del' },
  };
  const it = map[status]; if (!it) return null;
  return <span className={`stg-badge ${it.cls}`}>{it.label}</span>;
}

function StagedFooter({ count, onSave, onDiscard, saving }) {
  if (!count) return null;
  return (
    <div className="stg-footer" role="region" aria-label="Staged changes">
      <div className="stg-footer-info">
        <span className="stg-pulse" />
        <span><b>{count}</b> staged change{count === 1 ? '' : 's'}</span>
      </div>
      <div className="stg-footer-actions">
        <button className="btn-ghost btn-sm" onClick={onDiscard} disabled={saving}>Discard</button>
        <button className="btn-primary btn-sm" onClick={onSave} disabled={saving}>
          {saving ? <><span className="spinner sm" /> Saving…</> : <>Save all</>}
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { useStaging, StageBadge, StagedFooter });
