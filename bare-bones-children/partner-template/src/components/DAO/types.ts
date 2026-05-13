export type DaoGovernanceOverview = {
  onchainName: string;
  tokenAddress: string;
  timelockAddress: string;
  votingDelay: string;
  votingPeriod: string;
  proposalThreshold: string;
  quorumRatio: string;
  clockMode: string;
  clock: string;
  minDelay: string;
  connectedIsExecutor: boolean;
  openExecutor: boolean;
  connectedIsCanceller?: boolean;
  openCanceller?: boolean;
  executorRoleMembers?: string[];
};

export interface DaoProposalSummary {
  id: string;
  proposer: string;
  description: string;
  targets: string[];
  values: string[];
  calldatas: string[];
  voteStart: string;
  voteEnd: string;
  snapshot: string;
  deadline: string;
  state: number;
  stateLabel: string;
  txHash: string;
  blockNumber: number;
  forVotes: string;
  againstVotes: string;
  abstainVotes: string;
  timeLeftLabel?: string;
  decodedCalls?: string[];
  voteTxHash?: string;
  executeReadyAt?: string;
  executeReady?: boolean;
  executeReadyLabel?: string;
}

export interface ProposalCallArgPreview {
  /** Parameter name as it appears in the ABI (or "arg{i}" for unnamed). */
  name: string;
  /** Short, human-readable rendering of the value — utf-8-decoded bytes32,
   *  shortened addresses, decimal uints, array lengths, etc. Display only;
   *  the source-of-truth value is encoded into `calldata`. */
  display: string;
}

export interface ProposalCall {
  target: string;
  calldata: string;
  functionSignature: string;
  valueWei: string;
  /** Decoded arg preview shown in the staged-call row. Omitted for non-ABI
   *  presets (native transfer etc.) where there's nothing useful to show. */
  argsPreview?: ProposalCallArgPreview[];
}

export interface ProposalBuildPayload {
  description: string;
  calls: ProposalCall[];
}
