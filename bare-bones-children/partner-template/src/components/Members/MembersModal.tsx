import { ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { Sheet } from "../Primitives/Sheet";
import { useMediaQuery, ScreenSize } from "../../hooks/useMediaQuery";

interface MembersModalProps {
  /** Small monospace label above the title (e.g. "Add member", "Edit role"). */
  kicker: string;
  /** Display title — e.g. the wizard step name or the role being edited. */
  title: string;
  onClose: () => void;
  /** Optional row that sits below the title (used by AddMemberWizard for the
   *  step indicator). */
  steps?: ReactNode;
  /** Body content — should use `.bb-amw-body` styling internally. */
  children: ReactNode;
  /** Action footer (Cancel / Continue / Save). */
  footer: ReactNode;
}

/**
 * Shared modal shell for the three Members builders (add member, role,
 * permission). Portaled, escape-to-close, scrim click closes. On phone
 * widths it renders as a bottom sheet instead — the wizard bodies are too
 * tall to centre on a 375px-wide viewport without horizontal cutoff.
 *
 * Lives in the Members section because no other surface needs this exact
 * layout (kicker + thin title + optional step strip + body + foot). If a
 * second consumer appears, promote to a Primitive.
 */
export function MembersModal({ kicker, title, onClose, steps, children, footer }: MembersModalProps) {
  const screen = useMediaQuery();
  const isPhone = screen === ScreenSize.Phone;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); }
    };
    document.addEventListener("keydown", onKey);
    // Prevent the page underneath from scrolling while the modal is open.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const head = (
    <div className="bb-m-modal-head">
      <div>
        <div className="bb-amw-kicker">{kicker}</div>
        <div className="bb-amw-title-thin">{title}</div>
      </div>
      <button type="button" className="bb-m-modal-head-close" onClick={onClose} aria-label="Close">
        ✕
      </button>
    </div>
  );

  if (isPhone) {
    return (
      <Sheet open placement="bottom" onClose={onClose}>
        <div className="bb-m-modal-shell bb-m-modal-shell--sheet">
          {head}
          {steps}
          {children}
          <div className="bb-amw-foot">{footer}</div>
        </div>
      </Sheet>
    );
  }

  return createPortal(
    <div
      className="bb-m-modal-back"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal
    >
      <div className="bb-m-modal-shell" onMouseDown={(e) => e.stopPropagation()}>
        {head}
        {steps}
        {children}
        <div className="bb-amw-foot">{footer}</div>
      </div>
    </div>,
    document.body,
  );
}
