import { useState } from "react";
import { ethers } from "ethers";
import { useShimWallet } from "../hooks/useShimWallet";

import { Modal, UXMode } from "../components/Modal/Modal";
import {
  ButtonPrimary,
  Card,
  CardContent,
  Text,
  Box
} from "../components/BasicComponents";

import { useMultiContractMultiCall } from "../hooks/useMultiContractMultiCall";
import ERC20_ABI from "../abis/ERC20.json";
import { getAddress } from "ethers/lib/utils";
import { MULTICALL3_ADDRESS } from "../constants/misc";
import { Input } from "../components/BasicComponents";
import {
  ToastBehavior,
  ToastPosition,
  ToastType,
} from "../components/Toasts/toast.types";
import { toastStore } from "../components/Toasts/toast.store";

import { VirtualizedList } from "../components/VirtualizedList/VirtualizedList";

const TOKEN_ADDRESSES = [
  "0x5555555555555555555555555555555555555555",
  "0x8900e4fcd3c2e6d5400fde29719eb8b5fc811b3c",
];

interface FakeToken {
  id: number;
  symbol: string;
  name: string;
}

const FAKE_TOKENS: FakeToken[] = Array.from({ length: 500 }, (_, i) => ({
  id: i,
  symbol: `TOK${i}`,
  name: `Fake Token ${i}`,
}));

export function TokenRow({
  token,
  onSelect,
}: {
  token: FakeToken;
  onSelect: (token: FakeToken) => void;
}) {
  return (
    <Box
      onClick={() => onSelect(token)}
      style={{
        width: "100%",
        boxSizing: "border-box",
        padding: "var(--spacing-md)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        cursor: "pointer",
        borderBottom: "1px solid var(--colors-border)",
        background: "transparent",
      }}
    >
      {/* Left */}
      <div
        style={{
          minWidth: 0, // 🔑 prevents flex overflow
          display: "flex",
          flexDirection: "column",
          gap: "2px",
        }}
      >
        <div
          style={{
            fontWeight: 600,
            color: "var(--colors-text-main)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {token.symbol}
        </div>

        <div
          style={{
            color: "var(--colors-text-muted)",
            fontSize: "0.9em",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {token.name}
        </div>
      </div>

      {/* Right (reserved for balance / actions later) */}
      <div
        style={{
          marginLeft: "var(--spacing-md)",
          flexShrink: 0,
          color: "var(--colors-text-muted)",
          fontSize: "0.9em",
        }}
      >
        {/* empty for now */}
      </div>
    </Box>
  );
}



export function TestPage() {
  const { provider, account } = useShimWallet();

  const [open, setOpen] = useState(false);

  // grid state
  const [rows, setRows] = useState(2);
  const [cols, setCols] = useState(2);

  const [toastType, setToastType] = useState<ToastType>(ToastType.Success);
  const [toastBehavior, setToastBehavior] = useState<ToastBehavior>(
    ToastBehavior.AutoClose
  );
  const [toastPosition, setToastPosition] = useState<ToastPosition>(
    ToastPosition.Top
  );
  const [toastDurationMs, setToastDurationMs] = useState(5000);
  const [toastClickable, setToastClickable] = useState(false);
  const [tokenModalOpen, setTokenModalOpen] = useState(false);

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

  return (<>
    <Card style={{ maxWidth: "min(90vw, 600px)", margin: "0 auto" }}>
      <CardContent>
        <Text.Title>Modal Resize Test</Text.Title>

        <ButtonPrimary onClick={() => setOpen(true)}>
          Open Modal
        </ButtonPrimary>

        <ButtonPrimary onClick={() => setTokenModalOpen(true)}>
          Open Token Select Test
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
        <hr style={{ width: "100%" }} />

        <Text.Title>Toast Playground</Text.Title>

        <Text.Label>Type</Text.Label>
        <select
          value={toastType}
          onChange={(e) => setToastType(e.target.value as ToastType)}
        >
          {Object.values(ToastType).map(v => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>

        <Text.Label>Behavior</Text.Label>
        <select
          value={toastBehavior}
          onChange={(e) => setToastBehavior(e.target.value as ToastBehavior)}
        >
          {Object.values(ToastBehavior).map(v => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>

        <Text.Label>Position</Text.Label>
        <select
          value={toastPosition}
          onChange={(e) => setToastPosition(e.target.value as ToastPosition)}
        >
          {Object.values(ToastPosition).map(v => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>

        {toastBehavior === ToastBehavior.AutoClose && (
          <>
            <Text.Label>Duration (ms)</Text.Label>
            <Input
              type="number"
              value={toastDurationMs}
              onChange={(e) => setToastDurationMs(Number(e.target.value))}
            />
          </>
        )}

        <label style={{ display: "flex", gap: 8 }}>
          <input
            type="checkbox"
            checked={toastClickable}
            onChange={(e) => setToastClickable(e.target.checked)}
          />
          Click opens modal / action
        </label>

        <ButtonPrimary
          onClick={() =>
            toastStore.show({
              id: crypto.randomUUID(),
              title: "Test Toast",
              message: "Configured from TestPage",
              type: toastType,
              behavior: toastBehavior,
              durationMs: toastDurationMs,
              position: toastPosition,
              onClick: toastClickable
                ? () => alert("Toast clicked")
                : undefined,
            })
          }
        >
          Show Toast
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
      <Modal
        isOpen={tokenModalOpen}
        title="Token Select (Virtualized)"
        onClose={() => setTokenModalOpen(false)}
        uxMode={UXMode.FixedBody}
      >
        <VirtualizedList
          items={FAKE_TOKENS}
          estimateItemHeight={64}
          filterFn={(t, q) =>
            t.symbol.toLowerCase().includes(q) ||
            t.name.toLowerCase().includes(q)
          }
          renderRow={(token) => (
            <TokenRow
              token={token}
              onSelect={(t) => {
                console.log("Selected token:", t);
                setTokenModalOpen(false);
              }}
            />
          )}
        />
      </Modal>
    </Card>
    </>
  );
}
