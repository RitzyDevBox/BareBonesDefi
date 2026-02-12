// graphQueries.ts

export const VAULT_GOVERNANCE_QUERY = `
  query VaultGovernance($vault: Bytes!) {
    svrpolicyProposeds(where: { svr: $vault }) {
      id
      createdAt
      delay
      kind
      windowSeconds
      proposalDelaySeconds
      value
      scopeKind
      assetType
      asset
      assetId
    }

    svrpolicyExecuteds(where: { svr: $vault }) {
      id
      executedAt
      kind
      windowSeconds
      proposalDelaySeconds
      value
      scopeKind
      assetType
      asset
      assetId
    }

    svrpolicyCancelleds(where: { svr: $vault }) {
        id
        scopeKind
        svr
        cancelledAt
        assetType
        assetId
        asset
    }
    svrslotProposeds(where: { svr: $vault }) {
      id
      selector
      newValue
      delay
      createdAt
    }

    svrslotExecuteds(where: { svr: $vault }) {
      id
      selector
      executedAt
    }

    svrslotCancelleds(where: { svr: $vault }) {
      id
      selector
      cancelledAt
    }
  }
`;
