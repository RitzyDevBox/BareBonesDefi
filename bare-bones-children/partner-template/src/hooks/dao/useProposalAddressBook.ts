import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import DAOGovernorABI from "../../abis/dao/DAOGovernor.abi.json";
import { computeDiamondAddress } from "../../utils/computeDiamondAddress";
import { useWalletProvider } from "../useWalletProvider";
import { useUserWalletCount } from "../wallet/useUserWalletCount";
import { fetchWalletVaultAddresses } from "../vaults/useWalletVaults";
import { getBareBonesConfiguration } from "../../constants/misc";

export type AddressBookTargetType =
  | "governance"
  | "token"
  | "wallet"
  | "vault"
  | "timelock"
  | "config"
  | "custom";

export interface LabeledAddress {
  address: string;
  label: string;
}

export function useProposalAddressBook(governorAddress: string) {
  const { provider, account, chainId } = useWalletProvider();
  const { count: walletCount, loading: loadingWalletCount } = useUserWalletCount();

  const [timelockAddress, setTimelockAddress] = useState<string>("");
  const [timelockWalletAddresses, setTimelockWalletAddresses] = useState<string[]>([]);
  const [loadingTimelockWallets, setLoadingTimelockWallets] = useState(false);
  const [vaultAddresses, setVaultAddresses] = useState<string[]>([]);
  const [loadingVaults, setLoadingVaults] = useState(false);

  const userWalletAddresses = useMemo(() => {
    if (!account || chainId == null || walletCount == null || walletCount <= 0) {
      return [] as string[];
    }

    const next: string[] = [];
    for (let index = 0; index < walletCount; index += 1) {
      next.push(computeDiamondAddress(account, index, chainId));
    }

    return next;
  }, [account, chainId, walletCount]);

  useEffect(() => {
    let isActive = true;

    async function loadTimelock() {
      if (!provider || !governorAddress) {
        if (isActive) setTimelockAddress("");
        return;
      }

      try {
        const governor = new ethers.Contract(governorAddress, DAOGovernorABI as any, provider);
        const next = await governor.timelock();
        if (!isActive) return;
        setTimelockAddress(ethers.utils.getAddress(String(next)));
      } catch {
        if (!isActive) return;
        setTimelockAddress("");
      }
    }

    void loadTimelock();

    return () => {
      isActive = false;
    };
  }, [provider, governorAddress]);

  useEffect(() => {
    let isActive = true;

    async function loadAllVaults() {
      if (!provider || chainId == null || userWalletAddresses.length === 0) {
        if (isActive) {
          setVaultAddresses([]);
          setLoadingVaults(false);
        }
        return;
      }

      setLoadingVaults(true);

      try {
        const byWallet = await Promise.all(
          userWalletAddresses.map((walletAddress) =>
            fetchWalletVaultAddresses(provider, chainId, walletAddress).catch(() => [] as string[])
          )
        );

        if (!isActive) return;

        const unique = new Set<string>();
        byWallet.flat().forEach((address) => {
          try {
            unique.add(ethers.utils.getAddress(address));
          } catch {
            // ignore invalid addresses
          }
        });

        setVaultAddresses(Array.from(unique));
      } catch {
        if (!isActive) return;
        setVaultAddresses([]);
      } finally {
        if (isActive) setLoadingVaults(false);
      }
    }

    void loadAllVaults();

    return () => {
      isActive = false;
    };
  }, [provider, chainId, userWalletAddresses]);

  useEffect(() => {
    let isActive = true;

    async function loadTimelockWallets() {
      if (!provider || chainId == null || !timelockAddress) {
        if (isActive) {
          setTimelockWalletAddresses([]);
          setLoadingTimelockWallets(false);
        }
        return;
      }

      setLoadingTimelockWallets(true);

      try {
        // Timelock address is owned by itself; compute its wallets deterministically
        // Assume timelock has a wallet count stored or derive from governance
        // For now, we'll assume timelock can own wallets using same scheme
        // Note: This assumes timelock address acts as an "owner" for wallet derivation
        const wallets: string[] = [];
        
        // Try to derive first wallet; if it exists on chain, add it
        // This is a simplified approach - the timelock's wallets would be deterministically derived
        const firstWallet = computeDiamondAddress(timelockAddress, 0, chainId);
        const codeAtFirstWallet = await provider.getCode(firstWallet);
        
        if (codeAtFirstWallet !== "0x") {
          wallets.push(firstWallet);
          
          // Try up to 10 wallets
          for (let i = 1; i < 10; i++) {
            const walletAddr = computeDiamondAddress(timelockAddress, i, chainId);
            const code = await provider.getCode(walletAddr);
            if (code === "0x") break;
            wallets.push(walletAddr);
          }
        }

        if (!isActive) return;
        setTimelockWalletAddresses(wallets);
      } catch {
        if (!isActive) return;
        setTimelockWalletAddresses([]);
      } finally {
        if (isActive) setLoadingTimelockWallets(false);
      }
    }

    void loadTimelockWallets();

    return () => {
      isActive = false;
    };
  }, [provider, chainId, timelockAddress]);

  const configAddresses = useMemo(() => {
    if (chainId == null) return [] as LabeledAddress[];

    const config = getBareBonesConfiguration(chainId);
    return [
      { address: config.ownerAuthorityResolverAddress, label: "Owner Authority Resolver" },
      { address: config.nftAuthorityResolverAddress, label: "NFT Authority Resolver" },
      { address: config.walletKernelInitializer, label: "Wallet Kernel Initializer" },
      { address: config.globalOrganizationRegistry, label: "Global Organization Registry" },
      { address: config.facetFallbackFailureHook, label: "Facet Fallback Failure Hook" },
      { address: config.barebones4337Facet, label: "Barebones 4337 Facet (Calibur Entry)" },
      { address: config.diamondFactoryAddress, label: "Diamond Factory" },
    ];
  }, [chainId]);

  return {
    userWalletAddresses,
    timelockWalletAddresses,
    vaultAddresses,
    timelockAddress,
    loadingWalletCount,
    loadingTimelockWallets,
    loadingVaults,
    configAddresses,
  };
}
