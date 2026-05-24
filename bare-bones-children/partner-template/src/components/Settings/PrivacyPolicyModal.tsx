import { createPortal } from "react-dom";
import { ReactNode, useEffect, useMemo } from "react";
import { useMediaQuery, ScreenSize } from "../../hooks/useMediaQuery";
import { Sheet } from "../Primitives/Sheet";
import { IconButton } from "../Button/IconButton";
import { LEGAL_VARS, LegalVars } from "../../config/legal";
// Vite `?raw` import: ships the markdown file's contents as a string into
// the bundle. Canonical source lives at the monorepo's `docs/` dir so
// counsel can review it as plain markdown; the `?raw` import keeps a
// single source of truth without a build-time copy step.
import policyMarkdown from "../../../../../../docs/privacy_policy_template.md?raw";

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Tiny markdown subset just for our legal docs. Supports:
//   - `# / ## / ###` headings
//   - paragraphs (blank-line separated)
//   - `- ` bullet lists
//   - `**bold**` inline
//   - `---` horizontal rule
// Skips: tables, images, code blocks, nested lists, links — we don't use
// them in the policy body. The "## Template Variables" docs table at the
// end of the canonical markdown is stripped before parsing (it's metadata,
// not user-facing copy).
//
// Why not pull in `marked` / `markdown-it`? Per project norms we don't add
// NPM deps without explicit justification; this file is ~50 lines and
// handles exactly what the policy needs, with no ongoing dep maintenance.
function renderMarkdown(md: string): ReactNode[] {
  const cutoff = md.indexOf("\n## Template Variables");
  const body = cutoff >= 0 ? md.slice(0, cutoff) : md;

  const blocks: ReactNode[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push(
      <p key={`p-${blocks.length}`}>{renderInline(paragraph.join(" "))}</p>,
    );
    paragraph = [];
  };
  const flushList = () => {
    if (list.length === 0) return;
    blocks.push(
      <ul key={`ul-${blocks.length}`} style={{ paddingLeft: 22, margin: "8px 0 12px" }}>
        {list.map((item, i) => (
          <li key={i} style={{ margin: "2px 0" }}>
            {renderInline(item)}
          </li>
        ))}
      </ul>,
    );
    list = [];
  };

  for (const raw of body.split("\n")) {
    const line = raw.trimEnd();
    if (line.startsWith("### ")) {
      flushParagraph();
      flushList();
      blocks.push(
        <h3 key={`h3-${blocks.length}`} style={{ marginTop: 18, marginBottom: 6 }}>
          {renderInline(line.slice(4))}
        </h3>,
      );
    } else if (line.startsWith("## ")) {
      flushParagraph();
      flushList();
      blocks.push(
        <h2 key={`h2-${blocks.length}`} style={{ marginTop: 24, marginBottom: 8 }}>
          {renderInline(line.slice(3))}
        </h2>,
      );
    } else if (line.startsWith("# ")) {
      flushParagraph();
      flushList();
      blocks.push(
        <h1 key={`h1-${blocks.length}`} style={{ marginTop: 0, marginBottom: 12 }}>
          {renderInline(line.slice(2))}
        </h1>,
      );
    } else if (line.startsWith("- ")) {
      flushParagraph();
      list.push(line.slice(2));
    } else if (line === "---") {
      flushParagraph();
      flushList();
      blocks.push(
        <hr
          key={`hr-${blocks.length}`}
          style={{
            border: "none",
            borderTop: "1px solid var(--colors-border)",
            margin: "20px 0",
          }}
        />,
      );
    } else if (line === "") {
      flushParagraph();
      flushList();
    } else {
      flushList();
      paragraph.push(line);
    }
  }
  flushParagraph();
  flushList();
  return blocks;
}

// `**bold**` is the only inline construct the policy uses. If we ever add
// links or inline-code we'll extend this; until then keep it tight.
function renderInline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) out.push(text.slice(last, match.index));
    out.push(<strong key={`b-${out.length}`}>{match[1]}</strong>);
    last = match.index + match[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function injectVars(text: string, vars: LegalVars): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key: keyof LegalVars) =>
    key in vars ? vars[key] : `{{${key}}}`,
  );
}

function PolicyContent() {
  // useMemo so the (modest) markdown parse + inline render only run once
  // per modal mount instead of on every parent re-render.
  const rendered = useMemo(
    () => renderMarkdown(injectVars(policyMarkdown, LEGAL_VARS)),
    [],
  );
  return (
    <div
      style={{
        fontSize: 14,
        lineHeight: 1.6,
        color: "var(--colors-text-main)",
      }}
    >
      {rendered}
    </div>
  );
}

export function PrivacyPolicyModal({ isOpen, onClose }: PrivacyPolicyModalProps) {
  const screen = useMediaQuery();
  const isMobile = screen === ScreenSize.Phone || screen === ScreenSize.Tablet;

  // Esc closes from anywhere; we keep this on the document because it's a
  // keyboard shortcut, not a click. Outside-click handling, however, is
  // done with element-attached listeners below — a document-level
  // mousedown listener here fights with the parent SettingsModal's own
  // document-level listener: clicking text in this modal looks "outside
  // settings" from Settings' POV, so Settings closes and unmounts us,
  // which is why users couldn't even select/copy text from the policy.
  useEffect(() => {
    if (!isOpen || isMobile) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, isMobile, onClose]);

  if (!isOpen) return null;

  if (isMobile) {
    return (
      <Sheet placement="bottom" open={isOpen} onClose={onClose}>
        <div style={{ paddingBottom: 8 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <span style={{ fontSize: 16, fontWeight: 600, color: "var(--colors-text-main)" }}>
              Privacy Policy
            </span>
            <IconButton
              onClick={onClose}
              aria-label="Close privacy policy"
              size="sm"
              shape="rounded"
              style={{ border: "none", background: "transparent", color: "var(--colors-text-muted)" }}
            >
              ✕
            </IconButton>
          </div>
          <div style={{ maxHeight: "70vh", overflowY: "auto", paddingRight: 4 }}>
            <PolicyContent />
          </div>
        </div>
      </Sheet>
    );
  }

  return createPortal(
    // Element-attached outside-click: clicks on the backdrop call onClose;
    // mousedown inside the inner wrapper stops propagation so SettingsModal's
    // own document-level mousedown listener never sees them (otherwise
    // every click on policy text would be treated as "outside settings"
    // and close the parent modal, dragging us down with it).
    <div
      onMouseDown={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        zIndex: 9100,
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 720,
          maxHeight: "85vh",
          background: "var(--colors-surface)",
          border: "1px solid var(--colors-border)",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 22px",
            borderBottom: "1px solid var(--colors-border)",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 18,
              fontWeight: 500,
              letterSpacing: "-0.01em",
              color: "var(--colors-text-main)",
            }}
          >
            Privacy Policy
          </span>
          <IconButton
            onClick={onClose}
            aria-label="Close privacy policy"
            size="sm"
            shape="rounded"
            style={{ border: "none", background: "transparent", color: "var(--colors-text-muted)" }}
          >
            ✕
          </IconButton>
        </div>

        <div style={{ padding: "16px 24px 24px", overflowY: "auto", flex: 1 }}>
          <PolicyContent />
        </div>
      </div>
    </div>,
    document.body,
  );
}
