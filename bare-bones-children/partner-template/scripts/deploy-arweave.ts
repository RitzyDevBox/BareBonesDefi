import Bundlr from "@bundlr-network/client";
import fs from "fs-extra";
import path from "path";
import mime from "mime";

const DIST = "dist";


for (const key of ["BUNDLR_NODE", "BUNDLR_CHAIN", "BUNDLR_PRIVATE_KEY"]) {
  if (!process.env[key]) {
    throw new Error(`Missing env var: ${key}`);
  }
}

const bundlr = new Bundlr(
  process.env.BUNDLR_NODE!,
  process.env.BUNDLR_CHAIN!,
  process.env.BUNDLR_PRIVATE_KEY!
);

async function deploy() {
  const manifest: {
    manifest: string;
    version: string;
    index: { path: string };
    paths: Record<string, { id: string }>;
  } = {
    manifest: "arweave/paths",
    version: "0.1.0",
    index: { path: "index.html" },
    paths: {}
  };

  const files = fs.readdirSync(DIST, { recursive: true });

  for (const file of files) {
    const full = path.join(DIST, file as string);
    if (fs.statSync(full).isDirectory()) continue;

    const tx = await bundlr.upload(
      fs.readFileSync(full),
      {
        tags: [
          { name: "Content-Type", value: mime.getType(full) || "application/octet-stream" }
        ]
      }
    );

    manifest.paths[file as string] = { id: tx.id };
    console.log(`⬆ ${file} → ${tx.id}`);
  }

  const manifestTx = await bundlr.upload(
    JSON.stringify(manifest),
    {
      tags: [
        { name: "Content-Type", value: "application/x.arweave-manifest+json" }
      ]
    }
  );

  console.log("\n✅ Deployed");
  console.log(`🌐 https://ar-io.dev/${manifestTx.id}`);
}

deploy().catch(err => {
  console.error(err);
  process.exit(1);
});
