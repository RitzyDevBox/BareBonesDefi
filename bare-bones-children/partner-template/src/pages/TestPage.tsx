/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from "react";
import { UniversalWalletModal } from "../components/UniversalWalletModal/UniversalWalletModal";
import {
  AddLiquidityModalResponse,
  ReceiveModalResponse,
  RemoveLiquidityModalResponse,
  SendModalResponse,
  SwapModalResponse,
  UniversalActionType,
} from "../components/UniversalWalletModal/models";
import { useSendCurrencyCallback } from "../components/UniversalWalletModal/hooks/useSendCurrencyCallback";
import { useShimWallet } from "../hooks/useShimWallet";
import { AssetType, ZERO_ADDRESS } from "./BasicWalletFacetPage";

type ActionHandlerMap = Partial<
  Record<UniversalActionType, (values: any) => Promise<void>>
>;

const walletAddress = "0x6dc2f30d8d2b1683617aaecd98941d7e56ca61a1";
const testTokenAddress = "0x8900e4fcd3c2e6d5400fde29719eb8b5fc811b3c";
function useActionHandler(action: UniversalActionType | null) {
   const { provider } = useShimWallet();
   const { sendCurrencyCallback } = useSendCurrencyCallback(provider, walletAddress)

  const handlers = useMemo<ActionHandlerMap>(() => ({
    [UniversalActionType.SEND]: async (values: SendModalResponse) => {

      const assetType = values.asset == ZERO_ADDRESS ? AssetType.NATIVE : AssetType.ERC20
      
      const response = await sendCurrencyCallback({ 
        assetType,
        amount: "1", // values.amount
        recipient: values.recipient,
        decimals: values.assetInfo.decimals, 
        tokenSymbol: values.assetInfo.symbol,
        tokenAddress: testTokenAddress //values.asset,
      })

      console.log(response);
    },

    [UniversalActionType.RECEIVE]: async (values: ReceiveModalResponse) => {
      console.log("RECEIVE:", values);
    },

    [UniversalActionType.SWAP]: async (values: SwapModalResponse) => {
      console.log("SWAP:", values);
    },

    [UniversalActionType.ADD_V2_LP]: async (values: AddLiquidityModalResponse) => {
      console.log("ADD_V2_LP:", values);
    },

    [UniversalActionType.REMOVE_V2_LP]: async (values: RemoveLiquidityModalResponse) => {
      console.log("REMOVE_V2_LP:", values);
    },

    [UniversalActionType.TEST]: async (values: any) => {
      console.log("TEST:", values);
    },
  }), [sendCurrencyCallback]);


  return !action ? null :  (handlers[action] ?? null)
}

export function TestPage() {
  const [action, setAction] = useState<UniversalActionType | null>(null);
  const handler = useActionHandler(action);

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "480px",
        margin: "0 auto",
        padding: "24px",
        background: "#171923",
        borderRadius: "14px",
        border: "1px solid #2a2f3a",
        boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        color: "#e5e7eb",
      }}
    >
      <h2 style={{ margin: 0, marginBottom: "8px", fontSize: "18px" }}>
        Universal Modal Test Page
      </h2>

      <select
        style={{
          width: "100%",
          padding: "12px",
          borderRadius: "10px",
          border: "1px solid #2a2f3a",
          background: "#0d0f15",
          color: "#e5e7eb",
          fontSize: "14px",
        }}
        value={action ?? ""}
        onChange={(e) =>
          setAction(e.target.value ? (e.target.value as UniversalActionType) : null)
        }
      >
        <option value="">Select Action</option>
        {Object.values(UniversalActionType).map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>

      {action && (
        <UniversalWalletModal
          action={action}
          isOpen={true}
          onClose={() => setAction(null)}
          onConfirm={async (formValues) => {
            if (handler) {
              await handler(formValues);
            }
            setAction(null);
          }}
        />
      )}
    </div>
  );
}
