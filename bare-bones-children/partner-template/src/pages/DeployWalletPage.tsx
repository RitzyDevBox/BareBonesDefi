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
    setLog((l) => l + (typeof msg === "string" ? msg : JSON.stringify(msg)) + "\n");

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

  return (
    <div style={{ maxWidth: 420 }}>
      <h2>Deploy Wallet</h2>

      <label>Owner</label>
      <input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder={account || "0x..."} />

      <label>Policy Delay (seconds)</label>
      <input
        type="number"
        min="0"
        value={policyDelay}
        onChange={(e) => setPolicyDelay(e.target.value)}
      />

      <button onClick={deployWallet}>Deploy</button>

      <pre style={{ marginTop: 20, background: "#111", padding: 10, borderRadius: 8 }}>
        {log}
      </pre>
    </div>
  );
}
