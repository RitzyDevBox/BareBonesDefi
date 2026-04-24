import { useEffect, useState } from "react";
import { ethers } from "ethers";
import DAOGovernorABI from "../../abis/dao/DAOGovernor.abi.json";
import type { DaoProposalSummary } from "../../components/DAO/types";

type Params = {
  governorAddress: string;
  activeProposals: DaoProposalSummary[];
  account: string | null | undefined;
  provider: ethers.providers.Web3Provider | null | undefined;
  version: number;
};

type Result = {
  votePowerByProposalId: Record<string, string>;
  hasVotedByProposalId: Record<string, boolean>;
};

export function useDaoVoteStatus({ governorAddress, activeProposals, account, provider, version }: Params): Result {
  const [votePowerByProposalId, setVotePowerByProposalId] = useState<Record<string, string>>({});
  const [hasVotedByProposalId, setHasVotedByProposalId] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let isActive = true;

    async function loadVoteStatus() {
      if (!provider || !governorAddress || !account || !activeProposals.length) {
        if (!isActive) return;
        setVotePowerByProposalId({});
        setHasVotedByProposalId({});
        return;
      }

      try {
        const governor = new ethers.Contract(governorAddress, DAOGovernorABI as any, provider);
        const entries = await Promise.all(
          activeProposals.map(async (proposal) => {
            try {
              const [hasVoted, votingPower] = await Promise.all([
                governor.hasVoted(proposal.id, account),
                governor.getVotes(account, proposal.snapshot),
              ]);
              return {
                proposalId: proposal.id,
                hasVoted: Boolean(hasVoted),
                votingPower: ethers.BigNumber.from(votingPower).toString(),
              };
            } catch {
              return { proposalId: proposal.id, hasVoted: false, votingPower: "0" };
            }
          })
        );

        if (!isActive) return;
        const nextHasVoted: Record<string, boolean> = {};
        const nextVotingPower: Record<string, string> = {};
        for (const entry of entries) {
          nextHasVoted[entry.proposalId] = entry.hasVoted;
          nextVotingPower[entry.proposalId] = entry.votingPower;
        }
        setHasVotedByProposalId(nextHasVoted);
        setVotePowerByProposalId(nextVotingPower);
      } catch {
        if (!isActive) return;
        setVotePowerByProposalId({});
        setHasVotedByProposalId({});
      }
    }

    void loadVoteStatus();
    return () => { isActive = false; };
  }, [provider, governorAddress, account, activeProposals, version]);

  return { votePowerByProposalId, hasVotedByProposalId };
}
