/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { ethers } from "ethers";
import { useShimWallet } from "../hooks/useShimWallet";

import {
  Card,
  CardContent,
  Text,
  Input,
  ButtonPrimary,
  Box,
} from "../components/BasicComponents";

const FACTORY_ADDRESS = "0xC95776A97661A21d86FA1Bb9b9fF6934E15BF1AF";

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
  const [deployedAddress, setDeployedAddress] = useState<string | null>(null);

  const appendLog = (msg: any) =>
    setLog((l) =>
      l +
      (typeof msg === "string"
        ? msg
        : JSON.stringify(msg, null, 2)) +
      "\n"
    );

  async function deploy() {
    try {
      if (!provider) throw new Error("No provider found");

      const signer = provider.getSigner();
      const factory = new ethers.Contract(
        FACTORY_ADDRESS,
        FACTORY_ABI,
        signer
      );

      const finalSeed = seed || "0";
      appendLog(`Deploying diamond with seed: ${finalSeed}`);

      const tx = await factory.deployDiamond(finalSeed);
      appendLog(`Tx sent: ${tx.hash}`);

      const receipt = await tx.wait();
      appendLog("Tx confirmed!");

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
        setDeployedAddress(event.args.diamond);
        appendLog(`New Diamond: ${event.args.diamond}`);
      }
    } catch (e: any) {
      appendLog("Error: " + e.message);
    }
  }

  return (
    <Card style={{ maxWidth: 480, margin: "0 auto" }}>
      <CardContent>
        <Text.Title style={{ textAlign: "left" }}>
          Deploy Diamond Wallet
        </Text.Title>

        {/* Seed input */}
        <Box>
          <Text.Label>Seed (any number)</Text.Label>
          <Input
            type="number"
            placeholder="123"
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
          />
        </Box>

        <ButtonPrimary onClick={deploy}>
          Deploy Diamond
        </ButtonPrimary>

        {/* Result */}
        {deployedAddress && (
          <Box
            style={{
              padding: "var(--spacing-md)",
              border: "1px solid var(--colors-border)",
              background: "var(--colors-background)",
            }}
          >
            <Text.Label>Deployed Diamond Address</Text.Label>

            <Box
              onClick={() =>
                navigator.clipboard.writeText(deployedAddress)
              }
              style={{
                marginTop: "var(--spacing-sm)",
                padding: "var(--spacing-sm)",
                borderRadius: "var(--radius-sm)",
                background: "var(--colors-surface)",
                cursor: "pointer",
                wordBreak: "break-all",
              }}
            >
              <Text.Body style={{ margin: 0 }}>
                {deployedAddress}
              </Text.Body>
            </Box>

            <a
              href={`/basic-wallet-facet/${deployedAddress}`}
              style={{
                display: "block",
                marginTop: "var(--spacing-sm)",
                color: "var(--colors-primary)",
                textDecoration: "underline",
              }}
            >
              Install Basic Wallet Module →
            </a>
          </Box>
        )}

        {/* Log */}
        <Box
          style={{
            maxHeight: 240,
            overflowY: "auto",
            background: "var(--colors-background)",
            padding: "var(--spacing-sm)",
            borderRadius: "var(--radius-sm)",
            fontSize: "0.85em",
            whiteSpace: "pre-wrap",
          }}
        >
          <Text.Body style={{ margin: 0 }}>
            {log || "—"}
          </Text.Body>
        </Box>
      </CardContent>
    </Card>
  );
}
