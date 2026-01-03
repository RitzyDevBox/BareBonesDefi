import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "../components/BasicComponents";
import { Text } from "../components/Primitives/Text"
import { PageContainer } from "../components/PageWrapper/PageContainer";
import { WalletSelector } from "../components/Wallet/WalletSelector";
import { DeployDiamondWidget } from "../components/DeployWalletWidget";
import { useUserWalletCount } from "../hooks/wallet/useUserWalletCount";

export function WalletSelectorPage() {
  const navigate = useNavigate();
  const walletCount = useUserWalletCount();

  if (walletCount === null) {
    return (
      <PageContainer>
        <Text.Body>Loading wallets…</Text.Body>
      </PageContainer>
    );
  }

  return (
    <PageContainer>

          {walletCount === 0 ? (
            <>
              <DeployDiamondWidget
                onDeployed={(address) => {
                  navigate(`/basic-wallet-facet/${address}`);
                }}
              />
            </>
          ) : (
            <>
              <Card>
                <CardContent>
                <Text.Title style={{ textAlign: "left" }}>
                    Select Wallet
                </Text.Title>

                <WalletSelector
                    walletCount={walletCount}
                    onSelect={(address) => {
                    navigate(`/basic-wallet-facet/${address}`);
                }}/>
                </CardContent>
              </Card>
            </>
          )}

    </PageContainer>
  );
}
