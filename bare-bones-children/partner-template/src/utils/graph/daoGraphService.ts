import { CHAIN_SVR_SUBGRAPH_URL } from "../../constants/misc";
import { graphQuery } from "./graphClient";

const DAO_GOVERNORS_BY_NAMES_QUERY = `
  query DAOGovernorsByName($names: [String!]) {
    daogovernorInstances(first: 500, where: { name_in: $names }, orderBy: createdAt, orderDirection: desc) {
      id
      name
      txHash
      createdAt
      proposalCount
      deployer
      namespace
    }
  }
`;

const DAO_GOVERNOR_BY_ADDRESS_QUERY = `
  query DAOGovernorByAddress($id: ID!) {
    daogovernorInstance(id: $id) {
      id
      name
      txHash
      createdAt
      proposalCount
      deployer
      namespace
    }
  }
`;

const DAO_PROPOSALS_BY_ADDRESS_QUERY = `
  query DAOProposalsByAddress($dao: Bytes!) {
    daoproposals(first: 500, where: { dao: $dao }, orderBy: createdAt, orderDirection: desc) {
      id
      dao
      proposalId
      proposer
      targets
      values
      signatures
      calldatas
      description
      voteStart
      voteEnd
      status
      createdAt
      createdTxHash
      queuedAt
      queuedTxHash
      executedAt
      executedTxHash
      canceledAt
      canceledTxHash
    }
  }
`;

const DAO_VOTES_BY_ADDRESS_QUERY = `
  query DAOVotesByAddress($dao: Bytes!, $first: Int!, $skip: Int!) {
    daovotes(first: $first, skip: $skip, where: { dao: $dao }, orderBy: createdAt, orderDirection: desc) {
      id
      proposalId
      voter
      support
      weight
      createdAt
      txHash
    }
  }
`;

export type DaoGovernorGraphRow = {
  id: string;
  name: string | null;
  txHash: string;
  createdAt: string;
  proposalCount: string;
  deployer: string;
  namespace: string;
};

export type DaoProposalGraphRow = {
  id: string;
  dao: string;
  proposalId: string;
  proposer: string;
  targets: string[];
  values: string[];
  signatures: string[];
  calldatas: string[];
  description: string;
  voteStart: string;
  voteEnd: string;
  status: string;
  createdAt: string;
  createdTxHash: string;
  queuedAt: string | null;
  queuedTxHash: string | null;
  executedAt: string | null;
  executedTxHash: string | null;
  canceledAt: string | null;
  canceledTxHash: string | null;
};

export type DaoVoteGraphRow = {
  id: string;
  proposalId: string;
  voter: string;
  support: number;
  weight: string;
  createdAt: string;
  txHash: string;
};

type DaoGovernorsByNamesResult = {
  daogovernorInstances: DaoGovernorGraphRow[];
};

type DaoGovernorByAddressResult = {
  daogovernorInstance: DaoGovernorGraphRow | null;
};

type DaoProposalsByAddressResult = {
  daoproposals: DaoProposalGraphRow[];
};

type DaoVotesByAddressResult = {
  daovotes: DaoVoteGraphRow[];
};

function graphUrlForChain(chainId: number) {
  const url = CHAIN_SVR_SUBGRAPH_URL[chainId];
  if (!url) throw new Error("Unsupported chain");
  return url;
}

export async function fetchDaoGovernorsByNames(chainId: number, names: string[]) {
  if (!names.length) return [];

  const normalizedNames = Array.from(new Set(names.map((name) => name.trim()).filter(Boolean)));
  if (!normalizedNames.length) return [];

  const result = await graphQuery<DaoGovernorsByNamesResult>(
    graphUrlForChain(chainId),
    DAO_GOVERNORS_BY_NAMES_QUERY,
    { names: normalizedNames }
  );

  return result.daogovernorInstances ?? [];
}

export async function fetchDaoGovernorByAddress(chainId: number, governorAddress: string) {
  const result = await graphQuery<DaoGovernorByAddressResult>(
    graphUrlForChain(chainId),
    DAO_GOVERNOR_BY_ADDRESS_QUERY,
    { id: governorAddress.toLowerCase() }
  );

  return result.daogovernorInstance;
}

export async function fetchDaoProposalsByGovernor(chainId: number, governorAddress: string) {
  const result = await graphQuery<DaoProposalsByAddressResult>(
    graphUrlForChain(chainId),
    DAO_PROPOSALS_BY_ADDRESS_QUERY,
    { dao: governorAddress.toLowerCase() }
  );

  return result.daoproposals ?? [];
}

export async function fetchDaoVotesByGovernor(chainId: number, governorAddress: string) {
  const pageSize = 1000;
  let skip = 0;
  const allVotes: DaoVoteGraphRow[] = [];

  while (true) {
    const result = await graphQuery<DaoVotesByAddressResult>(
      graphUrlForChain(chainId),
      DAO_VOTES_BY_ADDRESS_QUERY,
      {
        dao: governorAddress.toLowerCase(),
        first: pageSize,
        skip,
      }
    );

    const page = result.daovotes ?? [];
    allVotes.push(...page);

    if (page.length < pageSize) break;
    skip += pageSize;
  }

  return allVotes;
}
