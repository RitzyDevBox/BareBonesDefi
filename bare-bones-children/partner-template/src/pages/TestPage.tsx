/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { UniversalWalletModal } from "../components/UniversalWalletModal/UniversalWalletModal";
import {
  UniversalActionType,
} from "../components/UniversalWalletModal/models";
import { ActionHandlerRouter } from "../components/UniversalWalletModal/components/ActionHandlerRouter";



const walletAddress = "0x6dc2f30d8d2b1683617aaecd98941d7e56ca61a1";
//const testTokenAddress = "0x8900e4fcd3c2e6d5400fde29719eb8b5fc811b3c";

export function TestPage() {
  const [action, setAction] = useState<UniversalActionType | null>(null);
  const [submittedValues, setSubmittedValues] = useState<any | null>(null);

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
          setAction(
            e.target.value
              ? (e.target.value as UniversalActionType)
              : null
          )
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
          onClose={() => {
            setAction(null);
            setSubmittedValues(null);
          }}
          onConfirm={(formValues) => {
            setSubmittedValues(formValues);
          }}
        />
      )}

      {action && submittedValues && (
        <ActionHandlerRouter
          action={action}
          values={submittedValues}
          walletAddress={walletAddress}
          onDone={() => {
            setAction(null);
            setSubmittedValues(null);
          }}
        />
      )}
    </div>
  );
}
