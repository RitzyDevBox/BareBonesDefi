import { useState } from "react";
import { ethers } from "ethers";
import { useShimWallet } from "../hooks/useShimWallet";

import { Modal } from "../components/Modal/Modal";
import {
  ButtonPrimary,
  Card,
  CardContent,
  Text,
} from "../components/BasicComponents";

import { useMultiContractMultiCall } from "../hooks/useMultiContractMultiCall";
import ERC20_ABI from "../abis/ERC20.json";
import { getAddress } from "ethers/lib/utils";
import { MULTICALL3_ADDRESS } from "../constants/misc";

const TOKEN_ADDRESSES = [
  "0x5555555555555555555555555555555555555555",
  "0x8900e4fcd3c2e6d5400fde29719eb8b5fc811b3c",
];

export function TestPage() {
  const { provider, account } = useShimWallet();

  const [open, setOpen] = useState(false);

  // grid state
  const [rows, setRows] = useState(2);
  const [cols, setCols] = useState(2);

  const cells = Array.from({ length: rows * cols });

  const { data, loading } = useMultiContractMultiCall<{
    symbol: string;
    decimals: number;
    balance: ethers.BigNumber;
  }>({
    contracts: TOKEN_ADDRESSES.map((address) => ({
      address,
      abiKey: "erc20",
    })),
    abiMap: {
      erc20: ERC20_ABI,
    },
    calls: [
      { fn: "symbol", as: "symbol" },
      { fn: "decimals", as: "decimals" },
      {
        fn: "balanceOf",
        as: "balance",
        args: account ? [getAddress(account)] : undefined,
      },
    ],
    provider,
    multicall3: MULTICALL3_ADDRESS,
    deps: [account],
  });

  return (
    <Card style={{ maxWidth: "min(90vw, 600px)", margin: "0 auto" }}>
      <CardContent>
        <Text.Title>Modal Resize Test</Text.Title>

        <ButtonPrimary onClick={() => setOpen(true)}>
          Open Modal
        </ButtonPrimary>

        <ButtonPrimary
          style={{ width: "auto" }}
          disabled={!account || loading}
          onClick={() => {
            console.log("Multicall results:", data);
          }}
        >
          Fetch Token Balances
        </ButtonPrimary>
      </CardContent>

      <Modal
        isOpen={open}
        title="Auto Resize Test"
        onClose={() => setOpen(false)}
      >
        {/* GRID */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, 60px)`,
            gap: "8px",
          }}
        >
          {cells.map((_, i) => (
            <div
              key={i}
              style={{
                width: "60px",
                height: "60px",
                background: "var(--colors-primary)",
                borderRadius: "var(--radius-md)",
              }}
            />
          ))}
        </div>

        {/* CONTROLS */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            marginTop: "16px",
            flexWrap: "wrap",
          }}
        >
          <ButtonPrimary
            style={{ width: "auto" }}
            onClick={() => setRows((r) => r + 1)}
          >
            Add Row
          </ButtonPrimary>

          <ButtonPrimary
            style={{ width: "auto" }}
            onClick={() => setRows((r) => Math.max(1, r - 1))}
          >
            Remove Row
          </ButtonPrimary>

          <ButtonPrimary
            style={{ width: "auto" }}
            onClick={() => setCols((c) => c + 1)}
          >
            Add Column
          </ButtonPrimary>

          <ButtonPrimary
            style={{ width: "auto" }}
            onClick={() => setCols((c) => Math.max(1, c - 1))}
          >
            Remove Column
          </ButtonPrimary>
        </div>
      </Modal>
    </Card>
  );
}
