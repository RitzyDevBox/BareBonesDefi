export type DeploymentTarget = "local" | "staging" | "live";

function normalizeDeploymentTarget(value: unknown): DeploymentTarget {
  const normalized = String(value ?? "local").trim().toLowerCase();

  if (normalized === "staging" || normalized === "live") {
    return normalized;
  }

  return "local";
}

export const DEPLOYMENT_TARGET = normalizeDeploymentTarget(import.meta.env.VITE_DEPLOYMENT_TARGET);

export const DEPLOYMENT_CONFIG = {
  target: DEPLOYMENT_TARGET,
  showLocalChains: DEPLOYMENT_TARGET === "local",
  showTestnetsByDefault: DEPLOYMENT_TARGET !== "live",
};
