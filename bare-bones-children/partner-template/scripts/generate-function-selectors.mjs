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

/* ---------------- CONTRACT-NAME DERIVATION ---------------- */

// Use the file's basename minus extensions (".abi.json" or ".json") as the
// contract name. Matches how the repo names its ABI artifacts —
// `MultiTenantAuth.json`, `DAOGovernor.abi.json` → "MultiTenantAuth",
// "DAOGovernor". Keeps the selector map labels stable across folder reshuffles.
function contractNameFromPath(filePath) {
  const base = path.basename(filePath);
  return base.replace(/\.abi\.json$/i, "").replace(/\.json$/i, "");
}

/* ---------------- FUNCTION EXTRACTION ---------------- */

function extractFunctionSelectors(abi, filePath) {
  const result = {};
  const contract = contractNameFromPath(filePath);

  try {
    const iface = new Interface(abi);

    const fnFragments = iface.fragments.filter(
      (f) => f.type === "function"
    );

    if (fnFragments.length === 0) {
      console.log(`No functions in: ${filePath}`);
      return result;
    }

    for (const fragment of fnFragments) {
      // Canonical signature: name(type1,type2,...). Matches what
      // keccak256 → first 4 bytes is computed against. Avoid param names in
      // the canonical form so the selector is deterministic; carry a
      // pretty-printed `signature` separately for display.
      const canonical = `${fragment.name}(${fragment.inputs.map((i) => i.type).join(",")})`;
      const prettyParams = fragment.inputs.map((i, idx) => {
        const paramName = i.name && i.name.length > 0 ? i.name : `arg${idx}`;
        return `${i.type} ${paramName}`;
      }).join(",");
      const signature = `${fragment.name}(${prettyParams})`;
      const selector = iface.getSighash(fragment);

      result[selector] = { contract, name: fragment.name, signature };
    }

    console.log(`Found ${fnFragments.length} functions in: ${filePath}`);

  } catch (err) {
    console.error(`Interface parsing failed for: ${filePath}`);
    console.error(err.message);
  }

  return result;
}

/* ---------------- MAIN ---------------- */

function generate() {
  const selectorMap = {};
  // Collision tracking — when multiple ABIs declare the same function
  // (e.g. `owner()` appears on dozens of contracts), the *first* one wins
  // and later ones are recorded as conflicts so the reader knows which
  // contract the displayed label refers to. Keeps the map deterministic
  // (alphabetical folder walk) without forcing every contract to win.
  const conflicts = {};

  for (const folder of inputFolders) {
    console.log(`\nScanning folder: ${folder}`);

    const files = walk(folder);
    console.log(`Found ${files.length} JSON files`);

    for (const file of files) {
      try {
        const raw = fs.readFileSync(file, "utf8");
        const content = JSON.parse(raw);

        const abi = Array.isArray(content) ? content : content.abi;

        if (!Array.isArray(abi)) {
          console.log(`Skipping (no ABI array): ${file}`);
          continue;
        }

        const fns = extractFunctionSelectors(abi, file);

        for (const [selector, entry] of Object.entries(fns)) {
          const existing = selectorMap[selector];
          if (existing) {
            if (existing.contract !== entry.contract || existing.name !== entry.name) {
              if (!conflicts[selector]) conflicts[selector] = [existing];
              conflicts[selector].push(entry);
            }
            continue;
          }
          selectorMap[selector] = entry;
        }

      } catch (err) {
        console.error(`Failed parsing JSON: ${file}`);
        console.error(err.message);
      }
    }
  }

  const conflictCount = Object.keys(conflicts).length;
  if (conflictCount > 0) {
    console.log(`\n${conflictCount} selector(s) appeared in multiple ABIs; kept the first occurrence.`);
  }

  return selectorMap;
}

function writeOutput(map) {
  const fileContent = `// AUTO-GENERATED FILE. DO NOT EDIT.
// Regenerate via: npm run extract-function-selectors
//
// Maps 4-byte function selectors to their { contract, name, signature } so
// proposal-display surfaces can show "MultiTenantAuth.execute(...)" in O(1)
// without trying every loaded Interface against parseTransaction.

export interface FunctionSelectorEntry {
  /** Source ABI's contract name (filename basename minus extensions). */
  contract: string;
  /** Function name only — useful for the short label. */
  name: string;
  /** Pretty-printed signature with param names where available — useful
   *  for tooltips and the verbose-mode display. */
  signature: string;
}

export const FUNCTION_SELECTOR_MAP: Record<string, FunctionSelectorEntry> = ${JSON.stringify(
    map,
    null,
    2
  )} as const;
`;

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, fileContent, "utf8");
}

/* EXECUTE */

const result = generate();

console.log("\nFinal selector count:", Object.keys(result).length);

writeOutput(result);

console.log(`Output written to: ${outputPath}`);
