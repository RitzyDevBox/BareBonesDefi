/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { ethers } from "ethers";
import { useShimWallet } from "../hooks/useShimWallet";

const FACTORY_ADDRESS = "0xA2156c50c876cA57efF74f1646bC642a74e06a64";

const FACTORY_ABI = [
  {
    name: "deployDiamond",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "seed", type: "uint256" }],
    outputs: [{ name: "diamond", type: "address" }],
  },
  {
    anonymous: false,
    type: "event",
    name: "DiamondDeployed",
    inputs: [
      { indexed: true, name: "user", type: "address" },
      { indexed: true, name: "seed", type: "uint256" },
      { indexed: false, name: "diamond", type: "address" },
    ],
  },
];

export function DeployDiamondPage() {
  const { provider } = useShimWallet();
  const [seed, setSeed] = useState("");
  const [log, setLog] = useState("");

  const appendLog = (msg: any) =>
    setLog((l) => l + (typeof msg === "string" ? msg : JSON.stringify(msg, null, 2)) + "\n");

  async function deploy() {
    try {
      if (!provider) throw new Error("No provider found");

      const signer = provider.getSigner();
      const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, signer);

      const finalSeed = seed || "0";
      appendLog(`Deploying diamond with seed: ${finalSeed}`);

      const tx = await factory.deployDiamond(finalSeed);
      appendLog(`Tx sent: ${tx.hash}`);

      const receipt = await tx.wait();
      appendLog("Tx confirmed!");

      // Try reading event
      const event = receipt.logs
        .map((l: any) => {
          try {
            return factory.interface.parseLog(l);
          } catch {
            return null;
          }
        })
        .find((x: any) => x && x.name === "DiamondDeployed");

      if (event) {
        appendLog(`New Diamond: ${event.args.diamond}`);
      }

      appendLog(receipt);
    } catch (e: any) {
      appendLog("Error: " + e.message);
    }
  }

  // ---- Styles ----
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
        Deploy Diamond Wallet
      </h2>

      <label style={label}>Seed (any number)</label>
      <input
        style={input}
        value={seed}
        onChange={(e) => setSeed(e.target.value)}
        placeholder="123"
        type="number"
      />

      <button style={button} onClick={deploy}>
        Deploy Diamond
      </button>

      <pre style={logBox}>{log}</pre>
    </div>
  );
}
