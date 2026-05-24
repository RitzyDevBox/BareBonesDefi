import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// Canonical Articles-of-Organization template lives in the API repo
// (BareBonesApi/src/templates/articles-of-organization.ts) so the PDF and
// the JSX preview share a single source of truth. Vite needs this dir on
// `server.fs.allow` to permit the relative-path import from the wizard's
// review step.
const SHARED_TEMPLATES_DIR = path.resolve(
  __dirname,
  "../../../BareBonesApi/src/templates",
);

// Legal docs (privacy policy, future ToS) live at the monorepo root in
// `docs/` so a lawyer can review them as plain markdown without spelunking
// into either subproject. The Privacy Policy modal imports the markdown
// via `?raw` and renders it with a tiny inline subset renderer — so vite
// just needs filesystem access to read the file at dev time.
const SHARED_LEGAL_DIR = path.resolve(__dirname, "../../../docs");

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
    fs: {
      // Default `server.fs.allow` is the project root only. Extend it to
      // the API's templates directory so the wizard's review step can pull
      // the shared Articles-of-Organization template.
      allow: [path.resolve(__dirname), SHARED_TEMPLATES_DIR, SHARED_LEGAL_DIR],
    },
    ...(httpsConfig ? { https: httpsConfig } : {}),
  },

  build: {
    sourcemap: false,
  },
}));
