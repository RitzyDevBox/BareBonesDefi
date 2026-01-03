/* eslint-disable no-undef */
import "dotenv/config";
import Bundlr from "@bundlr-network/client";
import fs from "fs-extra";
import path from "path";

// ---------------- config ----------------
const DIST = "dist";

// ---------------- env check ----------------
for (const key of ["BUNDLR_NODE", "BUNDLR_CHAIN", "BUNDLR_PRIVATE_KEY"]) {
  if (!process.env[key]) {
    throw new Error(`Missing env var: ${key}`);
  }
}

// ---------------- bundlr ----------------
const bundlr = new Bundlr(
  process.env.BUNDLR_NODE,
  process.env.BUNDLR_CHAIN,
  process.env.BUNDLR_PRIVATE_KEY
);

// ---------------- helpers ----------------
function getDirSize(dir) {
  let total = 0;
  const entries = fs.readdirSync(dir, { recursive: true });

  for (const entry of entries) {
    const full = path.join(dir, entry);
    if (fs.statSync(full).isFile()) {
      total += fs.statSync(full).size;
    }
  }

  return total;
}

// ---------------- estimate ----------------
async function estimateDeployCost() {
  if (!fs.existsSync(DIST)) {
    throw new Error("dist/ does not exist. Run a successful build first.");
  }

  const bytes = getDirSize(DIST);

  // Bundlr-native pricing (atomic units)
  const atomicPrice = await bundlr.getPrice(bytes);
  const nativePrice = bundlr.utils.unitConverter(atomicPrice);

  console.log("\n📦 Arweave Deploy Cost Estimate");
  console.log("─────────────────────────────");
  console.log(`Build size : ${bytes.toLocaleString()} bytes`);
  console.log(`Cost       : ${nativePrice} ${process.env.BUNDLR_CHAIN}`);
}

estimateDeployCost().catch(err => {
  console.error(err.message);
  process.exit(1);
});
