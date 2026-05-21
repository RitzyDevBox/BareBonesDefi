import fs from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";

const tlsKey = process.env.LOCAL_TLS_KEY;
const tlsCert = process.env.LOCAL_TLS_CERT;
const httpsConfig =
  tlsKey && tlsCert
    ? { key: fs.readFileSync(tlsKey), cert: fs.readFileSync(tlsCert) }
    : undefined;

export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    nodePolyfills({
      globals: {
        Buffer: true,
      },
    }),
  ],

  // REQUIRED for Arweave
  base: "./",

  server: {
    cors: command === "serve",
    ...(httpsConfig ? { https: httpsConfig } : {}),
  },

  build: {
    sourcemap: false,
  },
}));
