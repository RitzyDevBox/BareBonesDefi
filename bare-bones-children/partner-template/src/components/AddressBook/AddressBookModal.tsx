import { useMemo, useState } from "react";
import { ethers } from "ethers";
import { Modal } from "../Modal/Modal";
import { Sheet } from "../Primitives/Sheet";
import { Input } from "../BasicComponents";
import { AddressInput } from "../Inputs/AddressInput";
import { CopyButton } from "../Button/Actions/CopyButton";
import { IconButton } from "../Button/IconButton";
import { NavigateIcon } from "../../assets/icons/NavigationIcon";
import { AddrAvatar } from "./AddrAvatar";
import { shortAddress } from "../../utils/formatUtils";
import { ScreenSize, useMediaQuery } from "../../hooks/useMediaQuery";
import { useWalletProvider } from "../../hooks/useWalletProvider";
import { useTokenList } from "../TokenSelect/useTokenList";
import { TokenInfo } from "../TokenSelect/types";
import { CHAIN_INFO_MAP } from "../../constants/misc";
import { buildExplorerAddressLink } from "../../utils/explorerLinks";
import type { ContactsStore } from "./contactsStore";
import type { AddressBookEntry, AddressCategory, AddressKind } from "./types";

interface AddressBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: AddressBookEntry[];
  contactsStore: ContactsStore;
  /** Optional kind filter — when set, hides entries that don't match (used by
   * per-field pickers like wallet-deploy's authorizer/initializer fields). */
  kindFilter?: AddressKind[];
  /** Optional category filter — hides whole tabs that don't match. */
  categoryFilter?: AddressCategory[];
  /** Title shown in the modal header. Defaults to "Address book". */
  title?: string;
  /** Selected handler. Always called with checksummed address + display label. */
  onSelect: (entry: AddressBookEntry) => void;
}

interface TabDef {
  id: AddressCategory | "custom";
  label: string;
  sub: string;
}

const TAB_DEFS: TabDef[] = [
  { id: "connected", label: "You", sub: "Your connected wallet" },
  { id: "core", label: "Core", sub: "Governor, timelock, gov token & authorizer" },
  { id: "wallet", label: "Smart wallets", sub: "Wallets you / the timelock own" },
  { id: "vault", label: "Vaults", sub: "Secure Value Reserve vaults" },
  { id: "tokens", label: "Tokens", sub: "ERC-20 tokens on this chain" },
  { id: "config", label: "System", sub: "System internals" },
  { id: "saved", label: "Saved", sub: "Contacts you added" },
  { id: "custom", label: "Custom", sub: "Paste an address" },
];

const ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/;

/** "Open in explorer" pair to `CopyButton` — same `IconButton` shape so the
 *  two sit on the same baseline in row actions. Renders nothing when there's
 *  no explorer URL to navigate to. */
function ExplorerIconButton({ href }: { href: string | null }) {
  if (!href) return null;
  return (
    <IconButton
      size="sm"
      aria-label="Open in explorer"
      title="Open in explorer"
      onClick={(e) => {
        e.stopPropagation();
        window.open(href, "_blank", "noopener,noreferrer");
      }}
      style={{
        background: "transparent",
        border: "none",
        color: "var(--colors-text-muted)",
      }}
    >
      <NavigateIcon size={14} />
    </IconButton>
  );
}

export function AddressBookModal({
  isOpen,
  onClose,
  entries,
  contactsStore,
  kindFilter,
  categoryFilter,
  title = "Address book",
  onSelect,
}: AddressBookModalProps) {
  const [filter, setFilter] = useState("");
  const [activeTab, setActiveTab] = useState<TabDef["id"]>("core");
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ address: "", name: "", note: "" });
  const [draftError, setDraftError] = useState<string | null>(null);
  // Custom-paste tab: a one-off address the user wants to use without saving.
  const [customAddress, setCustomAddress] = useState("");

  const { chainId } = useWalletProvider();
  // Tokens tab is lazy — only hit coingecko after the user opens it once.
  // After that, useTokenList caches per chainId so subsequent opens are free.
  const [tokensActivated, setTokensActivated] = useState(false);
  const { tokens, loading: tokensLoading } = useTokenList(tokensActivated ? chainId : null);
  const explorerBase = chainId != null ? CHAIN_INFO_MAP[chainId]?.blockExplorerUrls?.[0] : undefined;

  // Filter entries down to what's allowed (kind/category filters), then group.
  const allowedEntries = useMemo(() => {
    return entries.filter((e) => {
      if (kindFilter && !kindFilter.includes(e.kind)) return false;
      if (categoryFilter && !categoryFilter.includes(e.category)) return false;
      return true;
    });
  }, [entries, kindFilter, categoryFilter]);

  const grouped = useMemo(() => {
    const g: Record<AddressCategory, AddressBookEntry[]> = {
      connected: [],
      core: [],
      wallet: [],
      vault: [],
      config: [],
      saved: [],
      tokens: [],
    };
    for (const e of allowedEntries) g[e.category].push(e);
    return g;
  }, [allowedEntries]);

  const tabs = useMemo(() => {
    const result: Array<TabDef & { count: number }> = [];
    for (const t of TAB_DEFS) {
      if (t.id === "custom") {
        if (categoryFilter) continue; // hide custom tab on filtered pickers
        result.push({ ...t, count: 0 });
        continue;
      }
      if (t.id === "tokens") {
        // Hide on filtered pickers; otherwise always show so the user can
        // discover the lazy-loaded list (no count until activated).
        if (categoryFilter || kindFilter) continue;
        result.push({ ...t, count: tokensActivated ? tokens.length : 0 });
        continue;
      }
      const count = grouped[t.id]?.length ?? 0;
      // Always show core (anchor). Drop empty tabs except when no filter is set
      // and the category is structurally meaningful (saved/connected).
      if (count === 0 && t.id !== "core") continue;
      result.push({ ...t, count });
    }
    return result;
  }, [grouped, categoryFilter, kindFilter, tokensActivated, tokens.length]);

  const active = tabs.find((t) => t.id === activeTab) ?? tabs[0];

  // Search scoped to the active tab — keeps the filter localized to what's visible.
  const visibleRows = useMemo(() => {
    if (!active || active.id === "custom" || active.id === "tokens") return [];
    const items = grouped[active.id as AddressCategory] ?? [];
    const q = filter.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        (b.sub ?? "").toLowerCase().includes(q) ||
        b.address.toLowerCase().includes(q)
    );
  }, [active, filter, grouped]);

  const tokenRows = useMemo(() => {
    if (active?.id !== "tokens") return [] as TokenInfo[];
    const q = filter.trim().toLowerCase();
    if (!q) return tokens;
    return tokens.filter(
      (t) =>
        t.symbol.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        t.address.toLowerCase().includes(q)
    );
  }, [active, filter, tokens]);

  const draftAddressValid = ADDRESS_REGEX.test(draft.address.trim());
  const draftAddressIsKnown =
    draftAddressValid &&
    entries.some(
      (e) => e.address.toLowerCase() === draft.address.trim().toLowerCase()
    );

  function handlePick(entry: AddressBookEntry) {
    onSelect(entry);
    onClose();
  }

  function handlePickToken(t: TokenInfo) {
    const checksummed = ethers.utils.getAddress(t.address);
    onSelect({
      id: `tokens:${checksummed.toLowerCase()}`,
      name: t.symbol,
      sub: t.name,
      address: checksummed,
      category: "tokens",
      kind: "erc20",
    });
    onClose();
  }

  function handleAddContact() {
    setDraftError(null);
    if (!draftAddressValid) {
      setDraftError("Address must be 0x followed by 40 hex characters.");
      return;
    }
    if (draftAddressIsKnown) {
      setDraftError("This address is already in your book.");
      return;
    }
    if (!draft.name.trim()) {
      setDraftError("Give the contact a name.");
      return;
    }
    const checksummed = ethers.utils.getAddress(draft.address.trim());
    contactsStore.add({
      address: checksummed,
      name: draft.name.trim(),
      note: draft.note.trim() || undefined,
    });
    setAdding(false);
    setDraft({ address: "", name: "", note: "" });
    // After saving, jump to the Saved tab so the user can see the new entry.
    setActiveTab("saved");
  }

  function handleUseCustomAddress() {
    const trimmed = customAddress.trim();
    if (!ADDRESS_REGEX.test(trimmed)) return;
    const checksummed = ethers.utils.getAddress(trimmed);
    onSelect({
      id: `custom:${checksummed.toLowerCase()}`,
      name: "Custom address",
      sub: "One-off (not saved)",
      address: checksummed,
      category: "saved",
      kind: "custom",
    });
    setCustomAddress("");
    onClose();
  }

  const isMobile = useMediaQuery() === ScreenSize.Phone;

  const body = (
    <div className="bb-tpm-body">
        {active && active.id !== "custom" && !adding && (
          <div className="bb-tpm-search">
            <span aria-hidden>🔍</span>
            <input
              autoFocus
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder={`Search ${active.label.toLowerCase()}…`}
            />
            {filter && (
              <button
                type="button"
                className="bb-icon-btn-sm"
                aria-label="Clear search"
                onClick={() => setFilter("")}
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* Tab bar */}
        <div className="bb-tpm-tabs" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={t.id === activeTab}
              className={`bb-tpm-tab${t.id === activeTab ? " bb-on" : ""}`}
              onClick={() => {
                setActiveTab(t.id);
                setFilter("");
                setAdding(false);
                if (t.id === "tokens") setTokensActivated(true);
              }}
              data-testid={`abk-tab-${t.id}`}
            >
              <span>{t.label}</span>
              {t.id !== "custom" && (
                <span className="bb-tpm-tab-count">{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Rows pane */}
        {active && active.id !== "custom" && active.id !== "tokens" && (
          <div className="bb-tpm-pane">
            <div className="bb-tpm-pane-sub">{active.sub}</div>
            <div className="bb-tpm-rows">
              {visibleRows.length === 0 ? (
                <div className="bb-tpm-empty">
                  <div className="bb-tpm-empty-title">
                    {filter ? "No matches" : `Nothing in ${active.label.toLowerCase()} yet`}
                  </div>
                  <div className="bb-tpm-empty-sub">
                    {filter
                      ? `Try a different search or paste a 0x… address.`
                      : active.id === "saved"
                        ? "Save addresses here for quick reuse."
                        : "Entries will appear as you connect / deploy."}
                  </div>
                </div>
              ) : (
                visibleRows.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    className="bb-tpm-row"
                    onClick={() => handlePick(b)}
                    data-testid={`abk-row-${b.kind}`}
                  >
                    <AddrAvatar address={b.address} name={b.name} size={28} />
                    <div className="bb-tpm-row-k">
                      <span className="bb-tpm-row-name">{b.name}</span>
                      <span className="bb-tpm-row-sub">
                        {b.sub ? `${b.sub} · ` : ""}
                        <span className="bb-mono">{shortAddress(b.address)}</span>
                      </span>
                    </div>
                    <span className="bb-tpm-row-tag">{b.kind}</span>
                    <span className="bb-tpm-row-acts" onClick={(e) => e.stopPropagation()}>
                      <CopyButton value={b.address} ariaLabel="Copy address" />
                      {explorerBase && (
                        <ExplorerIconButton href={buildExplorerAddressLink(b.address, explorerBase)} />
                      )}
                      {b.removable && (
                        <button
                          type="button"
                          className="bb-icon-btn-sm bb-danger"
                          aria-label="Remove contact"
                          onClick={() => contactsStore.remove(b.address)}
                        >
                          ✕
                        </button>
                      )}
                    </span>
                  </button>
                ))
              )}
            </div>

            {/* Saved-contact add panel — toggles the "+ Add contact" affordance. */}
            {active.id === "saved" && adding && (
              <div className="bb-tpm-add">
                <div className="bb-tpm-add-head">
                  <span className="bb-tpm-add-title">Save new contact</span>
                  <button
                    type="button"
                    className="bb-icon-btn-sm"
                    onClick={() => {
                      setAdding(false);
                      setDraft({ address: "", name: "", note: "" });
                      setDraftError(null);
                    }}
                    aria-label="Cancel"
                  >
                    ✕
                  </button>
                </div>
                <div className="bb-tpm-add-grid">
                  <div className="bb-field bb-full">
                    <label>Address</label>
                    <Input
                      className="bb-input bb-mono"
                      placeholder="0x…"
                      value={draft.address}
                      onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))}
                    />
                  </div>
                  <div className="bb-field bb-full">
                    <label>Name</label>
                    <Input
                      placeholder="e.g. Operations multisig"
                      value={draft.name}
                      onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                    />
                  </div>
                  <div className="bb-field bb-full">
                    <label>Note (optional)</label>
                    <Input
                      placeholder="What this address is for"
                      value={draft.note}
                      onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
                    />
                  </div>
                </div>
                {draftError && (
                  <div className="bb-banner bb-banner-warn">
                    <span aria-hidden>⚠</span>
                    <div>{draftError}</div>
                    <span />
                  </div>
                )}
                <div className="bb-tpm-add-actions">
                  <button
                    type="button"
                    className="bb-btn-ghost bb-btn-xs"
                    onClick={() => {
                      setAdding(false);
                      setDraft({ address: "", name: "", note: "" });
                      setDraftError(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="bb-btn-primary bb-btn-xs"
                    onClick={handleAddContact}
                  >
                    Save contact
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tokens pane — lazy-loaded ERC-20s from the curated coingecko list
            (same source as TokenSelect). Selection wraps as an AddressBookEntry
            with kind "erc20" so downstream consumers stay uniform. */}
        {active && active.id === "tokens" && (
          <div className="bb-tpm-pane">
            <div className="bb-tpm-pane-sub">{active.sub}</div>
            <div className="bb-tpm-rows">
              {tokensLoading ? (
                <div className="bb-tpm-empty">
                  <div className="bb-tpm-empty-title">Loading tokens…</div>
                </div>
              ) : tokenRows.length === 0 ? (
                <div className="bb-tpm-empty">
                  <div className="bb-tpm-empty-title">
                    {filter ? "No matches" : "No tokens available for this chain"}
                  </div>
                </div>
              ) : (
                tokenRows.map((t) => (
                  <button
                    key={t.address}
                    type="button"
                    className="bb-tpm-row"
                    onClick={() => handlePickToken(t)}
                    data-testid={`abk-row-token`}
                  >
                    {t.logoURI ? (
                      <img
                        src={t.logoURI}
                        alt=""
                        width={28}
                        height={28}
                        style={{ borderRadius: "50%", background: "var(--colors-border)" }}
                      />
                    ) : (
                      <AddrAvatar address={t.address} name={t.symbol} size={28} />
                    )}
                    <div className="bb-tpm-row-k">
                      <span className="bb-tpm-row-name">{t.symbol}</span>
                      <span className="bb-tpm-row-sub">
                        {t.name} · <span className="bb-mono">{shortAddress(t.address)}</span>
                      </span>
                    </div>
                    <span className="bb-tpm-row-tag">erc20</span>
                    <span className="bb-tpm-row-acts" onClick={(e) => e.stopPropagation()}>
                      <CopyButton value={t.address} ariaLabel="Copy token address" />
                      {explorerBase && (
                        <ExplorerIconButton href={buildExplorerAddressLink(t.address, explorerBase)} />
                      )}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Custom-paste pane */}
        {active && active.id === "custom" && (
          <div className="bb-tpm-pane">
            <div className="bb-tpm-pane-sub">
              Use any address as the target — no need to save it.
            </div>
            <div className="bb-tpm-custom">
              <div className="bb-field bb-full">
                <label>Address</label>
                <AddressInput
                  className="bb-input bb-mono"
                  value={customAddress}
                  onChange={(e) => setCustomAddress(e.target.value)}
                />
              </div>
              <div className="bb-tpm-custom-actions">
                <button
                  type="button"
                  className="bb-btn-primary bb-btn-xs"
                  disabled={!ADDRESS_REGEX.test(customAddress.trim())}
                  onClick={handleUseCustomAddress}
                  data-testid="abk-custom-use"
                >
                  Use this address →
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bb-tpm-foot">
          <span className="bb-tpm-foot-meta">
            {entries.length} {entries.length === 1 ? "entry" : "entries"} total
          </span>
          {active?.id === "saved" && !adding && (
            <button
              type="button"
              className="bb-btn-ghost bb-btn-xs"
              onClick={() => setAdding(true)}
              data-testid="abk-add-contact"
            >
              + Add contact
            </button>
          )}
        </div>
      </div>
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onClose={onClose} placement="bottom">
        {/* Sheet has no built-in title slot — render one inside the body. */}
        <div className="bb-tpm-sheet-head">
          <span className="bb-tpm-sheet-title">{title}</span>
          <button
            type="button"
            className="bb-icon-btn-sm"
            aria-label="Close"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        {body}
      </Sheet>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} width={580} maxWidth="92vw">
      {body}
    </Modal>
  );
}
