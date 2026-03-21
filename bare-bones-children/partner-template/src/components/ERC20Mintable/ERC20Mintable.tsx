import React, { useCallback, useMemo, useState } from "react";
import { ethers } from "ethers";
import MockERC20ABI from "../../abis/paymentPipelines/MockERC20.abi.json";
import { Card, CardContent } from "../BasicComponents";
import { ButtonPrimary } from "../Button/ButtonPrimary";
import { NumberInput } from "../Inputs/NumberInput";
import { AddressInput } from "../Inputs/AddressInput";
import { Stack, Row } from "../Primitives";
import { Text } from "../Primitives/Text";
import { useWalletProvider } from "../../hooks/useWalletProvider";
import { useExecuteRawTx } from "../../hooks/useExecuteRawTx";
import { getBareBonesConfiguration } from "../../constants/misc";

const MAX_MINT = 1_000_000_000; // limit per mint (human units)
const DEFAULT_DECIMALS = 18;

export function ERC20Mintable() {
  const { account, chainId } = useWalletProvider();

  const [recipient, setRecipient] = useState<string | undefined>(undefined);
  const [amount, setAmount] = useState<string>("");
  const [decimals] = useState<number>(DEFAULT_DECIMALS);

  const config = useMemo(() => {
    if (!chainId) return null;
    return getBareBonesConfiguration(chainId);
  }, [chainId]);

  const mockERC20Address = config?.mockPaymentTokenAddress || "0x0000000000000000000000000000000000000000";

  const iface = useMemo(() => new ethers.utils.Interface(MockERC20ABI as any), []);

  const buildMintRawTx = useCallback(
    (_: number, to: string, amountStr: string) => {
      if (!to) throw new Error("Missing recipient");

      const parsed = ethers.utils.parseUnits(amountStr || "0", decimals);

      return {
        to: mockERC20Address,
        data: iface.encodeFunctionData("mint", [to, parsed]),
      } as any;
    },
    [decimals, iface, mockERC20Address]
  );

  const mint = useExecuteRawTx(buildMintRawTx, 
    (_chain: number, _to: string, _amount: string) => `Minted ${_amount} to ${_to}`
  );

  function handleMint() {
    if (!chainId) return;
    const to = (recipient && recipient.trim()) || account || "";
    if (!to) return;

    mint(chainId, to, amount);
  }

  return (
    <Card style={{ width: 420 }}>
      <CardContent>
        <Stack>
          <Text.Title>Mint Mock ERC20</Text.Title>

          <Text.Body color="muted">Token contract: {mockERC20Address}</Text.Body>

          <Stack>
            <Text.Label>Recipient</Text.Label>
            <AddressInput
              value={recipient ?? account ?? ""}
              onChange={(e) => setRecipient((e.target as HTMLInputElement).value)}
              placeholder={account ?? "0x…"}
            />
          </Stack>

          <Stack>
            <Text.Label>Amount</Text.Label>
            <NumberInput
              value={amount}
              onChange={(e) => setAmount((e.target as HTMLInputElement).value)}
              allowDecimal={true}
              allowNegative={false}
              max={MAX_MINT}
              min={0}
              maxDecimals={18}
              placeholder="0"
            />
          </Stack>

          <Row>
            <ButtonPrimary
              onClick={handleMint}
              disabled={!amount}
            >
              Mint
            </ButtonPrimary>
          </Row>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default ERC20Mintable;