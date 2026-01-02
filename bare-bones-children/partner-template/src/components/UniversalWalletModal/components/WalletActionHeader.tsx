import { Row } from "../../Primitives";
import { Select } from "../../Select";
import { SelectOption } from "../../Select/SelectOption";
import { WalletSelectorModalWithDisplay } from "../../Wallet/WalletSelectorModalWithDisplay";
import { UniversalActionType } from "../models";

interface WalletActionHeaderProps {
  walletAddress: string;
  action: UniversalActionType | null;
  onActionChange: (a: UniversalActionType | null) => void;
  onWalletChange: (address: string) => void;
}

export function WalletActionHeader({
  walletAddress,
  action,
  onActionChange,
  onWalletChange,
}: WalletActionHeaderProps) {
  return (
    <Row
      align="center"
      gap="md"
      style={{
        width: "100%",
      }}
    >
      {/* LEFT — wallet (natural width) */}
      <div style={{ flexShrink: 0 }}>
        <WalletSelectorModalWithDisplay
          address={walletAddress}
          onSelect={onWalletChange}
        />
      </div>

      {/* CENTER — action (flex, constrained) */}
      <div
        style={{
          flex: 1,
          minWidth: 0,              // 🔑 allow shrinking
          maxWidth: 420,            // 🔑 prevent runaway width
          margin: "0 auto",         // center it
        }}
      >
        <Select
          value={action}
          onChange={(v) =>
            onActionChange(v as UniversalActionType)
          }
          placeholder="Select Action"
        >
          <SelectOption value={UniversalActionType.WITHDRAW} label="Withdraw" />
          <SelectOption value={UniversalActionType.DEPOSIT} label="Deposit" />
          <SelectOption value={UniversalActionType.WRAP} label="Wrap ETH" />
          <SelectOption value={UniversalActionType.UNWRAP} label="Unwrap WETH" />
        </Select>
      </div>
    </Row>
  );
}
