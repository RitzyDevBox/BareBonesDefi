import { DEPLOYMENT_TARGET } from "../config/deployment";

export const FEATURE_FLAGS = {
  organizations: false,
  localAnvilChain: DEPLOYMENT_TARGET === "local",
} as const;
