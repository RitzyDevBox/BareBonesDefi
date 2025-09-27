// child/js/ethers-shim.js
(function(){
    class ShimEthereum {
      constructor() {
        this._cbs = new Map();     // pending request promises
        this._events = {};         // event listeners
        this._state = { accounts: [], chainId: null };
        this._config = { readRpcUrl: null, allowedChains: [] };
  
        window.addEventListener("message", (e) => this._onMessage(e));
      }
  
      // EIP-1193: request({ method, params })
      request({ method, params }) {
        console.log("[Shim] Request:", method, params);
  
        const identityMethods = new Set(["eth_accounts", "eth_requestAccounts", "eth_chainId", "net_version"]);
        const dangerousWrites = new Set([
          "eth_sendTransaction", "eth_sendRawTransaction",
          "eth_sign", "personal_sign",
          "eth_signTypedData", "eth_signTypedData_v4",
          "wallet_switchEthereumChain", "wallet_addEthereumChain"
        ]);
        const safeReads = new Set([
          "eth_call", "eth_getBalance", "eth_getBlockByNumber", "eth_getBlockByHash",
          "eth_getTransactionByHash", "eth_getTransactionReceipt", "eth_blockNumber",
          "eth_gasPrice", "eth_getCode", "eth_getStorageAt", "eth_getTransactionCount", 
          "eth_getLogs", "eth_estimateGas"
        ]);
  
        if (identityMethods.has(method) || dangerousWrites.has(method) || safeReads.has(method)) {
          return this._forwardToParent(method, params);
        }
  
        return Promise.reject(new Error(`Method not allowed: ${method}`));
      }
  
      on(event, fn) {
        if (!this._events[event]) this._events[event] = [];
        this._events[event].push(fn);
      }
  
      removeListener(event, fn) {
        const arr = this._events[event] || [];
        const i = arr.indexOf(fn);
        if (i >= 0) arr.splice(i, 1);
      }
  
      // MetaMask-like props
      get isMetaMask() { return false; }
      get selectedAddress() { return this._state.accounts?.[0] || null; }
      get chainId() { return this._state.chainId; }
  
      // ===== internal =====
      _emit(event, ...args) {
        (this._events[event] || []).forEach(fn => {
          try { fn(...args); } catch { /* empty */ }
        });
      }
  
      _onMessage(event) {
        const msg = event?.data || {};
        if (msg.type === "init") {
          const { accounts, chainId, readRpcUrl, allowedChains } = msg.payload || {};
          this._state.accounts = accounts || [];
          this._state.chainId = chainId || null;
          this._config.readRpcUrl = readRpcUrl || null;
          this._config.allowedChains = allowedChains || [];
          console.log("[Shim] Init from parent:", this._state);
          this._emit("connect", { chainId: this._state.chainId });
          this._emit("accountsChanged", this._state.accounts);
          return;
        }
        if (msg.type === "event") {
          console.log("[Shim] Event from parent:", msg.method, msg.params);
          if (msg.method === "accountsChanged") {
            this._state.accounts = msg.params?.[0] || [];
            this._emit("accountsChanged", this._state.accounts);
          } else if (msg.method === "chainChanged") {
            this._state.chainId = msg.params?.[0] || null;
            this._emit("chainChanged", this._state.chainId);
          }
          return;
        }
  
        // response to request
        const { id, result, error } = msg;
        if (!id || !this._cbs.has(id)) return;
        const { resolve, reject } = this._cbs.get(id);
        this._cbs.delete(id);
        error ? reject(new Error(error)) : resolve(result);
      }
  
      _forwardToParent(method, params) {
        return new Promise((resolve, reject) => {
          const id = crypto.randomUUID();
          this._cbs.set(id, { resolve, reject });
          console.log("[Shim] Forwarding to parent:", method, params);
          window.parent.postMessage({ id, method, params }, "*");
        });
      }
    }
  
    // --- Install logic ---
    const shimInstance = new ShimEthereum();
  
    function installShim() {
      if (window.ethereum !== shimInstance) {
        console.log("[Shim] Installing shim (overwriting existing)", window.ethereum);
        window.ethereum = shimInstance;
      }
    }
  
    // install immediately
    installShim();
  
    // re-install if an extension overwrites
    window.addEventListener("ethereum#initialized", installShim, { once: true });
  
    // fallback: re-install after 3s
    setTimeout(installShim, 3000);
  })();
  