// hex helpers & minimal BigInt math
export const toHex = (v) => '0x' + v.toString(16);
export const toHexPad = (v, bytes) => {
  let s = v.toString(16);
  if (s.length > bytes * 2) throw new Error('value too large');
  while (s.length < bytes * 2) s = '0' + s;
  return '0x' + s;
};
export const strip0x = (s) => (s.startsWith('0x') ? s.slice(2) : s);

export const parseUnits = (decimalStr, decimals) => {
  if (!/^\d+(\.\d+)?$/.test(String(decimalStr))) throw new Error('invalid number');
  const [ints, fracs = ''] = String(decimalStr).split('.');
  const fracPadded = (fracs + '0'.repeat(decimals)).slice(0, decimals);
  return BigInt(ints + (fracPadded || '').replace(/^$/, '0'));
};

export const nowSec = () => Math.floor(Date.now() / 1000);

export const shortAddr = (a) => a ? a.slice(0,6) + '…' + a.slice(-4) : '';
