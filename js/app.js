import { bindTabs, setNetBadge, setConnectState } from './ui.js';
import { hasProvider, connect, onAccountsChanged, onChainChanged, sendNative, sendTx } from './eth.js';
import { buildErc20Tx } from './erc20.js';
import { buildOrderTypedData, signTypedData } from './orders.js';
import { getProvider } from './eth.js';
import { parseUnits, shortAddr } from './utils.js';

let state = {
  address: null,
  chainId: null,
};

function networkName(id) {
  // add your favorites here
  const map = {
    1: 'Ethereum',
    10: 'OP',
    137: 'Polygon',
    8453: 'Base',
    999: 'HyperEVM',
  };
  return map[id] || `Chain ${id}`;
}

async function handleConnect() {
  try {
    const { address, chainId } = await connect();
    state.address = address;
    state.chainId = chainId;
    setConnectState(true, address);
    setNetBadge(`${networkName(chainId)} • ${shortAddr(address)}`);
    const recip = document.getElementById('ordRecipient');
    if (recip && !recip.value) recip.value = address;
  } catch (e) {
    alert(e.message || String(e));
  }
}

function wireSendNative() {
  const btn = document.getElementById('sendNativeBtn');
  btn.addEventListener('click', async () => {
    const to = document.getElementById('nativeTo').value.trim();
    const amt = document.getElementById('nativeAmount').value.trim();
    const out = document.getElementById('nativeResult');
    try {
      if (!state.address) throw new Error('Connect wallet first');
      const hash = await sendNative(state.address, to, amt);
      out.textContent = `tx: ${hash}`;
    } catch (e) {
      out.textContent = `error: ${e.message || e}`;
    }
  });
}

function wireSendErc20() {
  const btn = document.getElementById('sendErc20Btn');
  btn.addEventListener('click', async () => {
    const token = document.getElementById('erc20Token').value.trim().toLowerCase();
    const to = document.getElementById('erc20To').value.trim();
    const amt = document.getElementById('erc20Amount').value.trim();
    const decimals = Number(document.getElementById('erc20Decimals').value || '18');
    const out = document.getElementById('erc20Result');
    try {
      if (!state.address) throw new Error('Connect wallet first');
      const tx = await buildErc20Tx(state.address, token, to, amt, decimals);
      const hash = await sendTx(tx);
      out.textContent = `tx: ${hash}`;
    } catch (e) {
      out.textContent = `error: ${e.message || e}`;
    }
  });
}

function wireOrderSign() {
  const btn = document.getElementById('signOrderBtn');
  btn.addEventListener('click', async () => {
    const tokenIn = document.getElementById('ordTokenIn').value.trim();
    const decIn = Number(document.getElementById('ordDecIn').value || '18');
    const amtIn = document.getElementById('ordAmtIn').value.trim();
    const tokenOut = document.getElementById('ordTokenOut').value.trim();
    const decOut = Number(document.getElementById('ordDecOut').value || '6');
    const amtOut = document.getElementById('ordAmtOut').value.trim();
    const recipient = document.getElementById('ordRecipient').value.trim();
    const deadlineMin = Number(document.getElementById('ordDeadlineMin').value || '60');
    const verifier = document.getElementById('ordVerifier').value.trim() || '0x0000000000000000000000000000000000000000';
    const out = document.getElementById('orderPreview');

    try {
      if (!state.address || !state.chainId) throw new Error('Connect wallet first');

      const typed = buildOrderTypedData({
        chainId: state.chainId,
        verifyingContract: verifier,
        maker: state.address,
        tokenIn, decIn, amtIn,
        tokenOut, decOut, amtOut,
        recipient,
        deadlineSec: deadlineMin * 60,
      });

      const signature = await signTypedData(state.address, typed, getProvider());
      const payload = { typed, signature };

      out.textContent = JSON.stringify(payload, null, 2);
    } catch (e) {
      out.textContent = `error: ${e.message || e}`;
    }
  });
}

function boot() {
  bindTabs();
  setConnectState(false);
  setNetBadge('Not connected');

  document.getElementById('connectBtn').addEventListener('click', handleConnect);

  wireSendNative();
  wireSendErc20();
  wireOrderSign();

  if (!hasProvider()) {
    alert('No wallet detected. Please install a wallet with window.ethereum support (e.g. MetaMask).');
  } else {
    onAccountsChanged(() => window.location.reload());
    onChainChanged(() => window.location.reload());
  }
}

boot();
