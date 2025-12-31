import { Row } from "../../Primitives";
import { Select } from "../../Select";
import { SelectOption } from "../../Select/SelectOption";
import { WalletSelectorModalWithDisplay } from "../../Wallet/WalletSelectorModalWithDisplay";
import { UniversalActionType } from "../models";
import { IconButton } from "../../IconButton";

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
    <Row justify="between" align="center" gap="md">
      {/* LEFT — wallet */}
      <WalletSelectorModalWithDisplay
        address={walletAddress}
        onSelect={onWalletChange}
      />

      {/* CENTER — action */}
      <Row style={{ flex: 1 }} justify="center">
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
      </Row>

      {/* RIGHT — settings */}
      <IconButton
        aria-label="Settings"
        style={{
          width: 36,
          height: 36,
          fontSize: 22,
        }}
      >
        ⚙
      </IconButton>
    </Row>
  );
}
