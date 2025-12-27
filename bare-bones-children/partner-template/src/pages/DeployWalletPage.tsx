/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useShimWallet } from "../hooks/useShimWallet";

import {
  Card,
  CardContent,
  Text,
  ButtonPrimary,
  Box,
} from "../components/BasicComponents";

import DIAMOND_FACTORY_ABI from "../abis/diamond/DiamondFactory.abi.json";
import { DIAMOND_FACTORY_ADDRESS, OWNER_AUTHORITY_RESOLVER } from "../constants/misc";

export function DeployDiamondPage() {
  const { provider, account } = useShimWallet();

  const [log, setLog] = useState("");
  const [deployedAddress, setDeployedAddress] = useState<string | null>(null);
  const [walletIndex, setWalletIndex] = useState<number | null>(null);

  const appendLog = (msg: any) =>
    setLog((l) =>
      l +
      (typeof msg === "string" ? msg : JSON.stringify(msg, null, 2)) +
      "\n"
    );

  async function deploy() {
    try {
      if (!provider || !account) throw new Error("No wallet connected");

      const signer = provider.getSigner();
      const factory = new ethers.Contract(
        DIAMOND_FACTORY_ADDRESS,
        DIAMOND_FACTORY_ABI,
        signer
      );

      appendLog("Deploying new Diamond wallet…");

      // example: EOA owner authorizer, options = abi.encode(owner)
      const options = ethers.utils.defaultAbiCoder.encode(
        ["address"],
        [account]
      );

      const tx = await factory.deployDiamond(OWNER_AUTHORITY_RESOLVER, options);
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
        .find((x: any) => x?.name === "DiamondDeployed");

      if (event) {
        setDeployedAddress(event.args.diamond);
        setWalletIndex(event.args.seed.toString()); // index
        appendLog(
          `New Diamond #${event.args.seed}: ${event.args.diamond}`
        );
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

        <ButtonPrimary onClick={deploy}>
          Deploy Wallet
        </ButtonPrimary>

        {deployedAddress && (
          <Box
            style={{
              padding: "var(--spacing-md)",
              border: "1px solid var(--colors-border)",
              background: "var(--colors-background)",
            }}
          >
            <Text.Label>
              Wallet #{walletIndex}
            </Text.Label>

            <Box
              onClick={() =>
                navigator.clipboard.writeText(deployedAddress)
              }
              style={{
                marginTop: "var(--spacing-sm)",
                padding: "var(--spacing-sm)",
                background: "var(--colors-surface)",
                cursor: "pointer",
                wordBreak: "break-all",
              }}
            >
              <Text.Body style={{ margin: 0 }}>
                {deployedAddress}
              </Text.Body>
            </Box>
          </Box>
        )}

        <Box
          style={{
            maxHeight: 240,
            overflowY: "auto",
            background: "var(--colors-background)",
            padding: "var(--spacing-sm)",
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
