import { CHAIN_INFO_MAP, DEFAULT_CHAIN_ID } from "../../constants/misc";

interface UnsupportedChainBannerProps {
  chainId: number | null;
  onSwitch: (chainId: number) => void;
}

export function UnsupportedChainBanner({ chainId, onSwitch }: UnsupportedChainBannerProps) {
  if (chainId == null) return null;
  if (CHAIN_INFO_MAP[chainId]) return null;

  const target = CHAIN_INFO_MAP[DEFAULT_CHAIN_ID];

  return (
    <div
      style={{
        background: "color-mix(in oklab, var(--colors-warn) 12%, var(--colors-surface))",
        borderBottom: "1px solid color-mix(in oklab, var(--colors-warn) 40%, transparent)",
        color: "var(--colors-text-main)",
        fontSize: 13,
        padding: "8px 16px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
        justifyContent: "center",
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "var(--colors-warn)",
          flexShrink: 0,
        }}
      />
      <span>
        Connected to an unsupported network (chain ID <code style={{ fontFamily: "monospace" }}>{chainId}</code>).
        Switch networks to use this app.
      </span>
      {target && (
        <button
          onClick={() => onSwitch(DEFAULT_CHAIN_ID)}
          style={{
            border: "1px solid var(--colors-warn)",
            background: "var(--colors-warn)",
            color: "var(--colors-text-on-warn, #1a1206)",
            borderRadius: "var(--radius-sm)",
            padding: "4px 10px",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Switch to {target.chainName}
        </button>
      )}
    </div>
  );
}
