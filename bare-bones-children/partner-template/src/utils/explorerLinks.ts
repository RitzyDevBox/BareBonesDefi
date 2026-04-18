export function buildExplorerAddressLink(address: string, blockExplorerBase?: string) {
  if (!blockExplorerBase || !address) return null;
  return `${blockExplorerBase.replace(/\/$/, "")}/address/${address}`;
}

export function buildExplorerTxLink(txHash: string, blockExplorerBase?: string) {
  if (!blockExplorerBase || !txHash) return null;
  return `${blockExplorerBase.replace(/\/$/, "")}/tx/${txHash}`;
}
