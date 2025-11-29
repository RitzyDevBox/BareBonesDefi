/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useShimWallet } from "../hooks/useShimWallet";
import { ethers } from "ethers";

const FACTORY_ADDRESS = "0xff8D562a44C27567972fd89eDdE36880F338E5CE";

const FACTORY_ABI = [
  {
    name: "createWallet",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "owner", type: "address" },
      { name: "policyDelay", type: "uint256" },
    ],
    outputs: [{ type: "address" }],
  },
];

export function DeployWalletPage() {
  const { provider, account } = useShimWallet();
  const [owner, setOwner] = useState("");
  const [policyDelay, setPolicyDelay] = useState("0");
  const [log, setLog] = useState("");

  const appendLog = (msg: any) =>
    setLog((l) => l + (typeof msg === "string" ? msg : JSON.stringify(msg, null, 2)) + "\n");

  async function deployWallet() {
    try {
      const signer = provider!.getSigner();
      const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, signer);

      const finalOwner = owner || account;
      appendLog(`Deploying wallet for owner: ${finalOwner}`);

      const tx = await factory.createWallet(finalOwner, policyDelay);
      appendLog(`Tx sent: ${tx.hash}`);

      const receipt = await tx.wait();
      appendLog("Tx confirmed!");
      appendLog(receipt);
    } catch (e: any) {
      appendLog("Error: " + e.message);
    }
  }

  const container = {
    width: "100%",
    maxWidth: "480px",
    margin: "0 auto",
    padding: "24px",
    background: "#171923",
    borderRadius: "14px",
    border: "1px solid #2a2f3a",
    boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
    display: "flex",
    flexDirection: "column" as const,
    gap: "16px",
    color: "#e5e7eb",
    boxSizing: "border-box" as const,
  };

  const label = {
    fontSize: "14px",
    color: "#9ca3af",
  };

  const input = {
    width: "100%",
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid #2a2f3a",
    background: "#0d0f15",
    color: "#e5e7eb",
    fontSize: "14px",
    boxSizing: "border-box" as const,
  };

  const button = {
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid #2a2f3a",
    background: "#6ee7b7",
    color: "#0f1115",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "14px",
  };

  const logBox = {
    background: "#0b0e14",
    padding: "12px",
    borderRadius: "10px",
    whiteSpace: "pre-wrap" as const,
    fontSize: "13px",
    maxHeight: "250px",
    overflowY: "auto" as const,
    color: "#a7b1c2",
    marginTop: "8px",
  };

  return (
    <div style={container}>
      <h2 style={{ margin: 0, marginBottom: "8px", color: "#e5e7eb", fontSize: "18px" }}>
        Deploy Wallet
      </h2>

      <label style={label}>Owner</label>
      <input
        style={input}
        value={owner}
        onChange={(e) => setOwner(e.target.value)}
        placeholder={account || "0x..."}
      />

      <label style={label}>Policy Delay (seconds)</label>
      <input
        style={input}
        type="number"
        min="0"
        value={policyDelay}
        onChange={(e) => setPolicyDelay(e.target.value)}
      />

      <button style={button} onClick={deployWallet}>
        Deploy
      </button>

      <pre style={logBox}>{log}</pre>
    </div>
  );
}
