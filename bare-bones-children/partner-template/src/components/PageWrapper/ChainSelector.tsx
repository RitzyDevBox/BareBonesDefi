import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CHAIN_INFO_MAP } from "../../constants/misc";
import { ImageWithFallback } from "../ImageWithFallback";

interface ChainSelectorProps {
  chainId: number | null;
  onChainChange: (chainId: number) => void;
  showTestnets?: boolean;
  compact?: boolean;
}

export function ChainSelector({ chainId, onChainChange, showTestnets = true, compact = false }: ChainSelectorProps) {
  const [open, setOpen] = useState(false);
  const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const allChains = Object.values(CHAIN_INFO_MAP);
  const chains = showTestnets ? allChains : allChains.filter((c) => !c.testnet);

  const current = chainId != null ? CHAIN_INFO_MAP[chainId] : null;
  const isUnknown = chainId != null && !current;

  // Compute dropdown position synchronously before paint when open changes
  useLayoutEffect(() => {
    if (open && triggerRef.current) {
      setTriggerRect(triggerRef.current.getBoundingClientRect());
    }
  }, [open]);

  // Close on outside click
  useEffect(() => {
    function onOutsideClick(e: MouseEvent) {
      if (
        !triggerRef.current?.contains(e.target as Node) &&
        !dropdownRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, []);

  // Close when anything scrolls (fixed dropdown drifts from trigger on scroll)
  useEffect(() => {
    if (!open) return;
    function onScroll() { setOpen(false); }
    window.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => window.removeEventListener("scroll", onScroll, { capture: true });
  }, [open]);

  return (
    <div style={{ position: "relative" }}>
      {/* Trigger pill */}
      <button
        ref={triggerRef}
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          height: 36,
          padding: compact ? "0 8px" : "0 10px",
          border: "1px solid var(--colors-border)",
          background: "var(--colors-surface)",
          borderRadius: "var(--radius-md)",
          fontSize: 13,
          fontWeight: 500,
          color: "var(--colors-text-main)",
          cursor: "pointer",
          transition: "border-color .15s, background .15s",
          whiteSpace: "nowrap",
        }}
      >
        {isUnknown ? (
          <>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "var(--colors-warn)",
                boxShadow: "0 0 0 2px color-mix(in oklab, var(--colors-warn) 30%, transparent)",
                flexShrink: 0,
              }}
            />
            {!compact && <span>Unknown</span>}
          </>
        ) : current ? (
          <>
            {current.logoUrl ? (
              <ImageWithFallback
                src={current.logoUrl}
                fallbackText={current.chainName[0]}
                size={14}
                style={{ flexShrink: 0 }}
              />
            ) : (
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "var(--colors-primary)",
                  boxShadow: "0 0 0 2px color-mix(in oklab, var(--colors-primary) 30%, transparent)",
                  flexShrink: 0,
                }}
              />
            )}
            {!compact && (
              <span
                style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              >
                {current.chainName}
              </span>
            )}
          </>
        ) : (
          !compact && <span style={{ color: "var(--colors-text-muted)" }}>Network</span>
        )}
        {/* Caret always visible — indicates dropdown interactivity */}
        <span style={{ fontSize: 10, opacity: 0.5, flexShrink: 0 }}>▼</span>
      </button>

      {/* Portaled dropdown — right edge aligns with trigger's right edge in both
          modes; clamped so the panel never hugs the viewport edge tighter than 8px. */}
      {open && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: "fixed",
            top: (triggerRect?.bottom ?? -9999) + 6,
            right: Math.max(8, window.innerWidth - (triggerRect?.right ?? 0)),
            minWidth: 180,
            maxWidth: "calc(100vw - 16px)",
            background: "var(--colors-surface)",
            border: "1px solid var(--colors-border)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadows-medium)",
            zIndex: 5000,
            overflow: "hidden",
            padding: 4,
          }}
        >
          {chains.length === 0 ? (
            <div style={{ padding: "10px 14px", color: "var(--colors-text-muted)", fontSize: 13 }}>
              No networks
            </div>
          ) : (
            chains.map((c) => {
              const isSelected = c.chainId === chainId;
              return (
                <button
                  key={c.chainId}
                  onClick={() => {
                    onChainChange(c.chainId);
                    setOpen(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    padding: "9px 12px",
                    background: isSelected ? "color-mix(in oklab, var(--colors-primary) 10%, var(--colors-surface))" : "transparent",
                    border: "none",
                    borderRadius: "var(--radius-sm)",
                    color: isSelected ? "var(--colors-primary)" : "var(--colors-text-main)",
                    fontSize: 13,
                    fontWeight: isSelected ? 600 : 500,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "background .12s",
                  }}
                >
                  {c.logoUrl ? (
                    <ImageWithFallback src={c.logoUrl} fallbackText={c.chainName[0]} size={16} />
                  ) : (
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: isSelected ? "var(--colors-primary)" : "var(--colors-text-muted)",
                        flexShrink: 0,
                      }}
                    />
                  )}
                  <span>{c.chainName}</span>
                  {c.testnet && (
                    <span
                      style={{
                        marginLeft: "auto",
                        fontSize: 10,
                        fontFamily: "monospace",
                        color: "var(--colors-text-label)",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      testnet
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
