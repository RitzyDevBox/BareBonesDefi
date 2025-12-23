import { useMemo, useState } from "react";
import { ethers } from "ethers";
import ERC20_ABI from "../../abis/ERC20.json";

import { Modal, UXMode } from "../Modal/Modal";
import { VirtualizedList } from "../VirtualizedList/VirtualizedList";
import { Box, Text } from "../BasicComponents";

import { useShimWallet } from "../../hooks/useShimWallet";
import { useTokenList } from "./useTokenList";
import { useCustomTokens } from "./useCustomTokens";
import { TokenRow } from "./TokenRow";
import { TokenInfo } from "./types";
import { CHAIN_NATIVE_SYMBOL } from "../../constants/misc";

interface TokenSelectProps {
  isOpen: boolean;
  onClose: () => void;
  chainId?: number;
  onSelect: (t: TokenInfo) => void;
}


export function TokenSelect({
  isOpen,
  onClose,
  chainId,
  onSelect,
}: TokenSelectProps) {
  const { provider } = useShimWallet();
  const { tokens, loading } = useTokenList(chainId);
  const { customTokens, addCustomToken, removeCustomToken } = useCustomTokens(chainId);

  const [query, setQuery] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const normalizedQuery = query.trim().toLowerCase();

  const isAddressSearch =
    normalizedQuery.startsWith("0x") &&
    normalizedQuery.length === 42 &&
    ethers.utils.isAddress(normalizedQuery);

  const nativeToken: TokenInfo | null = useMemo(() => {
    if (!chainId) return null;

    return {
        chainId,
        address: ethers.constants.AddressZero,
        symbol: CHAIN_NATIVE_SYMBOL[chainId] ?? "NATIVE",
        name: "Native Token",
        decimals: 18,
        logoURI: undefined,
    };
  }, [chainId]);


  const allTokens = useMemo(() => {
    const list: TokenInfo[] = [];

    if (nativeToken) {
        list.push(nativeToken);
    }

    list.push(...customTokens, ...tokens);

    return list.sort((a, b) => {
        // native token always first
        if (a.address === ethers.constants.AddressZero) return -1;
        if (b.address === ethers.constants.AddressZero) return 1;

        const aCustom = customTokens.includes(a);
        const bCustom = customTokens.includes(b);

        if (aCustom !== bCustom) return aCustom ? -1 : 1;
        return a.symbol.localeCompare(b.symbol);
    });
  }, [nativeToken, customTokens, tokens]);


  const filteredTokens = useMemo(() => {
    if (!normalizedQuery) return allTokens;

    return allTokens.filter((t) =>
        t.symbol.toLowerCase().includes(normalizedQuery) ||
        t.name.toLowerCase().includes(normalizedQuery) ||
        t.address.toLowerCase().includes(normalizedQuery)
    );
  }, [allTokens, normalizedQuery]);


  const tokenExists =
    isAddressSearch &&
    allTokens.some(
      (t) => t.address.toLowerCase() === normalizedQuery
    );

  async function importCustomToken(address: string) {
    if (!provider || !chainId) return;

    setImportLoading(true);
    setImportError(null);

    try {
      const erc20 = new ethers.Contract(address, ERC20_ABI, provider);

      const [symbol, decimals] = await Promise.all([
        erc20.symbol(),
        erc20.decimals(),
      ]);

      addCustomToken({
        chainId,
        address,
        symbol,
        name: symbol,
        decimals,
      });
    } catch (err) {
      console.error("Failed to import token:", err);
      setImportError("Failed to fetch token metadata");
    } finally {
      setImportLoading(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Select Token"
      uxMode={UXMode.FixedBody}
      width={520}
      maxWidth={600}
    >
      <Box
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "var(--spacing-sm)",
        }}
      >
        {/* SEARCH */}
        <Box>
          <input
            placeholder="Search by name, symbol, or address"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
                width: "100%",
                boxSizing: "border-box", // 🔑 FIX
                padding: "var(--spacing-md)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--colors-border)",
                background: "var(--colors-background)",
                color: "var(--colors-text-main)",
            }}
          />
        </Box>

        {/* IMPORT CUSTOM TOKEN */}
        {isAddressSearch && !tokenExists && (
          <Box
            onClick={() =>
              !importLoading &&
              importCustomToken(normalizedQuery)
            }
            style={{
              padding: "var(--spacing-md)",
              border: "1px dashed var(--colors-border)",
              borderRadius: "var(--radius-md)",
              cursor: importLoading ? "default" : "pointer",
              opacity: importLoading ? 0.6 : 1,
            }}
          >
            <Text.Body style={{ margin: 0 }}>
              {importLoading
                ? "Importing token…"
                : `Import token at ${normalizedQuery}`}
            </Text.Body>
            {importError && (
              <Text.Body
                style={{
                  margin: 0,
                  color: "var(--colors-error)",
                  fontSize: "0.85em",
                }}
              >
                {importError}
              </Text.Body>
            )}
          </Box>
        )}

        {/* LIST */}
        {loading ? (
          <Box
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--colors-text-muted)",
            }}
          >
            <Text.Body>Loading tokens…</Text.Body>
          </Box>
        ) : (
          <Box style={{ flex: 1, minHeight: 0 }}>
            <VirtualizedList
            items={filteredTokens}
            estimateItemHeight={72}
            showSearch={false}
            renderRow={(token) => {
              const isCustom = customTokens.some(
                (t) => t.address.toLowerCase() === token.address.toLowerCase()
              );

              return (
                <TokenRow
                    token={token}
                    isCustom={isCustom}
                    onRemoveCustom={() => removeCustomToken(token.address)}
                    onSelect={(t) => {
                    onSelect(t);
                    onClose();
                  }}
                />
              );
            }}
          />
          </Box>
        )}
      </Box>
    </Modal>
  );
}
