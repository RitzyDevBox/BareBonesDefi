import { ethers } from "ethers";
import type { BareBonesConfiguration } from "../../constants/misc";

export type RuleKind = "hourly" | "commission" | "perPayroll" | "salary" | "custom";

export interface RuleMeta {
  name: string;
  kind: RuleKind;
  configRequired: boolean;
  runDataRequired: boolean;
}

const UINT32_MAX_NUM = 4294967295;

function truncateHex(hex?: string, length = 30) {
  if (!hex || hex === "0x") return "0x";
  if (hex.length <= length) return hex;
  return `${hex.slice(0, length)}…`;
}

function formatMultiplierFromBps(bps: number) {
  const multiplier = bps / 10_000;
  const fixed = multiplier.toFixed(4);
  return fixed.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

export function buildRuleMeta(
  ruleAddress: string,
  cfg: BareBonesConfiguration | null
): RuleMeta {
  const normalized = ruleAddress.toLowerCase();

  if (cfg && normalized === cfg.hoursRuleAddress.toLowerCase()) {
    return {
      name: "Hourly Earnings",
      kind: "hourly",
      configRequired: true,
      runDataRequired: true,
    };
  }

  if (cfg && normalized === cfg.commissionRuleAddress.toLowerCase()) {
    return {
      name: "Commish Earnings",
      kind: "commission",
      configRequired: false,
      runDataRequired: false,
    };
  }

  if (cfg && normalized === cfg.oneTimePaymentAddress.toLowerCase()) {
    return {
      name: "PerPayroll Earnings",
      kind: "perPayroll",
      configRequired: false,
      runDataRequired: false,
    };
  }

  if (cfg && normalized === cfg.salaryPerSecondRuleAddress.toLowerCase()) {
    return {
      name: "Salary Earnings",
      kind: "salary",
      configRequired: true,
      runDataRequired: false,
    };
  }

  return {
    name: "Custom Rule",
    kind: "custom",
    configRequired: false,
    runDataRequired: false,
  };
}

export function decodeConfigDisplay(
  configBytes: string,
  ruleAddress: string,
  cfg: BareBonesConfiguration | null
) {
  if (!configBytes || configBytes === "0x") {
    return "None";
  }

  const ruleMeta = buildRuleMeta(ruleAddress, cfg);

  try {
    if (ruleMeta.kind === "hourly") {
      const decoded = ethers.utils.defaultAbiCoder.decode(["uint32[]"], configBytes);
      const bands = (decoded?.[0] ?? []) as ethers.BigNumber[];
      const values = bands.map((v) => Number(v.toString()));

      if (values.length >= 2) {
        const segments: string[] = [];
        let priorCap = 0;

        for (let i = 0; i + 1 < values.length; i += 2) {
          const cap = values[i];
          const bps = values[i + 1];
          const multiplier = formatMultiplierFromBps(bps);

          if (cap >= UINT32_MAX_NUM) {
            segments.push(`Any Hours over ${priorCap} will use rate * ${multiplier}.`);
            break;
          }

          const fromHour = i === 0 ? 0 : priorCap;
          segments.push(`Hours ${fromHour}-${cap} use rate * ${multiplier}.`);
          priorCap = cap;
        }

        if (segments.length > 0) {
          return segments.join(" ");
        }
      }
    }

    if (ruleMeta.kind === "salary") {
      const decoded = ethers.utils.defaultAbiCoder.decode(["uint32"], configBytes);
      const periodDays = Number((decoded?.[0] as ethers.BigNumber).toString());
      return `Period ${periodDays} day(s)`;
    }
  } catch {
    return truncateHex(configBytes);
  }

  return truncateHex(configBytes);
}

export function decodeRunDataDisplay(
  runDataBytes: string,
  ruleAddress: string,
  cfg: BareBonesConfiguration | null
) {
  if (!runDataBytes || runDataBytes === "0x") {
    return "None";
  }

  const ruleMeta = buildRuleMeta(ruleAddress, cfg);

  try {
    if (ruleMeta.kind === "hourly") {
      const decoded = ethers.utils.defaultAbiCoder.decode(["uint32"], runDataBytes);
      const hoursWorked = Number((decoded?.[0] as ethers.BigNumber).toString());
      return `${hoursWorked} hour(s)`;
    }
  } catch {
    return truncateHex(runDataBytes);
  }

  return truncateHex(runDataBytes);
}
