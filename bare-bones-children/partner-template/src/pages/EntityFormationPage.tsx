import { useMemo } from "react";
import { EntityFormation } from "../components/EntityFormation/EntityFormation";
import { useWalletProvider } from "../hooks/useWalletProvider";
import { CHAIN_INFO_MAP } from "../constants/misc";

export function EntityFormationPage() {
  const { account, chainId, connect } = useWalletProvider();

  const chain = useMemo(() => {
    if (chainId == null) return undefined;
    const info = CHAIN_INFO_MAP[chainId];
    return { name: info?.chainName, chainId };
  }, [chainId]);

  return (
    <EntityFormation
      chain={chain}
      wallet={account ? { address: account } : undefined}
      onConnectWallet={() => {
        void connect();
      }}
    />
  );
}
