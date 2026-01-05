import SignClient from "@walletconnect/sign-client";

let clientPromise: Promise<SignClient> | null = null;

export function getWalletConnectClient(
  projectId: string
): Promise<SignClient> {
  if (!clientPromise) {
    clientPromise = SignClient.init({
      projectId,
      metadata: {
        name: "Bare Bones",
        description: "Minimal EIP-1193 Wallet",
        url: window.location.origin,
        icons: [],
      },
    });
  }

  return clientPromise;
}
