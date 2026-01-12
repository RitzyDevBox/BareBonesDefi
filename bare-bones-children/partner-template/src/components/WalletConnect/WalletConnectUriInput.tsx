import { useState } from "react";

type Props = {
  onConnect: (uri: string) => void;
};

export function WalletConnectUriInput({ onConnect }: Props) {
  const [uri, setUri] = useState("");

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        maxWidth: 200,
        flexShrink: 0,
      }}
    >
      <input
        value={uri}
        onChange={e => setUri(e.target.value)}
        placeholder="wc:…"
        style={{
          width: 80,
          minWidth: 0,
          height: 32,
          padding: "0 8px",
          borderRadius: 6,
          border: "1px solid var(--colors-border)",
          fontSize: 12,
        }}
      />
      <button
        onClick={() => onConnect(uri)}
        style={{
          height: 32,
          padding: "0 10px",
          fontSize: 12,
          whiteSpace: "nowrap",
        }}
      >
        Connect
      </button>
    </div>
  );
}
