import { useCallback, useMemo, useState, useEffect } from "react";
import { ethers } from "ethers";
import MockERC20ABI from "../../abis/paymentPipelines/MockERC20.abi.json";
import PayrollTreasuryABI from "../../abis/paymentPipelines/PayrollTreasury.abi.json";
import PayrollManagerABI from "../../abis/paymentPipelines/PayrollManager.abi.json";
import { Card, CardContent } from "../BasicComponents";
import { ButtonPrimary } from "../Button/ButtonPrimary";
import { CopyButton } from "../Button/Actions/CopyButton";
import { NumberInput } from "../Inputs/NumberInput";
import { Stack, Row } from "../Primitives";
import { Text } from "../Primitives/Text";
import { useWalletProvider } from "../../hooks/useWalletProvider";
import { useExecuteRawTx } from "../../hooks/useExecuteRawTx";
import { useTxRefresh } from "../../providers/TxRefreshProvider";
import { getBareBonesConfiguration } from "../../constants/misc";
import { shortAddress } from "../../utils/formatUtils";
import { Loader } from "../Loader/Loader";

const DEFAULT_DECIMALS = 18;

interface PayrollTreasuryFundProps {
  organizationSlug: string;
  disabled?: boolean;
}

function formatTokenBalance(value: string, maxDecimals = 4) {
  if (!value) return "0";
  const [whole, fraction = ""] = value.split(".");
  const trimmedFraction = fraction.slice(0, maxDecimals).replace(/0+$/, "");
  return trimmedFraction ? `${whole}.${trimmedFraction}` : whole;
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
  const [isDepositing, setIsDepositing] = useState(false);

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
    if (!chainId || !amount || disabled || !organizationSlug || !provider || !account || isDepositing) return;

    setIsDepositing(true);
    try {
      const parsed = ethers.utils.parseUnits(amount, DEFAULT_DECIMALS);

      // Only approve if current allowance is insufficient
      const tokenContract = new ethers.Contract(mockERC20Address, MockERC20ABI as any, provider);
      const currentAllowance: ethers.BigNumber = await tokenContract.allowance(account, resolvedTreasuryAddress);

      if (currentAllowance.lt(parsed)) {
        await approve(chainId, organizationSlug, amount);
      }

      // Deposit
      await deposit(chainId, organizationSlug, amount);

      setAmount("");
    } catch (err) {
      console.error("Error depositing funds:", err);
    } finally {
      setIsDepositing(false);
    }
  }

  return (
    <Card style={{ width: "100%", height: "100%" }}>
      <CardContent style={{ height: "100%" }}>
        <Stack style={{ height: "100%" }}>
          <Text.Title>Payroll Treasury</Text.Title>

          <Stack style={{ flex: 1, justifyContent: "flex-end", paddingTop: "var(--spacing-lg)" }}>
            <Stack>
              <Row gap="sm" align="center" wrap>
                <Text.Label>Treasury:</Text.Label>
                <Text.Body size="sm" color="muted">
                  {shortAddress(resolvedTreasuryAddress)}
                </Text.Body>
                <CopyButton value={resolvedTreasuryAddress} ariaLabel="Copy treasury address" />
              </Row>

              <Row gap="sm" align="center">
                <Text.Label>Your Balance:</Text.Label>
                {loadingBalance ? (
                  <Loader inline label="Loading" size={14} />
                ) : (
                  <Text.Body color="secondary" weight={600}>
                    {formatTokenBalance(userBalance)} tokens
                  </Text.Body>
                )}
              </Row>

              <Row gap="sm" align="center">
                <Text.Label>Treasury Balance:</Text.Label>
                {loadingBalance ? (
                  <Loader inline label="Loading" size={14} />
                ) : (
                  <Text.Body color="success" weight={600}>
                    {formatTokenBalance(treasuryBalance)} tokens
                  </Text.Body>
                )}
              </Row>
            </Stack>

            <Stack>
              <Text.Label>Deposit Amount</Text.Label>
              <NumberInput
                value={amount}
                onChange={(e) => setAmount((e.target as HTMLInputElement).value)}
                placeholder="0.0"
                disabled={disabled}
              />

              <ButtonPrimary
                onClick={handleDepositFunds}
                disabled={!amount || disabled || !organizationSlug || isDepositing}
                style={{ minWidth: 164 }}
              >
                {isDepositing ? <Loader inline size={14} color="currentColor" /> : null}
                Supply Treasury
              </ButtonPrimary>
            </Stack>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
