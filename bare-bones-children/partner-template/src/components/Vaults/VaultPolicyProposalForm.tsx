import { useState } from "react";
import { Stack } from "../Primitives";
import { ButtonPrimary } from "../Button/ButtonPrimary";

import {
  PolicyScope,
  LimitPolicy,
  AssetType,
  PolicyScopeKind,
  LimitKind,
} from "../../models/vaults/vaultTypes";
import { PolicyScopeSelector } from "./PolicyScopeSelector";
import { LimitPolicyEditor } from "./LimitPolicyEditor";


interface Props {
  onSubmit: (scope: PolicyScope, policy: LimitPolicy) => void;
}

export function VaultPolicyProposalForm({ onSubmit }: Props) {
  const [scope, setScope] = useState<PolicyScope>({
    kind: PolicyScopeKind.AssetType,
    assetType: AssetType.Native,
    asset: "0x0000000000000000000000000000000000000000",
    id: "0",
  });

  const [policy, setPolicy] = useState<LimitPolicy>({
    kind: LimitKind.Absolute,
    windowSeconds: 0,
    proposalDelaySeconds: 0,
    value: "0",
  });

  return (
    <Stack gap="lg">
      <PolicyScopeSelector value={scope} onChange={setScope} />
      <LimitPolicyEditor value={policy} onChange={setPolicy} />

      <ButtonPrimary
        onClick={() => onSubmit(scope, policy)}
      >
        Propose Policy
      </ButtonPrimary>
    </Stack>
  );
}
