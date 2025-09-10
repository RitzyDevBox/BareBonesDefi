# BareBones

A **dependency-free** (vanilla HTML/CSS/JS) demo that can:
- Connect to an Ethereum wallet (`window.ethereum` — e.g. MetaMask).
- Send **native** transfers.
- Send **ERC-20** transfers.
- Create & sign a simple **EIP-712 “Order”** payload (for PoC use).

No build tools, no npm deps — just static files.

---

## Quick start (serve locally)

Modern browsers block ES modules from `file://` URLs, so you need a **static server**. Any simple server works:

### Option A: Python (all platforms)
```bash
cd barebones
python3 -m http.server 8080
# open http://localhost:8080
