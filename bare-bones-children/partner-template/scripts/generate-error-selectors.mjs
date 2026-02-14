import fs from "fs";
import path from "path";
import ethersPkg from "ethers";
import { fileURLToPath } from "url";

/* ---------------- ETHERS V5 FIX ---------------- */

const { ethers } = ethersPkg;
const { Interface } = ethers.utils;

/* ---------------- PATH UTILS ---------------- */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ---------------- ARG PARSER ---------------- */

function getArg(name) {
  const prefix = `--${name}=`;
  const arg = process.argv.find(a => a.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : undefined;
}

const inputFoldersArg = getArg("inputFolders");
const outputMapPath = getArg("outputMap");

if (!inputFoldersArg) {
  console.error("Missing --inputFolders");
  process.exit(1);
}

if (!outputMapPath) {
  console.error("Missing --outputMap");
  process.exit(1);
}

const inputFolders = inputFoldersArg
  .split(",")
  .map(f => path.resolve(f.trim()));

const outputPath = path.resolve(outputMapPath);

console.log("Input folders:", inputFolders);
console.log("Output path:", outputPath);

/* ---------------- FILE WALKER ---------------- */

function walk(dir, fileList = []) {
  if (!fs.existsSync(dir)) {
    console.warn(`Folder does not exist: ${dir}`);
    return fileList;
  }

  for (const file of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      walk(fullPath, fileList);
    } else if (file.endsWith(".json")) {
      fileList.push(fullPath);
    }
  }

  return fileList;
}

/* ---------------- ERROR EXTRACTION ---------------- */

function extractErrorSelectors(abi, filePath) {
  const result = {};

  try {
    const iface = new Interface(abi);

    const errorFragments = iface.fragments.filter(
      (f) => f.type === "error"
    );

    if (errorFragments.length === 0) {
      console.log(`No custom errors in: ${filePath}`);
      return result;
    }

    console.log(`Found ${errorFragments.length} errors in: ${filePath}`);

    for (const fragment of errorFragments) {
      // Include parameter names if available
      const signature = `${fragment.name}(${fragment.inputs
        .map((i, idx) => {
          const paramName = i.name && i.name.length > 0
            ? i.name
            : `arg${idx}`;
          return `${i.type} ${paramName}`;
        })
        .join(",")})`;

      const selector = iface.getSighash(fragment);

      console.log(`  → ${selector} = ${signature}`);

      result[selector] = signature;
    }

  } catch (err) {
    console.error(`Interface parsing failed for: ${filePath}`);
    console.error(err.message);
  }

  return result;
}

/* ---------------- MAIN ---------------- */

function generate() {
  const selectorMap = {};

  for (const folder of inputFolders) {
    console.log(`\nScanning folder: ${folder}`);

    const files = walk(folder);
    console.log(`Found ${files.length} JSON files`);

    for (const file of files) {
      console.log(`Processing: ${file}`);

      try {
        const raw = fs.readFileSync(file, "utf8");
        const content = JSON.parse(raw);

        const abi = Array.isArray(content) ? content : content.abi;

        if (!Array.isArray(abi)) {
          console.log(`Skipping (no ABI array): ${file}`);
          continue;
        }

        const errors = extractErrorSelectors(abi, file);

        for (const [selector, signature] of Object.entries(errors)) {
          if (selectorMap[selector]) {
            console.warn(`Duplicate selector: ${selector}`);
          }
          selectorMap[selector] = signature;
        }

      } catch (err) {
        console.error(`Failed parsing JSON: ${file}`);
        console.error(err.message);
      }
    }
  }

  return selectorMap;
}

function writeOutput(map) {
  const fileContent = `// AUTO-GENERATED FILE. DO NOT EDIT.

export const ERROR_SELECTOR_MAP: Record<string, string> = ${JSON.stringify(
    map,
    null,
    2
  )} as const;
`;

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, fileContent, "utf8");
}

/* ---------------- EXECUTE ---------------- */

const result = generate();

console.log("\nFinal selector count:", Object.keys(result).length);

writeOutput(result);

console.log(`Output written to: ${outputPath}`);
