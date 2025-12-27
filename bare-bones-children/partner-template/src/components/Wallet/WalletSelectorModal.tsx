import { WalletSelector } from "./WalletSelector";
import { Modal } from "../Modal/Modal";

export function WalletSelectorModal({
  isOpen,
  onClose,
  onSelect,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (address: string, index: number) => void;
}) {
  return (
    <Modal
      isOpen={isOpen}
      title="Select Wallet"
      onClose={onClose}
    >
      <WalletSelector
        onSelect={(address, index) => {
          onSelect(address, index);
          onClose();
        }}
      />
    </Modal>
  );
}
