import { parseUnits, nowSec } from './utils.js';

// Simple EIP-712 "Order" (not tied to a specific protocol)
// You can point verifyingContract to your reactor or any address.
// Wallets expect v4 typed data.
export function buildOrderTypedData({
  chainId,
  verifyingContract = '0x0000000000000000000000000000000000000000',
  maker,
  tokenIn, decIn, amtIn,
  tokenOut, decOut, amtOut,
  recipient,
  deadlineSec
}) {
  const deadline = nowSec() + Number(deadlineSec);

  const types = {
    Order: [
      { name: 'maker', type: 'address' },
      { name: 'tokenIn', type: 'address' },
      { name: 'amountIn', type: 'uint256' },
      { name: 'decimalsIn', type: 'uint8' },
      { name: 'tokenOut', type: 'address' },
      { name: 'amountOut', type: 'uint256' },
      { name: 'decimalsOut', type: 'uint8' },
      { name: 'recipient', type: 'address' },
      { name: 'deadline', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
    ],
  };

  const message = {
    maker,
    tokenIn,
    amountIn: parseUnits(amtIn, Number(decIn)).toString(),
    decimalsIn: Number(decIn),
    tokenOut,
    amountOut: parseUnits(amtOut, Number(decOut)).toString(),
    decimalsOut: Number(decOut),
    recipient,
    deadline,
    nonce: BigInt(Date.now()).toString(), // naive nonce for demo
  };

  const domain = {
    name: 'BareBonesOrder',
    version: '1',
    chainId,
    verifyingContract,
  };

  return { domain, types, primaryType: 'Order', message };
}

export async function signTypedData(from, typed, provider) {
  if (!provider) throw new Error('No provider');
  const payload = JSON.stringify(typed);
  const tryMethods = ['eth_signTypedData_v4', 'eth_signTypedData_v3', 'eth_signTypedData'];
  for (const method of tryMethods) {
  try {
    return await provider.request({ method, params: [from, payload] });
  } catch (_) { /* try next */ }
  }
  throw new Error('Typed data signing not supported by this wallet');
}