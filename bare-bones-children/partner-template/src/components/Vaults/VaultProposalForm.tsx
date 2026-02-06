import { useState } from "react";
import { Stack } from "../Primitives";
import { Select } from "../Select";
import { SelectOption } from "../Select/SelectOption";
import { ButtonPrimary } from "../Button/ButtonPrimary";
import {
  AssetType,
  PolicyScope,
  PolicyScopeKind,
  LimitPolicy,
  LimitKind,
  VaultUpdateKind
} from "../../models/vaults/vaultTypes";

import { PolicyScopeSelector } from "./PolicyScopeSelector";
import { LimitPolicyEditor } from "./LimitPolicyEditor";
import { VaultDelayForm } from "./VaultDelayForm";
import { VaultWithdrawAddressForm } from "./VaultWithdrawAddressForm";
import { VaultProposalPayload, VaultProposalType } from "../../hooks/vaults/useVaultProposals";

interface Props {
  onPropose: (type: VaultUpdateKind, payload: VaultProposalPayload) => void;
}

export function VaultProposalForm({ onPropose }: Props) {
  const [kind, setKind] = useState<VaultUpdateKind>(
    VaultUpdateKind.POLICY
  );

  // Policy state (only used when kind === POLICY)
  const [scope, setScope] = useState<PolicyScope>({
    kind: PolicyScopeKind.AssetType,
    assetType: AssetType.Native,
    asset: "",
    id: "",
  });

  const [policy, setPolicy] = useState<LimitPolicy>({
    kind: LimitKind.Absolute,
    windowSeconds: 0,
    proposalDelaySeconds: 0,
    value: "0",
  });

  return (
    <Stack gap="lg">
      {/* WHAT ARE WE UPDATING */}
      <Select
        value={kind}
        onChange={(v) => setKind(v as VaultUpdateKind)}
      >
        <SelectOption value={VaultUpdateKind.POLICY} label="Policy" />
        <SelectOption
          value={VaultUpdateKind.DEFAULT_PROPOSAL_DELAY}
          label="Default Proposal Delay"
        />
        <SelectOption
          value={VaultUpdateKind.DEFAULT_RELEASE_DELAY}
          label="Default Release Delay"
        />
        <SelectOption
          value={VaultUpdateKind.WITHDRAW_ADDRESS_DELAY}
          label="Withdraw Address Change Delay"
        />
        <SelectOption
          value={VaultUpdateKind.WITHDRAW_ADDRESS}
          label="Withdraw Address"
        />
      </Select>

      {/* POLICY PROPOSAL */}
      {kind === VaultUpdateKind.POLICY && (
        <Stack gap="md">
          <PolicyScopeSelector
            value={scope}
            onChange={setScope}
          />

          <LimitPolicyEditor
            value={policy}
            onChange={setPolicy}
          />

          <ButtonPrimary
            onClick={() =>
              onPropose(VaultUpdateKind.POLICY, { type: VaultProposalType.POLICY, scope, policy })
            }
          >
            Propose Policy
          </ButtonPrimary>
        </Stack>
      )}

      {/* DEFAULT DELAYS */}
      {kind === VaultUpdateKind.DEFAULT_PROPOSAL_DELAY && (
        <VaultDelayForm
          label="Default Proposal Delay (seconds)"
          onSubmit={(seconds) =>
            onPropose(VaultUpdateKind.DEFAULT_PROPOSAL_DELAY, { type: VaultProposalType.DEFAULT_PROPOSAL_DELAY,  seconds})
          }
        />
      )}

      {kind === VaultUpdateKind.DEFAULT_RELEASE_DELAY && (
        <VaultDelayForm
          label="Default Release Delay (seconds)"
          onSubmit={(seconds) =>
            onPropose(VaultUpdateKind.DEFAULT_RELEASE_DELAY, { type: VaultProposalType.DEFAULT_RELEASE_DELAY,  seconds})
          }
        />
      )}

      {kind === VaultUpdateKind.WITHDRAW_ADDRESS_DELAY && (
        <VaultDelayForm
          label="Withdraw Address Change Delay (seconds)"
          onSubmit={(seconds) =>
            onPropose(VaultUpdateKind.WITHDRAW_ADDRESS_DELAY, { type: VaultProposalType.WITHDRAW_ADDRESS_DELAY,  seconds})
          }
        />
      )}

      {/* WITHDRAW DESTINATION */}
      {kind === VaultUpdateKind.WITHDRAW_ADDRESS && (
        <VaultWithdrawAddressForm
          onSubmit={(address) =>
            onPropose(VaultUpdateKind.WITHDRAW_ADDRESS, { type: VaultProposalType.WITHDRAW_ADDRESS, address })
          }
        />
      )}
    </Stack>
  );
}
