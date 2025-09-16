// parent/js/app.js
import { bindTabs, setNetBadge, setConnectState, shortAddr } from './ui.js';

// ==== CONFIG ====
const READ_RPC_URL = "https://mainnet.infura.io/v3/YOUR_KEY";  // your canonical read endpoint
const ALLOWED_CHAINS = new Set(["0x1", "0x89", "0x3e7"]);               // mainnet, polygon (example)
const SAFE_READS = new Set([
  "eth_call",
  "eth_getBalance",
  "eth_getBlockByNumber",
  "eth_getBlockByHash",
  "eth_getTransactionByHash",
  "eth_getTransactionReceipt",
  "eth_blockNumber",
  "eth_gasPrice",
  "eth_getCode",
  "eth_getStorageAt",
  "eth_getTransactionCount",
  "eth_getLogs"
]);
const DANGEROUS_WRITES = new Set([
  "eth_sendTransaction",
  "eth_sendRawTransaction",
  "eth_sign",
  "personal_sign",
  "eth_signTypedData",
  "eth_signTypedData_v4",
  "wallet_switchEthereumChain",
  "wallet_addEthereumChain"
]);
const IDENTITY_METHODS = new Set(["eth_accounts", "eth_requestAccounts", "eth_chainId", "net_version"]);

// Track child
const iframe = document.getElementById('tenantFrame');
const tenants = new Map(); // contentWindow => { origin }

function networkNameHex(hexId) {
  const id = parseInt(hexId, 16);
  const map = { 1: 'Ethereum', 137: 'Polygon', 10: 'OP', 8453: 'Base', 999: 'HyperEVM' };
  return map[id] || `Chain ${id}`;
}

function setStatus(accounts, chainId) {
  if (!accounts?.length || !chainId) {
    setConnectState(false);
    setNetBadge('Not connected');
    return;
  }
  setConnectState(true, accounts[0]);
  setNetBadge(`${networkNameHex(chainId)} • ${shortAddr(accounts[0])}`);
}

// Injected wallet (e.g. MetaMask)
const injected = window.ethereum;

// --- Safe postMessage wrapper ---
function safePostMessage(win, msg, origin) {
  const targetOrigin = (origin === "null" ? "*" : origin);
  win.postMessage(msg, targetOrigin);
}

async function connectWallet() {
  if (!injected) {
    alert('No wallet detected. Please install a wallet with window.ethereum support (e.g. MetaMask).');
    return;
  }
  try {
    const accounts = await injected.request({ method: "eth_requestAccounts" });
    const chainId  = await injected.request({ method: "eth_chainId" });
    setStatus(accounts, chainId);
    broadcastInit({ accounts, chainId });
  } catch (e) {
    console.error("Wallet connect failed:", e);
    alert(e?.message || String(e));
  }
}

document.getElementById('connectBtn').addEventListener('click', connectWallet);

// Tabs
bindTabs();

// Register child when iframe loads
iframe.addEventListener("load", async () => {
  const origin = new URL(iframe.src, window.location.href).origin;
  tenants.set(iframe.contentWindow, { origin });

  if (injected) {
    try {
      const accounts = await injected.request({ method: "eth_accounts" });
      const chainId  = await injected.request({ method: "eth_chainId" });
      setStatus(accounts, chainId);
      broadcastInit({ accounts, chainId });
    } catch {}
  }
});

function broadcastInit({ accounts, chainId }) {
  for (const [win, { origin }] of tenants.entries()) {
    safePostMessage(win, {
      type: "init",
      payload: {
        accounts,
        chainId,
        readRpcUrl: READ_RPC_URL,
        allowedChains: Array.from(ALLOWED_CHAINS),
      }
    }, origin);
  }
}

// Handle requests from child
window.addEventListener("message", async (event) => {
  const { source, origin, data } = event;
  if (!tenants.has(source)) return; // only our iframe
  const { id, method, params } = data || {};
  if (!id || !method) return;

  console.log("[Parent] Got request from shim:", method, params);

  try {
    // Identity → always parent truth
    if (IDENTITY_METHODS.has(method)) {
      const result = await injected.request({ method, params });
      return safePostMessage(source, { id, result }, origin);
    }

    // Chain change guards
    if (method === "wallet_switchEthereumChain") {
      const requested = (params?.[0]?.chainId || "").toLowerCase();
      if (!ALLOWED_CHAINS.has(requested)) throw new Error("Unsupported chain");
      const result = await injected.request({ method, params });
      return safePostMessage(source, { id, result }, origin);
    }
    if (method === "wallet_addEthereumChain") {
      const chainId = (params?.[0]?.chainId || "").toLowerCase();
      if (!ALLOWED_CHAINS.has(chainId)) throw new Error("Unsupported chain");
      const result = await injected.request({ method, params });
      return safePostMessage(source, { id, result }, origin);
    }

    // Writes/signatures
    if (DANGEROUS_WRITES.has(method)) {
      if (method === "eth_sendTransaction" && params?.[0]?.chainId) {
        const current = await injected.request({ method: "eth_chainId" });
        if (params[0].chainId.toLowerCase() !== current.toLowerCase()) {
          throw new Error("Chain ID mismatch");
        }
      }
      const result = await injected.request({ method, params });
      return safePostMessage(source, { id, result }, origin);
    }

    // Reads → forward to injected for consistency
    if (SAFE_READS.has(method)) {
      const result = await injected.request({ method, params });
      return safePostMessage(source, { id, result }, origin);
    }

    throw new Error("Method not allowed");
  } catch (err) {
    safePostMessage(source, { id, error: err?.message ?? String(err) }, origin);
  }
});

// Push wallet events down
function emitToChildren(method, params) {
  for (const [win, { origin }] of tenants.entries()) {
    safePostMessage(win, { type: "event", method, params }, origin);
  }
}

if (injected?.on) {
  injected.on("accountsChanged", (accounts) => {
    emitToChildren("accountsChanged", [accounts]);
    injected.request({ method: "eth_chainId" }).then((chainId) => setStatus(accounts, chainId));
  });
  injected.on("chainChanged", (chainId) => {
    emitToChildren("chainChanged", [chainId]);
    injected.request({ method: "eth_accounts" }).then((accounts) => setStatus(accounts, chainId));
  });
}
