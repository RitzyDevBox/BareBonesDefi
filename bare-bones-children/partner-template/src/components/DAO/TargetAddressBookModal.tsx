import { useMemo } from "react";
import { Modal } from "../Modal/Modal";
import { Stack } from "../Primitives";
import { Text } from "../Primitives/Text";
import { GridItem, GridSelector } from "../Selector/CardGridSelector";
import { shortAddress } from "../../utils/formatUtils";
import { TokenSelect } from "../TokenSelect/TokenSelect";
import type { TokenInfo } from "../TokenSelect/types";
import type { AddressBookTargetType } from "../../hooks/dao/useProposalAddressBook";

interface TargetAddressBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: AddressBookTargetType;
  configFilter?: "authorizer" | "initializer" | "factory" | null;
  chainId: number | null;
  governorAddress: string;
  timelockAddress: string;
  userWalletAddresses: string[];
  timelockWalletAddresses: string[];
  vaultAddresses: string[];
  configAddresses?: Array<{ address: string; label: string }>;
  loadingUserWallets?: boolean;
  loadingTimelockWallets?: boolean;
  loadingVaults?: boolean;
  onSelectAddress: (address: string, label?: string) => void;
}

function AddressGrid({
  items,
  onSelect,
}: {
  items: Array<{ id: string; title: string; subtitle?: string }>;
  onSelect: (address: string, label?: string) => void;
}) {
  const gridItems: GridItem[] = useMemo(
    () =>
      items.map((item) => ({
        id: item.id,
        content: (
          <>
            <Text.Title style={{ fontSize: "1rem" }}>{item.title}</Text.Title>
            <Text.Body size="sm" color="muted">{item.subtitle ?? shortAddress(item.id)}</Text.Body>
          </>
        ),
      })),
    [items]
  );

  return (
    <GridSelector
      items={gridItems}
      onSelect={(item) => {
        const matched = items.find((entry) => entry.id.toLowerCase() === item.id.toLowerCase());
        onSelect(item.id, matched?.title);
      }}
    />
  );
}

export function TargetAddressBookModal({
  isOpen,
  onClose,
  targetType,
  configFilter,
  chainId,
  governorAddress,
  timelockAddress,
  timelockWalletAddresses,
  vaultAddresses,
  configAddresses,
  loadingTimelockWallets,
  loadingVaults,
  onSelectAddress,
}: TargetAddressBookModalProps) {
  function handleSelectAndClose(address: string, label?: string) {
    onSelectAddress(address, label);
    onClose();
  }

  return (
    <>
      <Modal isOpen={isOpen && targetType !== "token"} onClose={onClose} title="Open Address Book" width={640} maxWidth={720}>
        <Stack gap="md">
          {targetType === "governance" ? (
            <>
              <Text.Body color="muted">Select a governance contract target.</Text.Body>
              <AddressGrid
                items={[
                  { id: governorAddress, title: "Governor", subtitle: shortAddress(governorAddress) },
                ]}
                onSelect={handleSelectAndClose}
              />
            </>
          ) : null}

          {targetType === "timelock" ? (
            <>
              <Text.Body color="muted">Select a timelock contract target.</Text.Body>
              {timelockAddress ? (
                <AddressGrid
                  items={[{ id: timelockAddress, title: "Timelock", subtitle: shortAddress(timelockAddress) }]}
                  onSelect={handleSelectAndClose}
                />
              ) : (
                <Text.Body color="warn">Timelock address unavailable.</Text.Body>
              )}
            </>
          ) : null}

          {targetType === "wallet" ? (
            <>
              <Text.Body color="muted">Select a smart wallet (owned by timelock).</Text.Body>
              {loadingTimelockWallets ? (
                <Text.Body size="sm" color="muted">Loading timelock wallets…</Text.Body>
              ) : timelockWalletAddresses.length === 0 ? (
                <Text.Body color="warn">No wallets owned by timelock found.</Text.Body>
              ) : (
                <AddressGrid
                  items={timelockWalletAddresses.map((address: string, index: number) => ({
                    id: address,
                    title: `Wallet #${index}`,
                    subtitle: shortAddress(address),
                  }))}
                  onSelect={handleSelectAndClose}
                />
              )}
            </>
          ) : null}

          {targetType === "vault" ? (
            <>
              <Text.Body color="muted">Select a Secure Value Reserve vault address.</Text.Body>
              {loadingVaults ? (
                <Text.Body size="sm" color="muted">Loading vaults…</Text.Body>
              ) : vaultAddresses.length === 0 ? (
                <Text.Body color="warn">No vaults found for your wallets.</Text.Body>
              ) : (
                <AddressGrid
                  items={vaultAddresses.map((address: string, index: number) => ({
                    id: address,
                    title: `Vault #${index}`,
                    subtitle: shortAddress(address),
                  }))}
                  onSelect={handleSelectAndClose}
                />
              )}
            </>
          ) : null}

          {targetType === "custom" ? (
            <Text.Body color="muted">Type a target address manually or select from wallets/vaults via action group.</Text.Body>
          ) : null}

          {targetType === "config" ? (
            <>
              <Text.Body color="muted">Select a standard configuration address.</Text.Body>
              {configAddresses && configAddresses.length > 0 ? (
                <AddressGrid
                  items={configAddresses
                    .filter((item) => {
                      if (configFilter === "authorizer") {
                        const label = item.label.toLowerCase();
                        return label.includes("owner authority resolver") || label.includes("nft authority resolver");
                      }

                      if (configFilter === "initializer") {
                        return item.label.toLowerCase().includes("initializer");
                      }

                      if (configFilter === "factory") {
                        return item.label.toLowerCase().includes("diamond factory");
                      }

                      return true;
                    })
                    .map((item) => ({
                    id: item.address,
                    title: item.label,
                    subtitle: shortAddress(item.address),
                  }))}
                  onSelect={handleSelectAndClose}
                />
              ) : (
                <Text.Body color="warn">No configuration addresses available.</Text.Body>
              )}
            </>
          ) : null}
        </Stack>
      </Modal>

      <TokenSelect
        isOpen={isOpen && targetType === "token"}
        onClose={onClose}
        chainId={chainId}
        hideNative
        onSelect={(token: TokenInfo) => {
          onSelectAddress(token.address, token.symbol || token.name || "Token");
          onClose();
        }}
      />
    </>
  );
}
