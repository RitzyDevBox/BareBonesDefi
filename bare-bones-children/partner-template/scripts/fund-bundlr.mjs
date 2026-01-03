/* eslint-disable no-undef */
import "dotenv/config";
import Bundlr from "@bundlr-network/client";
import { ethers } from "ethers";

// ---------------- env check ----------------
for (const key of ["BUNDLR_NODE", "BUNDLR_CHAIN", "BUNDLR_PRIVATE_KEY"]) {
  if (!process.env[key]) {
    throw new Error(`Missing env var: ${key}`);
  }
}

// ---------------- args ----------------
const arg = process.argv.find(a => a.startsWith("--amount="));
if (!arg) {
  throw new Error("Missing --amount=<number>");
}

const amount = Number(arg.split("=")[1]);
if (!Number.isFinite(amount) || amount <= 0) {
  throw new Error("Invalid --amount value");
}

// ---------------- bundlr ----------------
const bundlr = new Bundlr(
  process.env.BUNDLR_NODE,
  process.env.BUNDLR_CHAIN,
  process.env.BUNDLR_PRIVATE_KEY
);

// ---------------- fund ----------------
async function fundBundlr() {
  const chain = process.env.BUNDLR_CHAIN.toUpperCase();

  console.log(`\n💰 Funding Bundlr`);
  console.log(`─────────────────────────────`);
  console.log(`Amount : ${amount} ${chain}`);

  const before = await bundlr.getLoadedBalance();
  console.log(
    `Balance before : ${bundlr.utils.unitConverter(before)} ${chain}`
  );

  // ✅ CORRECT atomic conversion
  const atomicAmount = ethers.utils
    .parseUnits(amount.toString(), bundlr.currencyConfig.decimals)
    .toString();

  const tx = await bundlr.fund(atomicAmount);

  console.log(`\n✅ Funded successfully`);
  console.log(`Bundlr tx : https://app.bundlr.network/tx/${tx.id}`);

  const after = await bundlr.getLoadedBalance();
  console.log(
    `Balance after  : ${bundlr.utils.unitConverter(after)} ${chain}\n`
  );
}

fundBundlr().catch(err => {
  console.error(err.message);
  process.exit(1);
});
