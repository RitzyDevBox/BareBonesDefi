import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command }) => ({
  plugins: [react()],

  // REQUIRED for Arweave (relative asset paths)
  base: "./",

  server: {
    // Only affects `vite dev`
    cors: command === "serve"
  },

  build: {
    // Explicitly lock prod behavior
    sourcemap: false
  }
}));
