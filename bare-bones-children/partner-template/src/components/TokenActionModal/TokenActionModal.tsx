/* eslint-disable @typescript-eslint/no-explicit-any */
import "./TokenActionModal.scss";

export function TokenActionModal({
  mode,              // "send" | "receive"
  tokenSymbol,
  diamondAddress,
  balanceUser,
  balanceDiamond,
  amount,
  setAmount,
  recipient,
  setRecipient,
  onClose,
  onConfirm,
}: {
  mode: "send" | "receive";
  tokenSymbol: string;
  diamondAddress: string;

  balanceUser: string;
  balanceDiamond: string;

  amount: string;
  setAmount: (v: string) => void;

  recipient: string;
  setRecipient: (v: string) => void;

  onClose: () => void;
  onConfirm: () => void;
}) {
  const isSend = mode === "send";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">
          {isSend ? `Send ${tokenSymbol}` : `Receive ${tokenSymbol}`}
        </h3>

        {/* BALANCE */}
        <p className="balance-text">
          {isSend
            ? `Wallet Balance: ${balanceDiamond} ${tokenSymbol}`
            : `Your Balance: ${balanceUser} ${tokenSymbol}`}
        </p>

        {/* AMOUNT */}
        <label className="field-label">Amount</label>
        <input
          className="input"
          type="number"
          placeholder="0.0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        {/* RECIPIENT (send only) */}
        {isSend && (
          <>
            <label className="field-label" style={{ marginTop: "12px" }}>
              Recipient Address
            </label>
            <input
              className="input"
              type="text"
              placeholder="0xRecipient..."
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
          </>
        )}

        {/* FIXED DESTINATION (receive only) */}
        {!isSend && (
          <>
            <div className="field-label" style={{ marginTop: "12px" }}>
              Wallet Destination
            </div>
            <div className="locked-address">{diamondAddress}</div>
          </>
        )}

        {/* BUTTON */}
        <button className="primary-btn" onClick={onConfirm}>
          {isSend ? "Confirm Send" : "Confirm Receive"}
        </button>
      </div>
    </div>
  );
}
