import { useRef, useState } from "react";
import { useActiveOrganization } from "../../providers/ActiveOrganizationProvider";
import { useClickOutside } from "../../hooks/common/useClickOutside";
import { DaoAvatar } from "./DaoAvatar";

interface DaoSwitcherProps {
  onCreate: () => void;
  compact?: boolean;
}

export function DaoSwitcher({ onCreate, compact = false }: DaoSwitcherProps) {
  const { activeOrgSlug, setActiveOrgSlug, ownedOrgs, loadingOwnedOrgs } = useActiveOrganization();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  useClickOutside(wrapperRef, () => setOpen(false), open);

  const activeLabel = activeOrgSlug || "No organization";

  return (
    <div ref={wrapperRef} style={{ position: "relative", flexShrink: 0 }}>
      <button
        type="button"
        className="bb-dao-sel"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        data-testid="dao-switcher"
      >
        <DaoAvatar slug={activeOrgSlug || "?"} size={compact ? 18 : 20} />
        {!compact && <span className="bb-dao-sel-label">{activeLabel}</span>}
        <span style={{ color: "var(--bb-text-mute)", fontSize: 11 }}>▾</span>
      </button>

      {open && (
        <div className={`bb-dao-menu${compact ? " bb-dao-menu-compact" : ""}`} role="menu">
          <div className="bb-menu-section">
            <span>Your organizations</span>
            <span>{loadingOwnedOrgs ? "…" : ownedOrgs.length}</span>
          </div>

          {!loadingOwnedOrgs && ownedOrgs.length === 0 && (
            <div style={{ padding: "10px 12px", fontSize: 12, color: "var(--bb-text-mute)" }}>
              No organizations yet. Create one to get started.
            </div>
          )}

          {ownedOrgs.map((slug) => {
            const checked = slug === activeOrgSlug;
            return (
              <button
                key={slug}
                role="menuitemradio"
                aria-checked={checked}
                className={`bb-dao-item${checked ? " bb-checked" : ""}`}
                onClick={() => {
                  setActiveOrgSlug(slug);
                  setOpen(false);
                }}
              >
                <DaoAvatar slug={slug} size={26} />
                <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                  <div className="bb-dao-item-name">{slug}</div>
                  <div className="bb-dao-item-sub">organization</div>
                </div>
                <span className="bb-check">✓</span>
              </button>
            );
          })}

          <div className="bb-menu-sep" />

          <button
            role="menuitem"
            className="bb-dao-create"
            onClick={() => {
              setOpen(false);
              onCreate();
            }}
            data-testid="dao-create-new"
          >
            <span className="bb-dao-create-icon">+</span>
            <div style={{ minWidth: 0 }}>
              <div className="bb-dao-item-name">Create new DAO</div>
              <div className="bb-dao-item-sub bb-dao-item-sub-wrap">
                Deploy governor, timelock & token wiring — or just register an organization
              </div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
