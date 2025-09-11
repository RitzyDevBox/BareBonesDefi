const logEl = document.getElementById('log');
const log = (...a) => { logEl.textContent += a.map(x => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ') + '\n'; };

function toHex(n) { return '0x' + BigInt(n).toString(16); }

document.getElementById('btnReq').addEventListener('click', async () => {
  try {
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    log("accounts:", accounts);
  } catch (e) { log("err:", e.message || String(e)); }
});

document.getElementById('btnChain').addEventListener('click', async () => {
  try {
    const chainId = await window.ethereum.request({ method: "eth_chainId" });
    log("chainId:", chainId);
  } catch (e) { log("err:", e.message || String(e)); }
});

document.getElementById('btnBal').addEventListener('click', async () => {
  try {
    const accts = await window.ethereum.request({ method: "eth_accounts" });
    if (!accts?.length) return log("no account");
    const bal = await window.ethereum.request({ method: "eth_getBalance", params: [accts[0], "latest"] });
    log("balance:", bal);
  } catch (e) { log("err:", e.message || String(e)); }
});

document.getElementById('btnSwitch').addEventListener('click', async () => {
  try {
    const res = await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x89" }] // polygon
    });
    log("switch result:", res ?? "(ok)");
  } catch (e) { log("switch err:", e.message || String(e)); }
});

document.getElementById('btnSign').addEventListener('click', async () => {
  try {
    const [addr] = await window.ethereum.request({ method: "eth_accounts" });
    const msg = "Hello from child shim";
    // personal_sign params: [data, address]
    const sig = await window.ethereum.request({ method: "personal_sign", params: [msg, addr] });
    log("signature:", sig);
  } catch (e) { log("sign err:", e.message || String(e)); }
});

document.getElementById('btnSendNative').addEventListener('click', async () => {
    try {
      const [from] = await window.ethereum.request({ method: "eth_accounts" });
      if (!from) throw new Error("No account connected");
  
      // Example: send 0.01 ETH/MATIC to self
      const tx = {
        from,
        to: from, // replace with a real recipient
        value: "0x" + (BigInt(1e16)).toString(16), // 0.01 ETH in wei
      };
  
      const hash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [tx],
      });
  
      log("native tx hash:", hash);
    } catch (e) {
      log("send err:", e.message || String(e));
    }
  });
  

// Listen to events like a normal dapp
window.ethereum.on("accountsChanged", (accs) => log("event: accountsChanged", accs));
window.ethereum.on("chainChanged", (cid) => log("event: chainChanged", cid));
