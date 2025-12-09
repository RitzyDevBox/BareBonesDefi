/* eslint-disable @typescript-eslint/no-explicit-any */
import "./TokenSendModal.scss";

export function TokenSendModal({
  tokenSymbol,
  balance,
  amount,
  recipient,
  setAmount,
  setRecipient,
  onClose,
  onConfirm,
}: {
  tokenSymbol: string;
  balance: string;
  amount: string;
  recipient: string;
  setAmount: (v: string) => void;
  setRecipient: (v: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Send {tokenSymbol}</h3>

        <p className="balance-text">
          Balance: {balance} {tokenSymbol}
        </p>

        <label className="field-label">Amount</label>
        <input
          className="input"
          type="number"
          placeholder="0.0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <label className="field-label">Recipient Address</label>
        <input
          className="input"
          type="text"
          placeholder="0xRecipient..."
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
        />

        <button className="primary-btn" onClick={onConfirm}>
          Confirm Send
        </button>
      </div>
    </div>
  );
}
