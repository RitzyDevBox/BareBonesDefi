import type { Page } from "@playwright/test";

export type MockWalletOpts = {
  /** Address to expose as the connected account. Defaults to anvil account #0. */
  account?: string;
  /** Chain id (decimal). Defaults to anvil (31337). */
  chainId?: number;
  /** RPC URL the provider forwards to. Defaults to local anvil. */
  rpcUrl?: string;
};

const ANVIL_ACCOUNT_0 = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

export async function installMockWallet(page: Page, opts: MockWalletOpts = {}) {
  const account = opts.account ?? ANVIL_ACCOUNT_0;
  const chainId = opts.chainId ?? 31337;
  const rpcUrl = opts.rpcUrl ?? "http://127.0.0.1:8545";

  await page.addInitScript(
    ({ account, chainId, rpcUrl }) => {
      const chainHex = "0x" + chainId.toString(16);
      let rpcId = 1;

      const rpc = async (method: string, params: unknown[] = []) => {
        const res = await fetch(rpcUrl, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: rpcId++, method, params }),
        });
        const json = await res.json();
        if (json.error) {
          const err: Error & { code?: number } = new Error(
            json.error.message ?? "RPC error"
          );
          err.code = json.error.code;
          throw err;
        }
        return json.result;
      };

      const listeners: Record<string, Array<(...args: unknown[]) => void>> = {};
      let authorized = false;

      // Surface RPC activity for debugging — writes to console + a global
      // ring buffer. Tests can read window.__pwRpcLog to assert traffic.
      const rpcLog: Array<{ method: string; params: unknown[]; result?: unknown; error?: string }> = [];
      (window as unknown as { __pwRpcLog: typeof rpcLog }).__pwRpcLog = rpcLog;

      const provider = {
        isMetaMask: false,
        isMockWallet: true,
        get selectedAddress() {
          return authorized ? account : null;
        },
        chainId: chainHex,

        async request({
          method,
          params = [],
        }: {
          method: string;
          params?: unknown[];
        }) {
          const entry: { method: string; params: unknown[]; result?: unknown; error?: string } = { method, params };
          rpcLog.push(entry);
          // eslint-disable-next-line no-console
          console.log("[mockWallet] →", method, params);

          try {
            let result: unknown;
            switch (method) {
              case "eth_accounts":
                result = authorized ? [account] : [];
                break;
              case "eth_requestAccounts":
              case "wallet_requestPermissions":
                if (!authorized) {
                  authorized = true;
                  // Defer the event so the caller's promise resolves first.
                  setTimeout(() => {
                    provider._emit("accountsChanged", [account]);
                    provider._emit("connect", { chainId: chainHex });
                  }, 0);
                }
                result = method === "eth_requestAccounts"
                  ? [account]
                  : [{ parentCapability: "eth_accounts" }];
                break;
              case "eth_chainId":
                result = chainHex;
                break;
              case "net_version":
                result = String(chainId);
                break;
              case "wallet_switchEthereumChain":
              case "wallet_addEthereumChain":
              case "wallet_revokePermissions":
                if (method === "wallet_revokePermissions") authorized = false;
                result = null;
                break;
              default:
                // Anvil has unlocked accounts — eth_sendTransaction / signs
                // succeed server-side without any popup.
                result = await rpc(method, params);
            }
            entry.result = result;
            // eslint-disable-next-line no-console
            console.log("[mockWallet] ←", method, result);
            return result;
          } catch (err) {
            entry.error = (err as Error).message;
            // eslint-disable-next-line no-console
            console.error("[mockWallet] ✗", method, err);
            throw err;
          }
        },

        on(event: string, fn: (...args: unknown[]) => void) {
          (listeners[event] ??= []).push(fn);
        },
        removeListener(event: string, fn: (...args: unknown[]) => void) {
          const arr = listeners[event] || [];
          const i = arr.indexOf(fn);
          if (i >= 0) arr.splice(i, 1);
        },
        _emit(event: string, ...args: unknown[]) {
          for (const fn of listeners[event] || []) {
            try {
              fn(...args);
            } catch {
              /* listener errors are not our problem */
            }
          }
        },
      };

      Object.defineProperty(window, "ethereum", {
        value: provider,
        writable: true,
        configurable: true,
      });

      // Don't emit "connect" until the user actually approves via
      // eth_requestAccounts — this keeps the initial UI in the disconnected
      // state, so the demo can show the Connect click.
    },
    { account, chainId, rpcUrl }
  );
}
