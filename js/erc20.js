import { strip0x, toHex, parseUnits } from './utils.js';

// ERC-20 transfer(address,uint256) -> 0xa9059cbb
const SIG_TRANSFER = 'a9059cbb';

const pad32 = (hexNo0x) => hexNo0x.padStart(64, '0');

export function encodeTransferData(to, amountBigInt) {
  const toClean = strip0x(to.toLowerCase());
  const amt = amountBigInt;
  const data =
    '0x' +
    SIG_TRANSFER +
    pad32(toClean) +
    pad32(strip0x(toHex(amt)));
  return data;
}

export async function buildErc20Tx(from, token, to, amountDecimal, decimals) {
  const value = parseUnits(amountDecimal, Number(decimals));
  const data = encodeTransferData(to, value);
  return {
    from,
    to: token,
    data,
  };
}
