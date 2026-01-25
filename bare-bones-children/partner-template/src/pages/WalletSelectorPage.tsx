import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "../components/BasicComponents";
import { Text } from "../components/Primitives/Text"
import { PageContainer } from "../components/PageWrapper/PageContainer";
import { WalletSelector } from "../components/Wallet/WalletSelector";
import { DeployDiamondWidget } from "../components/DeployWalletWidget";
import { useUserWalletCount } from "../hooks/wallet/useUserWalletCount";
import { useWalletProvider } from "../hooks/useWalletProvider";
import { ButtonPrimary } from "../components/Button/ButtonPrimary";
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
        <Card>
          <CardContent>
            <ButtonPrimary onClick={connect}>
                Connect Wallet
            </ButtonPrimary>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  // ⏳ Connected but loading
  if (loading) {
    return (
      <PageContainer>
        <Card>
          <CardContent>
            <Text.Body>Loading wallets…</Text.Body>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  if (walletCount === 0) {
    return (
      <PageContainer>
        <Card>
          <CardContent>
            <DeployDiamondWidget onDeployed={navigateToWallet}/>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Card>
        <CardContent>
          <Text.Title style={{ textAlign: "left" }}>
              Select Wallet
          </Text.Title>

          <WalletSelector
            walletCount={walletCount!}
            onSelect={navigateToWallet}/>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
