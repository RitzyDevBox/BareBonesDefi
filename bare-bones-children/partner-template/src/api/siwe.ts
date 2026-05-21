import { ethers } from "ethers";
import { api } from "./client";

// SIWE domain — must match `window.location.host` (the frontend's own host).
// MetaMask validates this and rejects signing if the message's domain
// doesn't match where the user is currently browsing — it treats a mismatch
// as a phishing attempt. The backend's SIWE_DOMAIN env var must be set to
// this same value.
const SIWE_DOMAIN: string =
  (import.meta.env.VITE_SIWE_DOMAIN as string | undefined) ??
  window.location.host;

interface SignInArgs {
  provider: ethers.providers.Web3Provider;
  address: string;
  chainId: number;
  statement?: string;
}

/**
 * Sign-In With Ethereum (EIP-4361) — hand-rolled, no library.
 *
 * The SIWE "message" is just a multi-line text template. We build it,
 * the wallet signs it (works for EOAs via personal_sign and smart wallets
 * via EIP-1271 — backend handles both), then submit to /auth/verify.
 *
 * Returns the JWT on success. Throws ApiError on backend rejection or
 * the wallet's own error on user-rejected signature.
 */
export async function signInWithEthereum({
  provider,
  address,
  chainId,
  statement = "Sign in to BareBones.",
}: SignInArgs): Promise<string> {
  const { nonce } = await api.auth.nonce(address);

  const checksumAddress = ethers.utils.getAddress(address);
  const issuedAt = new Date().toISOString();
  const uri = window.location.origin;

  // EIP-4361 canonical format. Field order and the blank line after the
  // statement are part of the spec — don't reformat.
  const message =
    `${SIWE_DOMAIN} wants you to sign in with your Ethereum account:\n` +
    `${checksumAddress}\n` +
    `\n` +
    `${statement}\n` +
    `\n` +
    `URI: ${uri}\n` +
    `Version: 1\n` +
    `Chain ID: ${chainId}\n` +
    `Nonce: ${nonce}\n` +
    `Issued At: ${issuedAt}`;

  const signer = provider.getSigner();
  const signature = await signer.signMessage(message);

  const { jwt } = await api.auth.verify(message, signature);
  return jwt;
}
