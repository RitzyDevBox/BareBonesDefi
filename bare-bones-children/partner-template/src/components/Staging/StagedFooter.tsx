interface StagedFooterProps {
  count: number;
  onSave: () => void | Promise<void>;
  onDiscard: () => void;
  saving?: boolean;
  saveLabel?: string;
  discardLabel?: string;
}

export function StagedFooter({
  count,
  onSave,
  onDiscard,
  saving = false,
  saveLabel = "Save all",
  discardLabel = "Discard",
}: StagedFooterProps) {
  if (!count) return null;
  return (
    <div role="region" aria-label="Staged changes" className="bb-stg-footer">
      <div className="bb-stg-footer-info">
        <span className="bb-stg-pulse" />
        <span>
          <b>{count}</b> staged change{count === 1 ? "" : "s"}
        </span>
      </div>
      <div className="bb-stg-footer-actions">
        <button className="bb-btn-ghost" onClick={onDiscard} disabled={saving}>
          {discardLabel}
        </button>
        <button className="bb-btn-primary" onClick={onSave} disabled={saving}>
          {saving ? <span className="bb-spinner bb-sm" /> : null}
          {saving ? "Saving…" : saveLabel}
        </button>
      </div>
    </div>
  );
}
