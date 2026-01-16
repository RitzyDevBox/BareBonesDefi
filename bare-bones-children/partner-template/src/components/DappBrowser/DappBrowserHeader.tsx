import { useState } from "react";
import { Input } from "../BasicComponents";
import { Row } from "../Primitives";
import { PowerButton } from "../Button/Actions/PowerButton";
import { NavigateButton } from "../Button/Actions/NavigateButton";
import { WalletSelectorModalWithDisplay } from "../Wallet/WalletSelectorModalWithDisplay";

type Props = {
  inputUrl: string;
  onChangeUrl: (v: string) => void;
  onNavigate: () => void;

  walletConnected: boolean;
  activeWalletAddress?: string | null;
  onWalletChange: (walletAddress: string, index: number) => Promise<void>;
  onPair: (uri: string) => Promise<void>;
  onDisconnect: () => void;
};

export function DappBrowserHeader({
  inputUrl,
  onChangeUrl,
  onNavigate,
  walletConnected,
  activeWalletAddress,
  onWalletChange,
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
            height: 32,
            fontSize: 12,
            padding: "0 8px",
          }}
        />
        <NavigateButton onNavigate={onNavigate} />
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
          
        <WalletSelectorModalWithDisplay address={activeWalletAddress} onSelect={onWalletChange} ignoreMediaQuery={true} />

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

            <PowerButton
              ariaLabel="Connect"
              variant="outline"
              onClick={handlePair}
              disabled={pairing}
            />
          </>
        )}

        {walletConnected && (
          <PowerButton
            ariaLabel="Disconnect"
            variant="filled"
            onClick={onDisconnect}
          />
        )}
      </div>
    </Row>
  );
}
