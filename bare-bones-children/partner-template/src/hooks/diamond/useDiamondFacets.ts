import { useEffect, useState } from "react";
import { ethers } from "ethers";
import DiamondLoupeABI from "../../abis/diamond/facets/DiamondLoupeFacet.abi.json";

export interface FacetInfo {
  facetAddress: string;
  selectors: string[];
}

export function useDiamondFacets(
  provider: ethers.providers.Web3Provider | null | undefined,
  diamondAddress: string | null | undefined
) {
  const [facets, setFacets] = useState<FacetInfo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadFacets() {
      if (!provider || !diamondAddress) {
        if (isActive) {
          setFacets([]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);

      try {
        // Check if the address is a valid contract
        const code = await provider.getCode(diamondAddress);
        if (code === "0x") {
          if (isActive) setFacets([]);
          return;
        }

        const diamond = new ethers.Contract(
          diamondAddress,
          DiamondLoupeABI as any,
          provider
        );

        try {
          const facetAddresses = await diamond.facetAddresses();
          const facetList: FacetInfo[] = [];

          for (const facetAddr of facetAddresses) {
            try {
              const selectors = await diamond.facetFunctionSelectors(facetAddr);
              facetList.push({
                facetAddress: ethers.utils.getAddress(String(facetAddr)),
                selectors: (selectors as string[]).map((s) => String(s)),
              });
            } catch {
              // Skip this facet if we can't get its selectors
            }
          }

          if (isActive) setFacets(facetList);
        } catch {
          // Diamond loupe not available; set empty list
          if (isActive) setFacets([]);
        }
      } catch {
        if (isActive) setFacets([]);
      } finally {
        if (isActive) setLoading(false);
      }
    }

    void loadFacets();

    return () => {
      isActive = false;
    };
  }, [provider, diamondAddress]);

  return { facets, loading };
}
