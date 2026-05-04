import { CHAIN_INFO_MAP } from "../../constants/misc";
import { shortAddress } from "../../utils/formatUtils";
import { useActiveOrganization } from "../../providers/ActiveOrganizationProvider";
import { DaoAvatar } from "../Header/DaoAvatar";
import { ImageWithFallback } from "../ImageWithFallback";
import { ButtonPrimary } from "../Button/ButtonPrimary";

interface ContextPillProps {
  account: string | null;
  chainId: number | null;
  onConnectWallet: () => void;
  /** Opens the wallet/network/org sheet. Only invoked when an account is connected. */
  onOpen: () => void;
}

/**
 * Mobile/tablet unified header control. Combines the DAO, chain, and wallet
 * pills into one tap target so the user can still see their working scope
 * (which org · which chain · which wallet) without burning the header on
 * three separate buttons.
 *
 * Connected → renders three segments and opens WalletAccountSheet on click.
 * Disconnected → renders a single accent-colored "Connect wallet" CTA.
 */
export function ContextPill({ account, chainId, onConnectWallet, onOpen }: ContextPillProps) {
  if (!account) {
    return (
      <ButtonPrimary size="sm" onClick={onConnectWallet}>
        Connect
      </ButtonPrimary>
    );
  }

  return <ConnectedPill account={account} chainId={chainId} onOpen={onOpen} />;
}

function ConnectedPill({
  account,
  chainId,
  onOpen,
}: {
  account: string;
  chainId: number | null;
  onOpen: () => void;
}) {
  const { activeOrgSlug } = useActiveOrganization();
  const currentChain = chainId != null ? CHAIN_INFO_MAP[chainId] ?? null : null;
  const orgLabel = activeOrgSlug || "No org";

  return (
    <button
      type="button"
      className="bb-ctx-pill"
      onClick={onOpen}
      aria-label="Open organization, network, and wallet"
    >
      <span className="bb-ctx-seg bb-ctx-seg-dao">
        <DaoAvatar slug={activeOrgSlug || "?"} size={20} />
        <span className="bb-ctx-dao-name">{orgLabel}</span>
      </span>

      <span className="bb-ctx-seg bb-ctx-seg-chain" title={currentChain?.chainName}>
        {currentChain?.logoUrl ? (
          <ImageWithFallback
            src={currentChain.logoUrl}
            fallbackText={currentChain.chainName[0]}
            size={14}
            style={{ flexShrink: 0 }}
          />
        ) : (
          <span className="bb-ctx-chain-dot" />
        )}
        <span className="bb-ctx-chain-label">
          {currentChain?.chainName || "Unknown"}
        </span>
      </span>

      <span className="bb-ctx-seg bb-ctx-seg-wallet">
        <span className="bb-ctx-wallet-avatar" />
        <span className="bb-ctx-wallet-addr">{shortAddress(account)}</span>
      </span>
    </button>
  );
}
