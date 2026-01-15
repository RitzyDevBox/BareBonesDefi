import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";

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
  },

  build: {
    sourcemap: false,
  },
}));
