import { WalletSelector } from "./WalletSelector";
import { Modal } from "../Modal/Modal";
import { Text } from "../BasicComponents";
import { useUserWalletCount } from "../../hooks/wallet/useUserWalletCount";

export function WalletSelectorModal({
  isOpen,
  onClose,
  onSelect,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (address: string, index: number) => void;
}) {
  const walletCount = useUserWalletCount();

  return (
    <Modal
      isOpen={isOpen}
      title="Select Wallet"
      onClose={onClose}
    >
      {walletCount === null ? (
        <Text.Body>Loading wallets…</Text.Body>
      ) : (
        <WalletSelector
          walletCount={walletCount}
          onSelect={(address, index) => {
            onSelect(address, index);
            onClose();
          }}
        />
      )}
    </Modal>
  );
}
