// One hook the Distributions UI consumes: the org's cap-table classes + holders (from useCapTable,
// mapped into the distribution CapClass/CapHolder shape) plus its on-chain distributions
// (useDistributions). Keeps all the chain↔view-model mapping in one place.

import { useMemo } from "react";
import { useCapTable } from "../capTable/useCapTable";
import { DistributionPolicy } from "../capTable/capTableTypes";
import { useMtaState } from "../auth/useMtaState";
import { orgSlugFor } from "../../utils/payroll/orgSlug";
import { useDistributions } from "./useDistributions";
import type { CapClass, CapHolder, Distribution } from "../../components/Distributions/distributionsMockData";

const POLICY_NAME: Record<number, CapClass["params"]["distributionPolicy"]> = {
  [DistributionPolicy.VestedOnly]: "VestedOnly",
  [DistributionPolicy.AccrueAndPayOnVest]: "AccrueAndPayOnVest",
  [DistributionPolicy.Full]: "Full",
};

export interface DistributionData {
  classes: CapClass[];
  holders: CapHolder[];
  distributions: Distribution[];
  shareTokenAddress: string | null;
  hasTable: boolean;
  loading: boolean;
  refresh: () => void;
}

export function useDistributionData(slug: string): DistributionData {
  const slugBytes = useMemo(() => (slug ? orgSlugFor(slug) : ""), [slug]);
  const mta = useMtaState(slugBytes);
  const { state: cap, refresh: refreshCap } = useCapTable(slug, null, mta.members);
  const { distributions, loading: distLoading, refresh: refreshDist } = useDistributions(slug);

  // Map cap-table classes → distribution CapClass shape (string ids, policy name).
  const classes = useMemo<CapClass[]>(
    () =>
      cap.classes.map((c) => ({
        id: String(c.classId),
        name: c.params.name,
        color: c.color,
        unissued: c.isPool,
        params: {
          distributionPolicy: POLICY_NAME[c.params.distributionPolicy] ?? "VestedOnly",
          distributionWeightBps: c.params.distributionWeightBps,
        },
      })),
    [cap.classes],
  );

  // Map cap-table holders → distribution CapHolder shape (address id, string class id).
  const holders = useMemo<CapHolder[]>(
    () =>
      cap.holders.map((h) => ({
        id: h.address.toLowerCase(),
        name: h.name,
        initials: h.initials,
        avatarHue: h.avatarHue,
        type: h.type,
        role: h.role,
        classId: String(h.classId),
        shares: h.shares,
        vested: h.vested,
        grantStatus: "Active",
        address: h.address,
      })),
    [cap.holders],
  );

  const refresh = useMemo(
    () => () => {
      void refreshCap();
      refreshDist();
    },
    [refreshCap, refreshDist],
  );

  return {
    classes,
    holders,
    distributions,
    shareTokenAddress: cap.shareTokenAddress,
    hasTable: cap.hasTable,
    loading: cap.loading || distLoading,
    refresh,
  };
}
