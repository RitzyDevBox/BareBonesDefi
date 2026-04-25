import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "../components/BasicComponents";
import { PageContainer } from "../components/PageWrapper/PageContainer";
import { WalletSelector } from "../components/Wallet/WalletSelector";
import { DeployDiamondWidget } from "../components/DeployWalletWidget";
import { useUserWalletCount } from "../hooks/wallet/useUserWalletCount";
import { useWalletProvider } from "../hooks/useWalletProvider";
import { ROUTES } from "../routes";

export function WalletSelectorPage() {
  const navigate = useNavigate();
  const navigateToWallet = (address: string) => {
    navigate(ROUTES.BASIC_WALLET_WITH_ADDRESS(address));
  };
  const { count: walletCount, loading, connected } = useUserWalletCount();
  const { connect } = useWalletProvider();

  if (!connected) {
    return (
      <PageContainer>
        <div className="bb-ws-empty">
          <span className="bb-ws-empty-icon">👛</span>
          <div className="bb-ws-empty-k">
            <h4>Connect a wallet</h4>
            <div className="bb-muted bb-small">
              Connect to view, manage, or deploy a smart wallet.
            </div>
          </div>
          <button className="bb-btn-primary" onClick={connect}>
            Connect wallet
          </button>
        </div>
      </PageContainer>
    );
  }

  if (loading) {
    return (
      <PageContainer>
        <div className="bb-empty">
          <span className="bb-spinner" /> Loading wallets…
        </div>
      </PageContainer>
    );
  }

  if (walletCount === 0) {
    return (
      <PageContainer>
        <div className="bb-empty" style={{ padding: 28, marginBottom: 18 }}>
          <h4>No smart wallets yet</h4>
          <div className="bb-muted bb-small">Deploy your first smart wallet to get started.</div>
        </div>
        <Card>
          <CardContent>
            <DeployDiamondWidget onDeployed={navigateToWallet} />
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div style={{ marginBottom: 14 }}>
        <h2
          style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 600,
            letterSpacing: "-0.01em",
            color: "var(--bb-text)",
          }}
        >
          Smart wallets
        </h2>
        <div className="bb-muted bb-small">{walletCount} deployed</div>
      </div>
      <Card>
        <CardContent>
          <WalletSelector walletCount={walletCount!} onSelect={navigateToWallet} />
        </CardContent>
      </Card>
    </PageContainer>
  );
}
