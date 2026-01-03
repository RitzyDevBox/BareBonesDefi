import { WalletSelector } from "./WalletSelector";
import { Modal } from "../Modal/Modal";
import { Text } from "../Primitives/Text";
import { useUserWalletCount } from "../../hooks/wallet/useUserWalletCount";
import { ButtonPrimary } from "../Button/ButtonPrimary";
import { useWalletProvider } from "../../hooks/useWalletProvider";


export function WalletSelectorModal({
  isOpen,
  onClose,
  onSelect,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (address: string, index: number) => void;
}) {
  const { count, loading, connected } = useUserWalletCount();
  const { connect } = useWalletProvider();

  // If not connected, show the Connect Wallet button
  if (!connected) {
    return (
      <Modal isOpen={isOpen} title="Select Wallet" onClose={onClose}>
        <Text.Body>Wallet not connected.</Text.Body>
        <ButtonPrimary onClick={connect}>
          Connect Wallet
        </ButtonPrimary>
      </Modal>
    );
  }

  // If loading, show loading state
  if (loading) {
    return (
      <Modal isOpen={isOpen} title="Select Wallet" onClose={onClose}>
        <Text.Body>Loading wallets…</Text.Body>
      </Modal>
    );
  }

  // If data is available (connected and loaded), show the WalletSelector
  return (
    <Modal isOpen={isOpen} title="Select Wallet" onClose={onClose}>
      <WalletSelector
        walletCount={count!}
        onSelect={(address, index) => {
          onSelect(address, index);
          onClose();
        }}
      />
    </Modal>
  );
}
