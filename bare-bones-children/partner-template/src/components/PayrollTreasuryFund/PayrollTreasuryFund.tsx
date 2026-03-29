import { useCallback, useMemo, useState, useEffect } from "react";
import { ethers } from "ethers";
import MockERC20ABI from "../../abis/paymentPipelines/MockERC20.abi.json";
import PayrollTreasuryABI from "../../abis/paymentPipelines/PayrollTreasury.abi.json";
import PayrollManagerABI from "../../abis/paymentPipelines/PayrollManager.abi.json";
import { Card, CardContent } from "../BasicComponents";
import { ButtonPrimary } from "../Button/ButtonPrimary";
import { NumberInput } from "../Inputs/NumberInput";
import { Stack, Row } from "../Primitives";
import { Text } from "../Primitives/Text";
import { useWalletProvider } from "../../hooks/useWalletProvider";
import { useExecuteRawTx } from "../../hooks/useExecuteRawTx";
import { useTxRefresh } from "../../providers/TxRefreshProvider";
import { getBareBonesConfiguration } from "../../constants/misc";

const DEFAULT_DECIMALS = 18;

interface PayrollTreasuryFundProps {
  organizationSlug: string;
  disabled?: boolean;
}

export function PayrollTreasuryFund({
  organizationSlug,
  disabled = false,
}: PayrollTreasuryFundProps) {
  const { account, chainId, provider } = useWalletProvider();
  const { version } = useTxRefresh();

  const [amount, setAmount] = useState<string>("");
  const [treasuryBalance, setTreasuryBalance] = useState<string>("0");
  const [userBalance, setUserBalance] = useState<string>("0");
  const [loadingBalance, setLoadingBalance] = useState(false);

  const config = useMemo(() => {
    if (!chainId) return null;
    return getBareBonesConfiguration(chainId);
  }, [chainId]);

  const mockERC20Address = config?.mockPaymentTokenAddress || "0x0000000000000000000000000000000000000000";
  const payrollManagerAddress = config?.payrollManagerAddress || "";
  // Use config as initial fallback; resolved dynamically from manager.treasury() below
  const [resolvedTreasuryAddress, setResolvedTreasuryAddress] = useState<string>(
    config?.payrollTreasuryAddress || "0x0000000000000000000000000000000000000000"
  );

  const iface = useMemo(
    () => new ethers.utils.Interface(MockERC20ABI as any),
    []
  );

  const treasuryIface = useMemo(
    () => new ethers.utils.Interface(PayrollTreasuryABI as any),
    []
  );

  // Fetch treasury and user balances
  useEffect(() => {
    if (!organizationSlug || !provider || !payrollManagerAddress) return;

    fetchBalances();
  }, [organizationSlug, provider, payrollManagerAddress, account, mockERC20Address, version]);

  async function fetchBalances() {
    if (!provider || !payrollManagerAddress) return;

    setLoadingBalance(true);
    try {
      // Resolve the actual treasury address from the PayrollManager contract
      const manager = new ethers.Contract(payrollManagerAddress, PayrollManagerABI as any, provider);
      const actualTreasuryAddress: string = await manager.treasury();
      setResolvedTreasuryAddress(actualTreasuryAddress);

      // Fetch treasury balance
      if (actualTreasuryAddress && actualTreasuryAddress !== ethers.constants.AddressZero) {
        const treasuryContract = new ethers.Contract(
          actualTreasuryAddress,
          PayrollTreasuryABI as any,
          provider
        );

        const slugBytes = ethers.utils.formatBytes32String(organizationSlug);
        const treasuryBal = await treasuryContract.balanceOf(slugBytes);
        setTreasuryBalance(
          ethers.utils.formatUnits(treasuryBal, DEFAULT_DECIMALS)
        );
      }

      // Fetch user's mock token balance
      if (account && mockERC20Address) {
        const tokenContract = new ethers.Contract(
          mockERC20Address,
          MockERC20ABI as any,
          provider
        );

        const userBal = await tokenContract.balanceOf(account);
        setUserBalance(
          ethers.utils.formatUnits(userBal, DEFAULT_DECIMALS)
        );
      }
    } catch (err) {
      console.error("Error fetching balances:", err);
      setTreasuryBalance("0");
      setUserBalance("0");
    } finally {
      setLoadingBalance(false);
    }
  }

  // For the deposit, we need to approve first, then deposit
  const buildApproveTx = useCallback(
    (_chainId: number, _org: string, amountStr: string) => {
      if (!amountStr) throw new Error("Missing amount");

      const parsed = ethers.utils.parseUnits(amountStr, DEFAULT_DECIMALS);

      return {
        to: mockERC20Address,
        data: iface.encodeFunctionData("approve", [resolvedTreasuryAddress, parsed]),
      } as any;
    },
    [iface, mockERC20Address, resolvedTreasuryAddress]
  );

  const buildFinalDepositTx = useCallback(
    (_chainId: number, _org: string, amountStr: string) => {
      if (!amountStr) throw new Error("Missing amount");

      const parsed = ethers.utils.parseUnits(amountStr, DEFAULT_DECIMALS);
      const slugBytes = ethers.utils.formatBytes32String(organizationSlug);

      return {
        to: resolvedTreasuryAddress,
        data: treasuryIface.encodeFunctionData("deposit", [
          slugBytes,
          parsed,
        ]),
      } as any;
    },
    [organizationSlug, treasuryIface, resolvedTreasuryAddress]
  );

  const approve = useExecuteRawTx(
    buildApproveTx,
    (_chain: number, _org: string, _amount: string) =>
      `Approved ${_amount} tokens for treasury`
  );

  const deposit = useExecuteRawTx(
    buildFinalDepositTx,
    (_chain: number, _org: string, _amount: string) =>
      `Deposited ${_amount} to treasury for ${organizationSlug}`
  );

  async function handleDepositFunds() {
    if (!chainId || !amount || disabled || !organizationSlug) return;

    try {
      // Step 1: Approve
      await approve(chainId, organizationSlug, amount);

      // Step 2: Deposit
      await deposit(chainId, organizationSlug, amount);

      setAmount("");
      // Balance will refresh automatically via version change from useTxRefresh
    } catch (err) {
      console.error("Error depositing funds:", err);
    }
  }

  return (
    <Card>
      <CardContent>
        <Stack>
          <Text.Title>Payroll Treasury</Text.Title>

          <Row gap="sm" align="center">
            <Text.Label>Your Balance:</Text.Label>
            {loadingBalance ? (
              <Text.Body color="muted">Loading...</Text.Body>
            ) : (
              <Text.Body color="secondary" weight={600}>
                {userBalance} tokens
              </Text.Body>
            )}
          </Row>

          <Row gap="sm" align="center">
            <Text.Label>Treasury Balance:</Text.Label>
            {loadingBalance ? (
              <Text.Body color="muted">Loading...</Text.Body>
            ) : (
              <Text.Body color="success" weight={600}>
                {treasuryBalance} tokens
              </Text.Body>
            )}
          </Row>

          <Stack>
            <Text.Label>Deposit Amount</Text.Label>
            <NumberInput
              value={amount}
              onChange={(e) => setAmount((e.target as HTMLInputElement).value)}
              placeholder="0.0"
              disabled={disabled}
            />
          </Stack>

          <ButtonPrimary
            onClick={handleDepositFunds}
            disabled={!amount || disabled || !organizationSlug}
          >
            Supply Treasury
          </ButtonPrimary>
        </Stack>
      </CardContent>
    </Card>
  );
}
