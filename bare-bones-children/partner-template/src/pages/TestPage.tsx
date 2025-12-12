/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { UniversalWalletModal } from "../components/UniversalWalletModal/UniversalWalletModal";
import { UniversalActionType } from "../components/UniversalWalletModal/models";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from "react";

/**
 * Returns an action handler function based on the selected UniversalActionType.
 * The returned handler will be called with the form values.
 */
export function useActionHandler(action: UniversalActionType | null) {
  // Define handlers for each action type
  const handlers = useMemo(() => {
    return {
      [UniversalActionType.SEND]: async (values: Record<string, any>) => {
        console.log("SEND handler invoked:", values);
      },

      [UniversalActionType.RECEIVE]: async (values: Record<string, any>) => {
        console.log("RECEIVE handler invoked:", values);
      },

      [UniversalActionType.WRAP]: async (values: Record<string, any>) => {
        console.log("WRAP handler invoked:", values);
      },

      [UniversalActionType.UNWRAP]: async (values: Record<string, any>) => {
        console.log("UNWRAP handler invoked:", values);
      },

      [UniversalActionType.SWAP]: async (values: Record<string, any>) => {
        console.log("SWAP handler invoked:", values);
      },

      [UniversalActionType.ADD_V2_LP]: async (values: Record<string, any>) => {
        console.log("ADD_LIQUIDITY handler invoked:", values);
      },

      [UniversalActionType.REMOVE_V2_LP]: async (values: Record<string, any>) => {
        console.log("REMOVE_LIQUIDITY handler invoked:", values);
      },

      [UniversalActionType.MINT_NFT]: async (values: Record<string, any>) => {
        console.log("MINT_NFT handler invoked:", values);
      },

      [UniversalActionType.TRANSFER_NFT]: async (values: Record<string, any>) => {
        console.log("TRANSFER_NFT handler invoked:", values);
      },

      // Optional: test harness action
      TEST: async (values: Record<string, any>) => {
        console.log("TEST handler invoked:", values);
      }
    } as Record<string, (values: Record<string, any>) => Promise<void>>;
  }, []);

  // Memoize the selected handler
  return useMemo(() => {
    if (!action) return null;
    return handlers[action] ?? null;
  }, [action, handlers]);
}


export function TestPage() {
  const [action, setAction] = useState<UniversalActionType | null>(null);
  const handler = useActionHandler(action);

  return (
    <div style={{
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
    }}>
      <h2 style={{ margin: 0, marginBottom: "8px", fontSize: "18px" }}>
        Universal Modal Test Page
      </h2>

      {/* Dropdown to pick which action to test */}
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

      {/* Open modal when an action is selected */}
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
