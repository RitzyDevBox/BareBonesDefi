import { useState } from "react";

type Props = {
  onConnect: (uri: string) => void;
};

export function WalletConnectUriInput({ onConnect }: Props) {
  const [uri, setUri] = useState("");

  return (
    <div>
      <input
        value={uri}
        onChange={e => setUri(e.target.value)}
        placeholder="wc:..."
      />
      <button onClick={() => onConnect(uri)}>
        Connect
      </button>
    </div>
  );
}
