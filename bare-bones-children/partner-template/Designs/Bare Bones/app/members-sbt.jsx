// Members module — Page 6: Identity Anchor (SBT) panel
// Replaces the placeholder MdSbt in members-detail.jsx.
// The SBT is the on-chain identity record. It binds KYC attestations and role grants
// to a non-transferable token. This panel is the "show me the receipt" surface —
// token metadata, attestations, role bindings, transfer-block proof, lifecycle log.

function MdSbt({ member, onRevoke }) {
  const sbt = member.sbt;
  const status = sbt.status;  // active | pending | suspended | revoked

  // Pending state — token not yet minted
  if (status === 'pending') {
    return <SbtPendingState member={member} />;
  }

  // Otherwise: full identity record
  const attestations = buildAttestations(member);
  const lifecycle = buildLifecycle(member);
  const tokenIdHex = '0x' + (sbt.tokenId || 0).toString(16).padStart(4, '0');
  const tokenUri = `ipfs://bafkreig${(sbt.tokenId || 0).toString(36)}identity${(member.id || '').slice(-6)}`;

  return (
    <div className="md-section">
      <div className="md-section-head">
        <div>
          <div className="kicker">Identity anchor</div>
          <h3 className="md-section-title">Soulbound token (SBT)</h3>
          <p className="md-section-desc">
            Non-transferable on-chain record binding this member's identity, KYC attestations,
            and role grants. Burning the SBT cleanly revokes all authority in a single transaction.
          </p>
        </div>
        <div className="sbt-status-banner" data-status={status}>
          <span className="sbt-status-dot"></span>
          <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>{status}</span>
        </div>
      </div>

      {status === 'suspended' && (
        <div className="sbt-banner sbt-banner-warn">
          <I.Warn size={14} stroke={1.8} />
          <div>
            <b>Authority suspended.</b>
            <span style={{ color: 'var(--text-mute)' }}> The SBT is locked from voting and transaction signing. Reinstate to restore role bindings without re-issuing the token.</span>
          </div>
        </div>
      )}
      {status === 'revoked' && (
        <div className="sbt-banner sbt-banner-error">
          <I.X size={14} stroke={1.8} />
          <div>
            <b>SBT burned.</b>
            <span style={{ color: 'var(--text-mute)' }}> Token is permanently destroyed on-chain. All role bindings are released. A new SBT must be minted to restore membership.</span>
          </div>
        </div>
      )}

      {/* Token card — visual representation of the SBT itself */}
      <div className="sbt-grid">
        <SbtTokenCard member={member} tokenIdHex={tokenIdHex} tokenUri={tokenUri} />

        <div className="sbt-meta-card">
          <div className="kicker">Token metadata</div>
          <div className="sbt-meta-table">
            <div className="sbt-meta-row">
              <span className="sbt-meta-label mono">Token ID</span>
              <span className="sbt-meta-val mono">#{sbt.tokenId} <span style={{ color: 'var(--text-mute)' }}>· {tokenIdHex}</span></span>
            </div>
            <div className="sbt-meta-row">
              <span className="sbt-meta-label mono">Standard</span>
              <span className="sbt-meta-val mono">ERC-5114 (soulbound)</span>
            </div>
            <div className="sbt-meta-row">
              <span className="sbt-meta-label mono">Contract</span>
              <span className="sbt-meta-val mono">{sbt.contract}</span>
            </div>
            <div className="sbt-meta-row">
              <span className="sbt-meta-label mono">Owner</span>
              <span className="sbt-meta-val mono">{shortAddr(member.wallet.address)}</span>
            </div>
            <div className="sbt-meta-row">
              <span className="sbt-meta-label mono">Minted</span>
              <span className="sbt-meta-val mono">{sbt.mintedAt}</span>
            </div>
            <div className="sbt-meta-row">
              <span className="sbt-meta-label mono">tokenURI</span>
              <span className="sbt-meta-val mono sbt-uri" title={tokenUri}>{tokenUri}</span>
            </div>
          </div>

          <div className="sbt-actions">
            <button className="btn-ghost btn-sm" onClick={() => {
              navigator.clipboard?.writeText(sbt.contract);
              window.toast?.success?.('Contract copied', { duration: 1500 });
            }}>
              <I.Copy size={12} /> Copy contract
            </button>
            <button className="btn-ghost btn-sm" onClick={() => window.toast?.info?.('Opening explorer…', { duration: 1500 })}>
              <I.Ext size={12} /> View on-chain
            </button>
          </div>
        </div>
      </div>

      {/* Transfer-block proof — explains soulbound */}
      <div className="sbt-block-proof">
        <div className="sbt-block-icon">
          <I.Bolt size={14} stroke={1.8} />
        </div>
        <div className="sbt-block-body">
          <div className="sbt-block-title">Soulbound · transfer-blocked</div>
          <div className="sbt-block-desc">
            The contract overrides <span className="mono">_beforeTokenTransfer</span> to revert on any
            non-mint, non-burn transition. This token cannot be sold, traded, or moved. It only
            exists at this address until burned.
          </div>
        </div>
        <div className="sbt-block-code mono">
          <span style={{ color: 'var(--text-mute)' }}>{`function _beforeTokenTransfer(`}</span>
          <br />
          <span style={{ paddingLeft: 16, color: 'var(--text-mute)' }}>{`address from, address to, uint256`}</span>
          <br />
          <span style={{ color: 'var(--text-mute)' }}>{`) internal override {`}</span>
          <br />
          <span style={{ paddingLeft: 16, color: 'var(--accent)' }}>{`require(from == address(0) || to == address(0), "SBT");`}</span>
          <br />
          <span style={{ color: 'var(--text-mute)' }}>{`}`}</span>
        </div>
      </div>

      {/* Attestations */}
      <div className="sbt-block">
        <div className="sbt-block-head">
          <div>
            <div className="kicker">Attestations</div>
            <div className="sbt-block-subtitle">
              Verifiable claims signed by attestors and bound to this token.
            </div>
          </div>
          <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-mute)' }}>
            {attestations.length} attached
          </span>
        </div>
        <div className="sbt-att-list">
          {attestations.map((a, i) => (
            <SbtAttestation key={i} att={a} />
          ))}
        </div>
      </div>

      {/* On-chain role bindings */}
      <div className="sbt-block">
        <div className="sbt-block-head">
          <div>
            <div className="kicker">On-chain role bindings</div>
            <div className="sbt-block-subtitle">
              Roles granted to this token. Each binding is a separate <span className="mono">grantRole</span> tx.
            </div>
          </div>
          <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-mute)' }}>
            {member.roles.length} active
          </span>
        </div>
        {member.roles.length === 0 ? (
          <div className="amw-empty mono" style={{ padding: 16 }}>No role bindings on this token.</div>
        ) : (
          <div className="sbt-binding-list">
            {member.roles.map(rid => {
              const role = (window.ROLES_SEED || []).find(r => r.id === rid);
              if (!role) return null;
              return (
                <div key={rid} className="sbt-binding-row">
                  <div className="sbt-binding-hash mono">
                    {roleHash(rid)}
                  </div>
                  <div className="sbt-binding-name">
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{role.name}</div>
                    <div className="mono" style={{ fontSize: 11, color: 'var(--text-mute)' }}>
                      {role.id} · {role.permissions.length} permission{role.permissions.length === 1 ? '' : 's'}
                    </div>
                  </div>
                  <div className="sbt-binding-tx mono">
                    tx {fakeTxHash(member.id + rid)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lifecycle */}
      <div className="sbt-block">
        <div className="sbt-block-head">
          <div>
            <div className="kicker">Lifecycle</div>
            <div className="sbt-block-subtitle">
              Mint, attestation, and binding events for this token.
            </div>
          </div>
        </div>
        <div className="sbt-lifecycle">
          {lifecycle.map((e, i) => (
            <div key={i} className="sbt-lc-row">
              <div className={`sbt-lc-dot sbt-lc-${e.kind}`}></div>
              <div className="sbt-lc-body">
                <div className="sbt-lc-event">{e.event}</div>
                <div className="sbt-lc-meta mono">
                  {e.when}
                  {e.tx && <> · {e.tx}</>}
                </div>
              </div>
              <div className={`sbt-lc-tag mono sbt-lc-tag-${e.kind}`}>{e.kind}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Danger zone */}
      {(status === 'active' || status === 'suspended') && (
        <div className="sbt-danger">
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>Burn this SBT</div>
            <div style={{ fontSize: 12, color: 'var(--text-mute)', marginTop: 2, lineHeight: 1.5 }}>
              Permanently destroys the token. Releases all role bindings, voids attestations,
              and marks this member as departed. Cannot be undone.
            </div>
          </div>
          <button className="btn-danger btn-sm" onClick={() => {
            if (confirm(`Burn SBT #${sbt.tokenId}? This is permanent and cannot be undone.`)) {
              onRevoke?.();
            }
          }}>
            <I.X size={13} /> Burn token
          </button>
        </div>
      )}
    </div>
  );
}

// ── Pending state ───────────────────────────────────────────────────────────
function SbtPendingState({ member }) {
  return (
    <div className="md-section">
      <div className="md-section-head">
        <div>
          <div className="kicker">Identity anchor</div>
          <h3 className="md-section-title">SBT pending mint</h3>
          <p className="md-section-desc">
            This member's identity token has not been minted yet. The token will be issued
            automatically once {member.kyc?.required ? 'KYC verification completes' : 'the invitation is accepted'}.
          </p>
        </div>
      </div>

      <div className="sbt-pending-card">
        <div className="sbt-pending-illo">
          <div className="sbt-pending-token">
            <div className="sbt-pending-token-inner">
              <div className="mono" style={{ fontSize: 9, opacity: .6 }}>SBT</div>
              <div className="mono" style={{ fontSize: 10, marginTop: 2 }}>—</div>
            </div>
          </div>
        </div>
        <div className="sbt-pending-flow">
          <SbtPendingStep i={1} label="Invitation sent"
            done={true} desc={`${member.email} received onboarding link.`} />
          {member.kyc?.required && (
            <SbtPendingStep i={2} label="KYC verification"
              done={member.kyc?.status === 'verified'}
              active={member.kyc?.status === 'pending'}
              desc={member.kyc?.status === 'verified'
                ? 'Identity verified by attestor.'
                : 'Awaiting attestor signature on identity claim.'} />
          )}
          <SbtPendingStep i={member.kyc?.required ? 3 : 2} label="Mint SBT"
            done={false}
            desc="Token will be minted to wallet on completion." />
          <SbtPendingStep i={member.kyc?.required ? 4 : 3} label="Bind roles"
            done={false}
            desc={`${member.roles.length} role binding${member.roles.length === 1 ? '' : 's'} queued.`} />
        </div>
      </div>
    </div>
  );
}

function SbtPendingStep({ i, label, done, active, desc }) {
  return (
    <div className={`sbt-pending-step${done ? ' done' : active ? ' active' : ''}`}>
      <div className="sbt-pending-num mono">
        {done ? <I.CheckC size={12} /> : i}
      </div>
      <div>
        <div className="sbt-pending-label">{label}</div>
        <div className="sbt-pending-desc">{desc}</div>
      </div>
    </div>
  );
}

// ── Token card visual ───────────────────────────────────────────────────────
function SbtTokenCard({ member, tokenIdHex, tokenUri }) {
  const hue = member.avatarHue || 220;
  const status = member.sbt.status;
  return (
    <div className={`sbt-token-card sbt-token-${status}`}
         style={{ '--token-hue': hue }}>
      <div className="sbt-token-corner sbt-token-corner-tl"></div>
      <div className="sbt-token-corner sbt-token-corner-tr"></div>
      <div className="sbt-token-corner sbt-token-corner-bl"></div>
      <div className="sbt-token-corner sbt-token-corner-br"></div>

      <div className="sbt-token-head">
        <span className="sbt-token-kind mono">SBT · ERC-5114</span>
        <span className="sbt-token-id mono">{tokenIdHex}</span>
      </div>

      <div className="sbt-token-glyph">
        <SbtGlyph hue={hue} status={status} />
      </div>

      <div className="sbt-token-foot">
        <div className="sbt-token-name">{member.name}</div>
        <div className="sbt-token-sub mono">
          {member.accountType} · {member.jurisdiction}
        </div>
        <div className="sbt-token-band mono">
          soulbound · non-transferable
        </div>
      </div>
    </div>
  );
}

function SbtGlyph({ hue, status }) {
  const dim = status === 'revoked' || status === 'suspended';
  // A concentric ring + node motif. SVG, no images.
  return (
    <svg viewBox="0 0 120 120" width="100%" height="100%" aria-hidden="true">
      <defs>
        <radialGradient id="sbtg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={`oklch(0.7 0.18 ${hue})`} stopOpacity={dim ? 0.25 : 0.95} />
          <stop offset="80%" stopColor={`oklch(0.4 0.12 ${hue})`} stopOpacity={dim ? 0.15 : 0.4} />
          <stop offset="100%" stopColor={`oklch(0.3 0.08 ${hue})`} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="sbtl" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={`oklch(0.78 0.16 ${hue})`} stopOpacity={dim ? 0.4 : 1} />
          <stop offset="100%" stopColor={`oklch(0.5 0.14 ${(hue + 40) % 360})`} stopOpacity={dim ? 0.25 : 0.85} />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="56" fill="url(#sbtg)" />
      {/* Concentric rings */}
      <circle cx="60" cy="60" r="44" fill="none" stroke="url(#sbtl)" strokeWidth="0.7" opacity="0.7" />
      <circle cx="60" cy="60" r="34" fill="none" stroke="url(#sbtl)" strokeWidth="0.7" opacity="0.85" />
      <circle cx="60" cy="60" r="24" fill="none" stroke="url(#sbtl)" strokeWidth="1" />
      {/* Inner core */}
      <circle cx="60" cy="60" r="14" fill="url(#sbtl)" opacity={dim ? 0.5 : 0.95} />
      <circle cx="60" cy="60" r="14" fill="none" stroke={`oklch(0.95 0.05 ${hue})`} strokeWidth="0.6" opacity={dim ? 0.3 : 0.8} />
      {/* Orbital nodes */}
      {[0, 60, 120, 180, 240, 300].map((deg, i) => {
        const r = 34;
        const x = 60 + r * Math.cos((deg - 90) * Math.PI / 180);
        const y = 60 + r * Math.sin((deg - 90) * Math.PI / 180);
        return <circle key={i} cx={x} cy={y} r="1.8"
          fill={`oklch(0.85 0.15 ${hue})`} opacity={dim ? 0.4 : 1} />;
      })}
      {/* Revoked: cross overlay */}
      {status === 'revoked' && (
        <g stroke="oklch(0.6 0.2 25)" strokeWidth="2" opacity="0.85" strokeLinecap="round">
          <line x1="30" y1="30" x2="90" y2="90" />
          <line x1="90" y1="30" x2="30" y2="90" />
        </g>
      )}
    </svg>
  );
}

// ── Attestation row ─────────────────────────────────────────────────────────
function SbtAttestation({ att }) {
  return (
    <div className="sbt-att">
      <div className="sbt-att-head">
        <div className="sbt-att-icon">
          <I.CheckC size={12} />
        </div>
        <div className="sbt-att-title-block">
          <div className="sbt-att-title">{att.claim}</div>
          <div className="sbt-att-meta mono">
            attestor: {att.attestor} · {att.when}
          </div>
        </div>
        <div className={`sbt-att-state sbt-att-${att.state}`}>{att.state}</div>
      </div>
      {att.fields && att.fields.length > 0 && (
        <div className="sbt-att-fields">
          {att.fields.map((f, i) => (
            <div key={i} className="sbt-att-field">
              <span className="sbt-att-field-key mono">{f.k}</span>
              <span className="sbt-att-field-val mono">{f.v}</span>
            </div>
          ))}
        </div>
      )}
      <div className="sbt-att-sig mono" title={att.sig}>
        sig: {att.sig.slice(0, 18)}…{att.sig.slice(-16)}
      </div>
    </div>
  );
}

// ── Builders / utils ────────────────────────────────────────────────────────
function buildAttestations(member) {
  const out = [];
  // Identity attestation (from KYC if applicable, else self-claim)
  if (member.kyc?.required) {
    out.push({
      claim: 'Identity verified',
      attestor: 'Sumsub · attestor #0xC3',
      when: member.sbt.mintedAt || member.dateAdded,
      state: member.kyc?.status === 'verified' ? 'valid' : 'pending',
      fields: [
        { k: 'name_match', v: 'true' },
        { k: 'jurisdiction', v: member.jurisdiction },
        { k: 'level', v: 'KYC2' },
      ],
      sig: '0x' + sha(member.id + 'identity').slice(0, 64),
    });
  } else {
    out.push({
      claim: 'Self-attested identity',
      attestor: member.wallet.address.slice(0, 14),
      when: member.dateAdded,
      state: 'valid',
      fields: [
        { k: 'method', v: 'wallet-signed claim' },
        { k: 'jurisdiction', v: member.jurisdiction },
      ],
      sig: '0x' + sha(member.id + 'self').slice(0, 64),
    });
  }
  // Account-type attestation
  out.push({
    claim: `Member type: ${member.accountType}`,
    attestor: 'DAO governance · 0xDAo1',
    when: member.dateAdded,
    state: member.onboardingStatus === 'departed' ? 'revoked' : 'valid',
    fields: [
      { k: 'account_type', v: member.accountType },
      { k: 'onboarded_via', v: 'governance vote #47' },
    ],
    sig: '0x' + sha(member.id + 'type').slice(0, 64),
  });
  return out;
}

function buildLifecycle(member) {
  const out = [];
  out.push({
    kind: 'mint',
    event: `Token #${member.sbt.tokenId} minted to ${shortAddr(member.wallet.address)}`,
    when: member.sbt.mintedAt || member.dateAdded,
    tx: 'tx ' + fakeTxHash(member.id + 'mint'),
  });
  if (member.kyc?.required && member.kyc?.status === 'verified') {
    out.push({
      kind: 'attest',
      event: 'Identity attestation attached',
      when: member.sbt.mintedAt || member.dateAdded,
      tx: 'tx ' + fakeTxHash(member.id + 'attest'),
    });
  }
  member.roles.forEach((rid, i) => {
    const role = (window.ROLES_SEED || []).find(r => r.id === rid);
    if (!role) return;
    out.push({
      kind: 'bind',
      event: `Role granted: ${role.name}`,
      when: member.sbt.mintedAt || member.dateAdded,
      tx: 'tx ' + fakeTxHash(member.id + 'bind' + i),
    });
  });
  if (member.onboardingStatus === 'suspended' || member.sbt.status === 'suspended') {
    out.push({
      kind: 'suspend',
      event: 'Authority suspended by governance',
      when: 'Apr 24, 2026',
      tx: 'tx ' + fakeTxHash(member.id + 'suspend'),
    });
  }
  if (member.sbt.status === 'revoked') {
    out.push({
      kind: 'burn',
      event: 'Token burned · all bindings released',
      when: 'Apr 11, 2026',
      tx: 'tx ' + fakeTxHash(member.id + 'burn'),
    });
  }
  return out;
}

function roleHash(roleId) {
  // Mock keccak("ROLE_NAME") -> 0x… 8 bytes
  const h = sha(roleId.toUpperCase());
  return '0x' + h.slice(0, 16) + '…';
}

function fakeTxHash(seed) {
  return '0x' + sha(seed).slice(0, 8) + '…' + sha(seed + '_tail').slice(0, 4);
}

function sha(s) {
  // Tiny non-crypto hash → hex string. Stable, repeatable, looks like a hash.
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // Repeat to get a long-enough string
  let out = '';
  let cur = h >>> 0;
  for (let i = 0; i < 16; i++) {
    out += cur.toString(16).padStart(8, '0');
    cur = Math.imul(cur ^ i, 0x01000193) >>> 0;
  }
  return out;
}

Object.assign(window, { MdSbt });
