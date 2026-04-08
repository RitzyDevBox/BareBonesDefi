import { ethers } from "ethers";
import type { BareBonesConfiguration } from "../../constants/misc";

export enum RuleKind {
  Hourly = "hourly",
  Weekly = "weekly",
  Commission = "commission",
  PerPayroll = "perPayroll",
  Salary = "salary",
  Custom = "custom",
}

export const DEFAULT_HOURS = "40";

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

function countSetBits(mask: bigint) {
  let n = mask;
  let count = 0;
  while (n > 0n) {
    if ((n & 1n) === 1n) count += 1;
    n >>= 1n;
  }
  return count;
}

export function buildRuleMeta(
  ruleAddress: string,
  cfg: BareBonesConfiguration | null
): RuleMeta {
  const normalized = ruleAddress.toLowerCase();

  if (cfg && normalized === cfg.hoursRuleAddress.toLowerCase()) {
    return {
      name: "Hourly Earnings",
      kind: RuleKind.Hourly,
      configRequired: true,
      runDataRequired: true,
    };
  }

  if (cfg && normalized === cfg.weeklyScheduleRuleAddress.toLowerCase()) {
    return {
      name: "Weekly Schedule Earnings",
      kind: RuleKind.Weekly,
      configRequired: true,
      runDataRequired: true,
    };
  }

  if (cfg && normalized === cfg.commissionRuleAddress.toLowerCase()) {
    return {
      name: "Commish Earnings",
      kind: RuleKind.Commission,
      configRequired: false,
      runDataRequired: false,
    };
  }

  if (cfg && normalized === cfg.oneTimePaymentAddress.toLowerCase()) {
    return {
      name: "PerPayroll Earnings",
      kind: RuleKind.PerPayroll,
      configRequired: false,
      runDataRequired: false,
    };
  }

  if (cfg && normalized === cfg.salaryPerSecondRuleAddress.toLowerCase()) {
    return {
      name: "Salary Earnings",
      kind: RuleKind.Salary,
      configRequired: true,
      runDataRequired: false,
    };
  }

  return {
    name: "Custom Rule",
    kind: RuleKind.Custom,
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
    if (ruleMeta.kind === RuleKind.Hourly) {
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

    if (ruleMeta.kind === RuleKind.Salary) {
      const decoded = ethers.utils.defaultAbiCoder.decode(["uint32"], configBytes);
      const periodDays = Number((decoded?.[0] as ethers.BigNumber).toString());
      return `Period ${periodDays} day(s)`;
    }

    if (ruleMeta.kind === RuleKind.Weekly) {
      const decoded = ethers.utils.defaultAbiCoder.decode(["uint168[]", "uint16[]"], configBytes);
      const bpsValues = (decoded?.[1] ?? []) as ethers.BigNumber[];

      if (bpsValues.length === 0) {
        return "No premium schedule";
      }

      const rates = Array.from(
        new Set(
          bpsValues.map((bps) => `x${formatMultiplierFromBps(Number(bps.toString()))}`)
        )
      );

      return `Premium rate: ${rates.join(", ")}`;
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
    if (ruleMeta.kind === RuleKind.Hourly) {
      const decoded = ethers.utils.defaultAbiCoder.decode(["uint32"], runDataBytes);
      const hoursWorked = Number((decoded?.[0] as ethers.BigNumber).toString());
      return `${hoursWorked} hour(s)`;
    }

    if (ruleMeta.kind === RuleKind.Weekly) {
      const decoded = ethers.utils.defaultAbiCoder.decode(["uint168[]"], runDataBytes);
      const workedMasks = (decoded?.[0] ?? []) as ethers.BigNumber[];
      if (workedMasks.length === 0) return "No worked schedule";

      const perWeek = workedMasks.map((mask, i) => `W${i + 1}:${countSetBits(BigInt(mask.toString()))}h`);
      return `Worked masks: ${perWeek.join(", ")}`;
    }
  } catch {
    return truncateHex(runDataBytes);
  }

  return truncateHex(runDataBytes);
}
