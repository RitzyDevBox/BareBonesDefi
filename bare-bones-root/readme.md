# BareBones

A **dependency-free** (vanilla HTML/CSS/JS) demo that shows how to:

- Connect to an Ethereum wallet via `window.ethereum` (e.g. MetaMask).
- Forward wallet connections into **sandboxed partner iframes** using an **EIP-1193 shim**.
- Send **native transfers** (ETH, MATIC, etc.).
- Send **ERC-20 transfers**.
- Create & sign a simple **EIP-712 “Order”** payload (for PoC use).

No build tools, no npm deps — just static files.

---

## ⚙️ Architecture

- **Parent site**  
  Hosts the wallet connection (MetaMask, Coinbase Wallet, etc.).  
  Injects state (`accounts`, `chainId`) into sandboxed iframes.  
  Relays *sensitive* RPC calls (signing, sendTransaction) to the wallet.  
  Broadcasts `accountsChanged` and `chainChanged` events to all children.  

- **Child iframe (partner app)**  
  Has no direct wallet access.  
  Gets a safe `window.ethereum` shim that looks like a real provider.  
  Can use `ethers.js` or `web3.js` as normal (`new Web3Provider(window.ethereum)` works).  
  Reads may go directly to a public RPC; writes always go through the parent.  

This lets you host **third-party apps on subdomains** without exposing your wallet directly.

---

## 🚀 Quick start (serve locally)

Modern browsers block ES modules from `file://` URLs, so you need a static server.  
Run one from the project root:

### Run the child iframe project:
```
cd bare-bones-children/partner-template/
yarn dev
```

### Option A: Python (all platforms)
```bash
cd bare-bones-root/
python3 -m http.server 8080
# open http://localhost:8080/parent/index.html

bare-bones-children/partner-template$ 

##

release-v3: https://ar-io.dev/E8og-xo8Ls74cFw0RNGCrAgTCGOVZ_zc_64BGLezExE
release-v4: https://ar-io.dev/KEUxTl_aSNSQEfoIscnwhpFpWvbmINcl4g_34JhUIu4
release-v5: https://ar-io.dev/P0skptlyvRuymq2nQRdUYJ6-1RYvTVKLgeOwZ8ftTz0
