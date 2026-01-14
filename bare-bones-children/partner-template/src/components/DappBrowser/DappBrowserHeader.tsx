import { useState } from "react";
import { Input } from "../BasicComponents";
import { IconButton } from "../Button/IconButton";
import { Row } from "../Primitives";
import { WalletSelectorModalWithDisplay } from "../Wallet/WalletSelectorModalWithDisplay";

type Props = {
  inputUrl: string;
  onChangeUrl: (v: string) => void;
  onNavigate: () => void;

  walletConnected: boolean;
  activeWalletAddress?: string | null;

  onPair: (uri: string) => Promise<void>;
  onDisconnect: () => void;
};

export function DappBrowserHeader({
  inputUrl,
  onChangeUrl,
  onNavigate,
  walletConnected,
  activeWalletAddress,
  onPair,
  onDisconnect,
}: Props) {
  const [wcUri, setWcUri] = useState("");
  const [pairing, setPairing] = useState(false);

  const handlePair = async () => {
    if (!wcUri || pairing) return;

    try {
      setPairing(true);
      await onPair(wcUri);   
      setWcUri("");
    } catch (err) {
      console.error("WalletConnect pairing failed", err);
    } finally {
      setPairing(false);
    }
  };

  return (
    <Row
      gap="xs"
      align="center"
      style={{
        minWidth: 340,
        height: 56,
        padding: "0 var(--spacing-xs)",
        background: "var(--colors-surface)",
        borderBottom: "1px solid var(--colors-border)",
      }}
    >
      {/* ---------- URL SLOT ---------- */}
      <div
        style={{
          flex: "2 1 0",
          minWidth: 120,
          display: "flex",
          gap: 6,
        }}
      >
        <Input
          value={inputUrl}
          onChange={e => onChangeUrl(e.target.value)}
          onKeyDown={e => e.key === "Enter" && onNavigate()}
          placeholder="https://…"
          style={{
            height: 36,
            fontSize: 13,
            padding: "0 8px",
          }}
        />

        <IconButton
          size="sm"
          onClick={onNavigate}
          aria-label="Go"
          style={{ width: 32, height: 32 }}
        >
          →
        </IconButton>
      </div>

      {/* ---------- WALLET SLOT ---------- */}
      <div
        style={{
          flex: "1 1 0",
          minWidth: 100,
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: 6,
        }}
      >
        {walletConnected && activeWalletAddress ? (
          <WalletSelectorModalWithDisplay
            address={activeWalletAddress}
            onSelect={() => {}}
            isDisabled
          />
        ) : (
          <>
            <Input
              value={wcUri}
              onChange={e => setWcUri(e.target.value)}
              placeholder="wc:…"
              style={{
                flex: 1,
                minWidth: 70,
                height: 32,
                fontSize: 12,
                padding: "0 6px",
              }}
            />

            <IconButton
              size="sm"
              aria-label="Connect"
              onClick={handlePair}
              disabled={pairing}
              style={{ width: 32, height: 32 }}
            >
              ⛓
            </IconButton>
          </>
        )}

        {walletConnected && (
          <IconButton
            size="sm"
            aria-label="Disconnect"
            onClick={onDisconnect}
            style={{ width: 32, height: 32 }}
          >
            ⎋
          </IconButton>
        )}
      </div>
    </Row>
  );
}
