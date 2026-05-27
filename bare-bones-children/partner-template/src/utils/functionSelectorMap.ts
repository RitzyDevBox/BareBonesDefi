// AUTO-GENERATED FILE. DO NOT EDIT.
// Regenerate via: npm run extract-function-selectors
//
// Maps 4-byte function selectors to their { contract, name, signature } so
// proposal-display surfaces can show "MultiTenantAuth.execute(...)" in O(1)
// without trying every loaded Interface against parseTransaction.

export interface FunctionSelectorEntry {
  /** Source ABI's contract name (filename basename minus extensions). */
  contract: string;
  /** Function name only — useful for the short label. */
  name: string;
  /** Pretty-printed signature with param names where available — useful
   *  for tooltips and the verbose-mode display. */
  signature: string;
}

export const FUNCTION_SELECTOR_MAP: Record<string, FunctionSelectorEntry> = {
  "0x00fdd58e": {
    "contract": "ERC1155",
    "name": "balanceOf",
    "signature": "balanceOf(address account,uint256 id)"
  },
  "0x4e1273f4": {
    "contract": "ERC1155",
    "name": "balanceOfBatch",
    "signature": "balanceOfBatch(address[] accounts,uint256[] ids)"
  },
  "0xe985e9c5": {
    "contract": "ERC1155",
    "name": "isApprovedForAll",
    "signature": "isApprovedForAll(address account,address operator)"
  },
  "0x2eb2c2d6": {
    "contract": "ERC1155",
    "name": "safeBatchTransferFrom",
    "signature": "safeBatchTransferFrom(address from,address to,uint256[] ids,uint256[] values,bytes data)"
  },
  "0xf242432a": {
    "contract": "ERC1155",
    "name": "safeTransferFrom",
    "signature": "safeTransferFrom(address from,address to,uint256 id,uint256 value,bytes data)"
  },
  "0xa22cb465": {
    "contract": "ERC1155",
    "name": "setApprovalForAll",
    "signature": "setApprovalForAll(address operator,bool approved)"
  },
  "0x01ffc9a7": {
    "contract": "ERC1155",
    "name": "supportsInterface",
    "signature": "supportsInterface(bytes4 interfaceId)"
  },
  "0x0e89341c": {
    "contract": "ERC1155",
    "name": "uri",
    "signature": "uri(uint256 arg0)"
  },
  "0x313ce567": {
    "contract": "ERC20",
    "name": "decimals",
    "signature": "decimals()"
  },
  "0x95d89b41": {
    "contract": "ERC20",
    "name": "symbol",
    "signature": "symbol()"
  },
  "0x06fdde03": {
    "contract": "ERC20",
    "name": "name",
    "signature": "name()"
  },
  "0x70a08231": {
    "contract": "ERC20",
    "name": "balanceOf",
    "signature": "balanceOf(address owner)"
  },
  "0x095ea7b3": {
    "contract": "ERC20",
    "name": "approve",
    "signature": "approve(address spender,uint256 amount)"
  },
  "0xdd62ed3e": {
    "contract": "ERC20",
    "name": "allowance",
    "signature": "allowance(address owner,address spender)"
  },
  "0x18160ddd": {
    "contract": "ERC20",
    "name": "totalSupply",
    "signature": "totalSupply()"
  },
  "0x8da5cb5b": {
    "contract": "ERC20",
    "name": "owner",
    "signature": "owner()"
  },
  "0xa9059cbb": {
    "contract": "ERC20",
    "name": "transfer",
    "signature": "transfer(address to,uint256 amount)"
  },
  "0x23b872dd": {
    "contract": "ERC20",
    "name": "transferFrom",
    "signature": "transferFrom(address from,address to,uint256 amount)"
  },
  "0x081812fc": {
    "contract": "IERC721",
    "name": "getApproved",
    "signature": "getApproved(uint256 tokenId)"
  },
  "0x6352211e": {
    "contract": "IERC721",
    "name": "ownerOf",
    "signature": "ownerOf(uint256 tokenId)"
  },
  "0x42842e0e": {
    "contract": "IERC721",
    "name": "safeTransferFrom",
    "signature": "safeTransferFrom(address from,address to,uint256 tokenId)"
  },
  "0xb88d4fde": {
    "contract": "IERC721",
    "name": "safeTransferFrom",
    "signature": "safeTransferFrom(address from,address to,uint256 tokenId,bytes data)"
  },
  "0xd0f2d8ac": {
    "contract": "MintExecutor",
    "name": "execute",
    "signature": "execute(tuple order,bytes callbackData)"
  },
  "0xe5135ec6": {
    "contract": "MintExecutor",
    "name": "executeBatch",
    "signature": "executeBatch(tuple[] orders,bytes callbackData)"
  },
  "0x49caa54f": {
    "contract": "MintExecutor",
    "name": "fakeToken",
    "signature": "fakeToken()"
  },
  "0xab572650": {
    "contract": "MintExecutor",
    "name": "reactor",
    "signature": "reactor()"
  },
  "0x585da628": {
    "contract": "MintExecutor",
    "name": "reactorCallback",
    "signature": "reactorCallback(tuple[] orders,bytes arg1)"
  },
  "0xf2fde38b": {
    "contract": "MintExecutor",
    "name": "transferOwnership",
    "signature": "transferOwnership(address newOwner)"
  },
  "0x252dba42": {
    "contract": "Multicall3",
    "name": "aggregate",
    "signature": "aggregate(tuple[] calls)"
  },
  "0x82ad56cb": {
    "contract": "Multicall3",
    "name": "aggregate3",
    "signature": "aggregate3(tuple[] calls)"
  },
  "0x174dea71": {
    "contract": "Multicall3",
    "name": "aggregate3Value",
    "signature": "aggregate3Value(tuple[] calls)"
  },
  "0xc3077fa9": {
    "contract": "Multicall3",
    "name": "blockAndAggregate",
    "signature": "blockAndAggregate(tuple[] calls)"
  },
  "0x3e64a696": {
    "contract": "Multicall3",
    "name": "getBasefee",
    "signature": "getBasefee()"
  },
  "0xee82ac5e": {
    "contract": "Multicall3",
    "name": "getBlockHash",
    "signature": "getBlockHash(uint256 blockNumber)"
  },
  "0x42cbb15c": {
    "contract": "Multicall3",
    "name": "getBlockNumber",
    "signature": "getBlockNumber()"
  },
  "0x3408e470": {
    "contract": "Multicall3",
    "name": "getChainId",
    "signature": "getChainId()"
  },
  "0xa8b0574e": {
    "contract": "Multicall3",
    "name": "getCurrentBlockCoinbase",
    "signature": "getCurrentBlockCoinbase()"
  },
  "0x72425d9d": {
    "contract": "Multicall3",
    "name": "getCurrentBlockDifficulty",
    "signature": "getCurrentBlockDifficulty()"
  },
  "0x86d516e8": {
    "contract": "Multicall3",
    "name": "getCurrentBlockGasLimit",
    "signature": "getCurrentBlockGasLimit()"
  },
  "0x0f28c97d": {
    "contract": "Multicall3",
    "name": "getCurrentBlockTimestamp",
    "signature": "getCurrentBlockTimestamp()"
  },
  "0x4d2301cc": {
    "contract": "Multicall3",
    "name": "getEthBalance",
    "signature": "getEthBalance(address addr)"
  },
  "0x27e86d6e": {
    "contract": "Multicall3",
    "name": "getLastBlockHash",
    "signature": "getLastBlockHash()"
  },
  "0xbce38bd7": {
    "contract": "Multicall3",
    "name": "tryAggregate",
    "signature": "tryAggregate(bool requireSuccess,tuple[] calls)"
  },
  "0x399542e9": {
    "contract": "Multicall3",
    "name": "tryBlockAndAggregate",
    "signature": "tryBlockAndAggregate(bool requireSuccess,tuple[] calls)"
  },
  "0x3644e515": {
    "contract": "Permit2",
    "name": "DOMAIN_SEPARATOR",
    "signature": "DOMAIN_SEPARATOR()"
  },
  "0x927da105": {
    "contract": "Permit2",
    "name": "allowance",
    "signature": "allowance(address arg0,address arg1,address arg2)"
  },
  "0x87517c45": {
    "contract": "Permit2",
    "name": "approve",
    "signature": "approve(address token,address spender,uint160 amount,uint48 expiration)"
  },
  "0x65d9723c": {
    "contract": "Permit2",
    "name": "invalidateNonces",
    "signature": "invalidateNonces(address token,address spender,uint48 newNonce)"
  },
  "0x3ff9dcb1": {
    "contract": "Permit2",
    "name": "invalidateUnorderedNonces",
    "signature": "invalidateUnorderedNonces(uint256 wordPos,uint256 mask)"
  },
  "0xcc53287f": {
    "contract": "Permit2",
    "name": "lockdown",
    "signature": "lockdown(tuple[] approvals)"
  },
  "0x4fe02b44": {
    "contract": "Permit2",
    "name": "nonceBitmap",
    "signature": "nonceBitmap(address arg0,uint256 arg1)"
  },
  "0x2a2d80d1": {
    "contract": "Permit2",
    "name": "permit",
    "signature": "permit(address owner,tuple permitBatch,bytes signature)"
  },
  "0x2b67b570": {
    "contract": "Permit2",
    "name": "permit",
    "signature": "permit(address owner,tuple permitSingle,bytes signature)"
  },
  "0x23896096": {
    "contract": "Permit2",
    "name": "permitTransferFrom",
    "signature": "permitTransferFrom(tuple permit,address owner,tuple[] transferDetails,bytes signature)"
  },
  "0x7d4a8c52": {
    "contract": "Permit2",
    "name": "permitTransferFrom",
    "signature": "permitTransferFrom(tuple permit,address owner,address to,uint256 requestedAmount,bytes signature)"
  },
  "0x679b7206": {
    "contract": "Permit2",
    "name": "permitWitnessTransferFrom",
    "signature": "permitWitnessTransferFrom(tuple permit,address owner,address to,uint256 requestedAmount,bytes32 witness,string witnessTypeName,string witnessType,bytes signature)"
  },
  "0x8edb050b": {
    "contract": "Permit2",
    "name": "permitWitnessTransferFrom",
    "signature": "permitWitnessTransferFrom(tuple permit,address owner,tuple[] transferDetails,bytes32 witness,string witnessTypeName,string witnessType,bytes signature)"
  },
  "0x9fc0d7da": {
    "contract": "Permit2",
    "name": "transferFrom",
    "signature": "transferFrom(address token,address from,address to,uint160 amount)"
  },
  "0xeebea6a4": {
    "contract": "Permit2",
    "name": "transferFrom",
    "signature": "transferFrom(address from,tuple[] transferDetails)"
  },
  "0x63fb0b96": {
    "contract": "SwapRouter02Executor",
    "name": "multicall",
    "signature": "multicall(address[] tokensToApprove,bytes[] multicallData)"
  },
  "0x89a3f136": {
    "contract": "SwapRouter02Executor",
    "name": "unwrapWETH",
    "signature": "unwrapWETH(address recipient)"
  },
  "0x690d8320": {
    "contract": "SwapRouter02Executor",
    "name": "withdrawETH",
    "signature": "withdrawETH(address recipient)"
  },
  "0x2e1a7d4d": {
    "contract": "WETH",
    "name": "withdraw",
    "signature": "withdraw(uint256 wad)"
  },
  "0xd0e30db0": {
    "contract": "WETH",
    "name": "deposit",
    "signature": "deposit()"
  },
  "0x75b238fc": {
    "contract": "MultiTenantAuth",
    "name": "ADMIN_ROLE",
    "signature": "ADMIN_ROLE()"
  },
  "0x764fbedd": {
    "contract": "MultiTenantAuth",
    "name": "MEMBER_MANAGER_ROLE",
    "signature": "MEMBER_MANAGER_ROLE()"
  },
  "0xe63ab1e9": {
    "contract": "MultiTenantAuth",
    "name": "PAUSER_ROLE",
    "signature": "PAUSER_ROLE()"
  },
  "0x357b750b": {
    "contract": "MultiTenantAuth",
    "name": "PAYROLL_OPERATOR_ROLE",
    "signature": "PAYROLL_OPERATOR_ROLE()"
  },
  "0x0125a425": {
    "contract": "MultiTenantAuth",
    "name": "PERMISSION_MANAGER_ROLE",
    "signature": "PERMISSION_MANAGER_ROLE()"
  },
  "0xc6b54b3c": {
    "contract": "MultiTenantAuth",
    "name": "ROLE_MANAGER_ROLE",
    "signature": "ROLE_MANAGER_ROLE()"
  },
  "0x4460bdd6": {
    "contract": "MultiTenantAuth",
    "name": "SUPER_ADMIN_ROLE",
    "signature": "SUPER_ADMIN_ROLE()"
  },
  "0x5cc95ee8": {
    "contract": "MultiTenantAuth",
    "name": "TREASURY_OPERATOR_ROLE",
    "signature": "TREASURY_OPERATOR_ROLE()"
  },
  "0xf851a440": {
    "contract": "MultiTenantAuth",
    "name": "admin",
    "signature": "admin()"
  },
  "0x39fad8bb": {
    "contract": "MultiTenantAuth",
    "name": "assignRoles",
    "signature": "assignRoles(bytes32 slug,uint256[] memberIds,bytes32[] roleSlugs_)"
  },
  "0x5a89d63c": {
    "contract": "MultiTenantAuth",
    "name": "attachPermissionsToRole",
    "signature": "attachPermissionsToRole(bytes32 slug,bytes32 roleSlug,uint256[] permIds)"
  },
  "0x5a2c70f0": {
    "contract": "MultiTenantAuth",
    "name": "bootstrap",
    "signature": "bootstrap(bytes32 slug,address superAdmin,bytes32 superAdminNameSlug,tuple[] initialAdmins)"
  },
  "0x9a7e0a95": {
    "contract": "MultiTenantAuth",
    "name": "bootstrapped",
    "signature": "bootstrapped(bytes32 arg0)"
  },
  "0x006b67fc": {
    "contract": "MultiTenantAuth",
    "name": "cancelClaim",
    "signature": "cancelClaim(address target)"
  },
  "0xaa7e6722": {
    "contract": "MultiTenantAuth",
    "name": "claimOrgContract",
    "signature": "claimOrgContract(bytes32 slug,address target)"
  },
  "0x56999043": {
    "contract": "MultiTenantAuth",
    "name": "clearTargetGrants",
    "signature": "clearTargetGrants(bytes32 slug,bytes32[] roleSlugs_,address[] targets)"
  },
  "0x630c58ba": {
    "contract": "MultiTenantAuth",
    "name": "configure",
    "signature": "configure(bytes32 slug,bytes[] calls)"
  },
  "0x83cb035a": {
    "contract": "MultiTenantAuth",
    "name": "contractOrg",
    "signature": "contractOrg(address arg0)"
  },
  "0x6818b365": {
    "contract": "MultiTenantAuth",
    "name": "createAndAttachPermissions",
    "signature": "createAndAttachPermissions(bytes32 slug,bytes32 roleSlug,tuple[] perms)"
  },
  "0x2435dab9": {
    "contract": "MultiTenantAuth",
    "name": "createPermissions",
    "signature": "createPermissions(bytes32 slug,tuple[] perms)"
  },
  "0x94ce56d5": {
    "contract": "MultiTenantAuth",
    "name": "createRoles",
    "signature": "createRoles(bytes32 slug,bytes32[] roleSlugs_,tuple[] rolesIn)"
  },
  "0x294bdf7d": {
    "contract": "MultiTenantAuth",
    "name": "customRoleSlugs",
    "signature": "customRoleSlugs(bytes32 slug)"
  },
  "0x59a0d8ba": {
    "contract": "MultiTenantAuth",
    "name": "customRolesCount",
    "signature": "customRolesCount(bytes32 slug)"
  },
  "0x51a88c47": {
    "contract": "MultiTenantAuth",
    "name": "deletePermissions",
    "signature": "deletePermissions(bytes32 slug,uint256[] permIds)"
  },
  "0x1f948048": {
    "contract": "MultiTenantAuth",
    "name": "deleteRoles",
    "signature": "deleteRoles(bytes32 slug,bytes32[] roleSlugs_)"
  },
  "0x2e18e7fc": {
    "contract": "MultiTenantAuth",
    "name": "detachPermissionsFromRole",
    "signature": "detachPermissionsFromRole(bytes32 slug,bytes32 roleSlug,uint256[] permIds)"
  },
  "0x81dcea6a": {
    "contract": "MultiTenantAuth",
    "name": "execute",
    "signature": "execute(bytes32 slug,address target,bytes data,bytes options)"
  },
  "0x8a891c16": {
    "contract": "MultiTenantAuth",
    "name": "fallbackAuthorizer",
    "signature": "fallbackAuthorizer(bytes32 arg0)"
  },
  "0xab3545e5": {
    "contract": "MultiTenantAuth",
    "name": "getMember",
    "signature": "getMember(uint256 memberId)"
  },
  "0xb3c3b471": {
    "contract": "MultiTenantAuth",
    "name": "getRole",
    "signature": "getRole(bytes32 slug,bytes32 roleSlug)"
  },
  "0x2cb9181a": {
    "contract": "MultiTenantAuth",
    "name": "headers",
    "signature": "headers(bytes32 arg0,uint256 arg1)"
  },
  "0xd832d0c8": {
    "contract": "MultiTenantAuth",
    "name": "isFoundation",
    "signature": "isFoundation(address arg0)"
  },
  "0x32a16f4e": {
    "contract": "MultiTenantAuth",
    "name": "isLocked",
    "signature": "isLocked(bytes32 slug)"
  },
  "0x241b71bb": {
    "contract": "MultiTenantAuth",
    "name": "isPaused",
    "signature": "isPaused(bytes32 slug)"
  },
  "0xea4e4074": {
    "contract": "MultiTenantAuth",
    "name": "isPublicSig",
    "signature": "isPublicSig(bytes32 arg0,address arg1,bytes4 arg2)"
  },
  "0xf1ef4441": {
    "contract": "MultiTenantAuth",
    "name": "isSystemRole",
    "signature": "isSystemRole(bytes32 roleSlug)"
  },
  "0x16eebd1e": {
    "contract": "MultiTenantAuth",
    "name": "launcher",
    "signature": "launcher()"
  },
  "0xc3ba2901": {
    "contract": "MultiTenantAuth",
    "name": "lockSlug",
    "signature": "lockSlug(bytes32 slug)"
  },
  "0xe74d0881": {
    "contract": "MultiTenantAuth",
    "name": "memberCountOf",
    "signature": "memberCountOf(bytes32 slug)"
  },
  "0xb69e20f1": {
    "contract": "MultiTenantAuth",
    "name": "memberCountWithRole",
    "signature": "memberCountWithRole(bytes32 slug,bytes32 roleSlug)"
  },
  "0xc054a356": {
    "contract": "MultiTenantAuth",
    "name": "memberIdByNameSlug",
    "signature": "memberIdByNameSlug(bytes32 slug,bytes32 nameSlug)"
  },
  "0xe290798a": {
    "contract": "MultiTenantAuth",
    "name": "memberIdOf",
    "signature": "memberIdOf(bytes32 slug,address wallet)"
  },
  "0x0ee886b1": {
    "contract": "MultiTenantAuth",
    "name": "memberIdsForSlug",
    "signature": "memberIdsForSlug(bytes32 slug)"
  },
  "0x7a60da53": {
    "contract": "MultiTenantAuth",
    "name": "memberIdsWithRole",
    "signature": "memberIdsWithRole(bytes32 slug,bytes32 roleSlug)"
  },
  "0xee6aa5b9": {
    "contract": "MultiTenantAuth",
    "name": "nextPermissionId",
    "signature": "nextPermissionId(bytes32 arg0)"
  },
  "0x343c63f0": {
    "contract": "MultiTenantAuth",
    "name": "onboardMembers",
    "signature": "onboardMembers(bytes32 slug,tuple[] inits)"
  },
  "0x31a9d355": {
    "contract": "MultiTenantAuth",
    "name": "onboardPayees",
    "signature": "onboardPayees(bytes32 slug,tuple[] inits)"
  },
  "0xc7b961e3": {
    "contract": "MultiTenantAuth",
    "name": "pauseSlug",
    "signature": "pauseSlug(bytes32 slug)"
  },
  "0x75e7b2ec": {
    "contract": "MultiTenantAuth",
    "name": "payrollManagerFoundation",
    "signature": "payrollManagerFoundation()"
  },
  "0x0ef4b248": {
    "contract": "MultiTenantAuth",
    "name": "pendingClaim",
    "signature": "pendingClaim(address arg0)"
  },
  "0x79dc1bac": {
    "contract": "MultiTenantAuth",
    "name": "permissionOptions",
    "signature": "permissionOptions(bytes32 arg0,uint256 arg1)"
  },
  "0x4ab3f969": {
    "contract": "MultiTenantAuth",
    "name": "permissionRoleSlugs",
    "signature": "permissionRoleSlugs(bytes32 slug,uint256 permId)"
  },
  "0x24f3a3c3": {
    "contract": "MultiTenantAuth",
    "name": "permissionTargets",
    "signature": "permissionTargets(bytes32 arg0,uint256 arg1)"
  },
  "0x9222a91c": {
    "contract": "MultiTenantAuth",
    "name": "previewAuth",
    "signature": "previewAuth(bytes32 slug,address caller,address target,bytes data,uint256 value,bytes options)"
  },
  "0xbd0115fb": {
    "contract": "MultiTenantAuth",
    "name": "purgeRole",
    "signature": "purgeRole(bytes32 slug,bytes32 roleSlug,uint256 limit)"
  },
  "0xd330de07": {
    "contract": "MultiTenantAuth",
    "name": "rateConfigs",
    "signature": "rateConfigs(bytes32 arg0,uint256 arg1)"
  },
  "0x029f779f": {
    "contract": "MultiTenantAuth",
    "name": "rateStates",
    "signature": "rateStates(bytes32 arg0,address arg1,address arg2,bytes4 arg3)"
  },
  "0xa3bcba62": {
    "contract": "MultiTenantAuth",
    "name": "registerOrgContract",
    "signature": "registerOrgContract(bytes32 slug,address target)"
  },
  "0x44ce9a7a": {
    "contract": "MultiTenantAuth",
    "name": "removeMembers",
    "signature": "removeMembers(bytes32 slug,uint256[] memberIds)"
  },
  "0x5f166985": {
    "contract": "MultiTenantAuth",
    "name": "resetRates",
    "signature": "resetRates(bytes32 slug,tuple[] resets)"
  },
  "0x0d709153": {
    "contract": "MultiTenantAuth",
    "name": "revokeRoles",
    "signature": "revokeRoles(bytes32 slug,uint256[] memberIds)"
  },
  "0xd5a2339e": {
    "contract": "MultiTenantAuth",
    "name": "roleExists",
    "signature": "roleExists(bytes32 slug,bytes32 roleSlug)"
  },
  "0x72b1d8cf": {
    "contract": "MultiTenantAuth",
    "name": "roleOf",
    "signature": "roleOf(uint256 memberId)"
  },
  "0xcc6624e6": {
    "contract": "MultiTenantAuth",
    "name": "roleOfWallet",
    "signature": "roleOfWallet(bytes32 slug,address wallet)"
  },
  "0xef5c2c63": {
    "contract": "MultiTenantAuth",
    "name": "rolePermLookup",
    "signature": "rolePermLookup(bytes32 arg0,bytes32 arg1,address arg2,bytes4 arg3)"
  },
  "0x7ab037e4": {
    "contract": "MultiTenantAuth",
    "name": "rolePermissionIds",
    "signature": "rolePermissionIds(bytes32 slug,bytes32 roleSlug)"
  },
  "0xdb1606c9": {
    "contract": "MultiTenantAuth",
    "name": "rotateWallet",
    "signature": "rotateWallet(bytes32 slug,uint256 memberId,address newWallet)"
  },
  "0x57964548": {
    "contract": "MultiTenantAuth",
    "name": "setFallbackAuthorizer",
    "signature": "setFallbackAuthorizer(bytes32 slug,address fallbackAddr)"
  },
  "0xf4c094c8": {
    "contract": "MultiTenantAuth",
    "name": "setLauncher",
    "signature": "setLauncher(address newLauncher)"
  },
  "0xffaffe13": {
    "contract": "MultiTenantAuth",
    "name": "setMemberAccountType",
    "signature": "setMemberAccountType(bytes32 slug,uint256[] memberIds,uint8[] types_)"
  },
  "0x43a278f1": {
    "contract": "MultiTenantAuth",
    "name": "setMemberNameSlug",
    "signature": "setMemberNameSlug(bytes32 slug,uint256 memberId,bytes32 newNameSlug)"
  },
  "0x48ec3fdd": {
    "contract": "MultiTenantAuth",
    "name": "setMembershipStatus",
    "signature": "setMembershipStatus(bytes32 slug,uint256[] memberIds,uint8[] statuses)"
  },
  "0xc3bf2649": {
    "contract": "MultiTenantAuth",
    "name": "setPaymentStatus",
    "signature": "setPaymentStatus(bytes32 slug,uint256[] memberIds,uint8[] statuses)"
  },
  "0xdd94ac9a": {
    "contract": "MultiTenantAuth",
    "name": "setPublicSig",
    "signature": "setPublicSig(bytes32 slug,address target,bytes4 sig,bool isPublic)"
  },
  "0xa71b2f1b": {
    "contract": "MultiTenantAuth",
    "name": "setTargetGrants",
    "signature": "setTargetGrants(bytes32 slug,tuple[] grants)"
  },
  "0xfb619f0d": {
    "contract": "MultiTenantAuth",
    "name": "sigRequirements",
    "signature": "sigRequirements(bytes32 arg0,uint256 arg1)"
  },
  "0x16ce90ea": {
    "contract": "MultiTenantAuth",
    "name": "slugState",
    "signature": "slugState(bytes32 arg0)"
  },
  "0xcb5d9da3": {
    "contract": "MultiTenantAuth",
    "name": "superAdminOf",
    "signature": "superAdminOf(bytes32 slug)"
  },
  "0x4f2f39bf": {
    "contract": "MultiTenantAuth",
    "name": "systemRoles",
    "signature": "systemRoles()"
  },
  "0x79f771a3": {
    "contract": "MultiTenantAuth",
    "name": "targetGrants",
    "signature": "targetGrants(bytes32 arg0,bytes32 arg1,address arg2)"
  },
  "0x75829def": {
    "contract": "MultiTenantAuth",
    "name": "transferAdmin",
    "signature": "transferAdmin(address newAdmin)"
  },
  "0x690224c0": {
    "contract": "MultiTenantAuth",
    "name": "transferSuperAdmin",
    "signature": "transferSuperAdmin(bytes32 slug,uint256 newSuperAdminId)"
  },
  "0x9f075de1": {
    "contract": "MultiTenantAuth",
    "name": "treasuryFoundation",
    "signature": "treasuryFoundation()"
  },
  "0xce82b1bd": {
    "contract": "MultiTenantAuth",
    "name": "unlockSlug",
    "signature": "unlockSlug(bytes32 slug)"
  },
  "0xc349892c": {
    "contract": "MultiTenantAuth",
    "name": "unpauseSlug",
    "signature": "unpauseSlug(bytes32 slug)"
  },
  "0x99eba908": {
    "contract": "MultiTenantAuth",
    "name": "unregisterOrgContract",
    "signature": "unregisterOrgContract(bytes32 slug,address target,address returnOwnerTo)"
  },
  "0x84f617c2": {
    "contract": "MultiTenantAuth",
    "name": "updatePermissions",
    "signature": "updatePermissions(bytes32 slug,uint256[] permIds,tuple[] perms)"
  },
  "0x7b614fad": {
    "contract": "MultiTenantAuth",
    "name": "updateRoles",
    "signature": "updateRoles(bytes32 slug,bytes32[] roleSlugs_,tuple[] rolesIn)"
  },
  "0x61201e18": {
    "contract": "MultiTenantAuth",
    "name": "validity",
    "signature": "validity(bytes32 arg0,uint256 arg1)"
  },
  "0x5fd2cbb3": {
    "contract": "DAOFactory",
    "name": "deploy",
    "signature": "deploy(tuple cfg)"
  },
  "0xc6d3370a": {
    "contract": "DAOFactory",
    "name": "deployFor",
    "signature": "deployFor(address owner,tuple cfg)"
  },
  "0xc0f5a12b": {
    "contract": "DAOFactory",
    "name": "namespacedFactory",
    "signature": "namespacedFactory()"
  },
  "0xc5e90b65": {
    "contract": "DAOFactory",
    "name": "templateProvider",
    "signature": "templateProvider()"
  },
  "0xdeaaa7cc": {
    "contract": "DAOGovernor",
    "name": "BALLOT_TYPEHASH",
    "signature": "BALLOT_TYPEHASH()"
  },
  "0x4bf5d7e9": {
    "contract": "DAOGovernor",
    "name": "CLOCK_MODE",
    "signature": "CLOCK_MODE()"
  },
  "0xdd4e2ba5": {
    "contract": "DAOGovernor",
    "name": "COUNTING_MODE",
    "signature": "COUNTING_MODE()"
  },
  "0x2fe3e261": {
    "contract": "DAOGovernor",
    "name": "EXTENDED_BALLOT_TYPEHASH",
    "signature": "EXTENDED_BALLOT_TYPEHASH()"
  },
  "0x452115d6": {
    "contract": "DAOGovernor",
    "name": "cancel",
    "signature": "cancel(address[] targets,uint256[] values,bytes[] calldatas,bytes32 descriptionHash)"
  },
  "0x56781388": {
    "contract": "DAOGovernor",
    "name": "castVote",
    "signature": "castVote(uint256 proposalId,uint8 support)"
  },
  "0x8ff262e3": {
    "contract": "DAOGovernor",
    "name": "castVoteBySig",
    "signature": "castVoteBySig(uint256 proposalId,uint8 support,address voter,bytes signature)"
  },
  "0x7b3c71d3": {
    "contract": "DAOGovernor",
    "name": "castVoteWithReason",
    "signature": "castVoteWithReason(uint256 proposalId,uint8 support,string reason)"
  },
  "0x5f398a14": {
    "contract": "DAOGovernor",
    "name": "castVoteWithReasonAndParams",
    "signature": "castVoteWithReasonAndParams(uint256 proposalId,uint8 support,string reason,bytes params)"
  },
  "0x5b8d0e0d": {
    "contract": "DAOGovernor",
    "name": "castVoteWithReasonAndParamsBySig",
    "signature": "castVoteWithReasonAndParamsBySig(uint256 proposalId,uint8 support,address voter,string reason,bytes params,bytes signature)"
  },
  "0x91ddadf4": {
    "contract": "DAOGovernor",
    "name": "clock",
    "signature": "clock()"
  },
  "0x84b0196e": {
    "contract": "DAOGovernor",
    "name": "eip712Domain",
    "signature": "eip712Domain()"
  },
  "0x2656227d": {
    "contract": "DAOGovernor",
    "name": "execute",
    "signature": "execute(address[] targets,uint256[] values,bytes[] calldatas,bytes32 descriptionHash)"
  },
  "0xa8f8a668": {
    "contract": "DAOGovernor",
    "name": "getProposalId",
    "signature": "getProposalId(address[] targets,uint256[] values,bytes[] calldatas,bytes32 descriptionHash)"
  },
  "0xeb9019d4": {
    "contract": "DAOGovernor",
    "name": "getVotes",
    "signature": "getVotes(address account,uint256 timepoint)"
  },
  "0x9a802a6d": {
    "contract": "DAOGovernor",
    "name": "getVotesWithParams",
    "signature": "getVotesWithParams(address account,uint256 timepoint,bytes params)"
  },
  "0x43859632": {
    "contract": "DAOGovernor",
    "name": "hasVoted",
    "signature": "hasVoted(uint256 proposalId,address account)"
  },
  "0xc59057e4": {
    "contract": "DAOGovernor",
    "name": "hashProposal",
    "signature": "hashProposal(address[] targets,uint256[] values,bytes[] calldatas,bytes32 descriptionHash)"
  },
  "0x7ecebe00": {
    "contract": "DAOGovernor",
    "name": "nonces",
    "signature": "nonces(address owner)"
  },
  "0xbc197c81": {
    "contract": "DAOGovernor",
    "name": "onERC1155BatchReceived",
    "signature": "onERC1155BatchReceived(address arg0,address arg1,uint256[] arg2,uint256[] arg3,bytes arg4)"
  },
  "0xf23a6e61": {
    "contract": "DAOGovernor",
    "name": "onERC1155Received",
    "signature": "onERC1155Received(address arg0,address arg1,uint256 arg2,uint256 arg3,bytes arg4)"
  },
  "0x150b7a02": {
    "contract": "DAOGovernor",
    "name": "onERC721Received",
    "signature": "onERC721Received(address arg0,address arg1,uint256 arg2,bytes arg3)"
  },
  "0xc01f9e37": {
    "contract": "DAOGovernor",
    "name": "proposalDeadline",
    "signature": "proposalDeadline(uint256 proposalId)"
  },
  "0xab58fb8e": {
    "contract": "DAOGovernor",
    "name": "proposalEta",
    "signature": "proposalEta(uint256 proposalId)"
  },
  "0xa9a95294": {
    "contract": "DAOGovernor",
    "name": "proposalNeedsQueuing",
    "signature": "proposalNeedsQueuing(uint256 proposalId)"
  },
  "0x143489d0": {
    "contract": "DAOGovernor",
    "name": "proposalProposer",
    "signature": "proposalProposer(uint256 proposalId)"
  },
  "0x2d63f693": {
    "contract": "DAOGovernor",
    "name": "proposalSnapshot",
    "signature": "proposalSnapshot(uint256 proposalId)"
  },
  "0xb58131b0": {
    "contract": "DAOGovernor",
    "name": "proposalThreshold",
    "signature": "proposalThreshold()"
  },
  "0x544ffc9c": {
    "contract": "DAOGovernor",
    "name": "proposalVotes",
    "signature": "proposalVotes(uint256 proposalId)"
  },
  "0x7d5e81e2": {
    "contract": "DAOGovernor",
    "name": "propose",
    "signature": "propose(address[] targets,uint256[] values,bytes[] calldatas,string description)"
  },
  "0x160cbed7": {
    "contract": "DAOGovernor",
    "name": "queue",
    "signature": "queue(address[] targets,uint256[] values,bytes[] calldatas,bytes32 descriptionHash)"
  },
  "0xf8ce560a": {
    "contract": "DAOGovernor",
    "name": "quorum",
    "signature": "quorum(uint256 timepoint)"
  },
  "0x97c3d334": {
    "contract": "DAOGovernor",
    "name": "quorumDenominator",
    "signature": "quorumDenominator()"
  },
  "0x60c4247f": {
    "contract": "DAOGovernor",
    "name": "quorumNumerator",
    "signature": "quorumNumerator(uint256 timepoint)"
  },
  "0xa7713a70": {
    "contract": "DAOGovernor",
    "name": "quorumNumerator",
    "signature": "quorumNumerator()"
  },
  "0xc28bc2fa": {
    "contract": "DAOGovernor",
    "name": "relay",
    "signature": "relay(address target,uint256 value,bytes data)"
  },
  "0xece40cc1": {
    "contract": "DAOGovernor",
    "name": "setProposalThreshold",
    "signature": "setProposalThreshold(uint256 newProposalThreshold)"
  },
  "0x79051887": {
    "contract": "DAOGovernor",
    "name": "setVotingDelay",
    "signature": "setVotingDelay(uint48 newVotingDelay)"
  },
  "0xe540d01d": {
    "contract": "DAOGovernor",
    "name": "setVotingPeriod",
    "signature": "setVotingPeriod(uint32 newVotingPeriod)"
  },
  "0x3e4f49e6": {
    "contract": "DAOGovernor",
    "name": "state",
    "signature": "state(uint256 proposalId)"
  },
  "0xd33219b4": {
    "contract": "DAOGovernor",
    "name": "timelock",
    "signature": "timelock()"
  },
  "0xfc0c546a": {
    "contract": "DAOGovernor",
    "name": "token",
    "signature": "token()"
  },
  "0x06f3f9e6": {
    "contract": "DAOGovernor",
    "name": "updateQuorumNumerator",
    "signature": "updateQuorumNumerator(uint256 newQuorumNumerator)"
  },
  "0xa890c910": {
    "contract": "DAOGovernor",
    "name": "updateTimelock",
    "signature": "updateTimelock(address newTimelock)"
  },
  "0x54fd4d50": {
    "contract": "DAOGovernor",
    "name": "version",
    "signature": "version()"
  },
  "0x3932abb1": {
    "contract": "DAOGovernor",
    "name": "votingDelay",
    "signature": "votingDelay()"
  },
  "0x02a251a3": {
    "contract": "DAOGovernor",
    "name": "votingPeriod",
    "signature": "votingPeriod()"
  },
  "0x42966c68": {
    "contract": "GovernanceToken",
    "name": "burn",
    "signature": "burn(uint256 value)"
  },
  "0x79cc6790": {
    "contract": "GovernanceToken",
    "name": "burnFrom",
    "signature": "burnFrom(address account,uint256 value)"
  },
  "0xf1127ed8": {
    "contract": "GovernanceToken",
    "name": "checkpoints",
    "signature": "checkpoints(address account,uint32 pos)"
  },
  "0x5c19a95c": {
    "contract": "GovernanceToken",
    "name": "delegate",
    "signature": "delegate(address delegatee)"
  },
  "0xc3cda520": {
    "contract": "GovernanceToken",
    "name": "delegateBySig",
    "signature": "delegateBySig(address delegatee,uint256 nonce,uint256 expiry,uint8 v,bytes32 r,bytes32 s)"
  },
  "0x587cde1e": {
    "contract": "GovernanceToken",
    "name": "delegates",
    "signature": "delegates(address account)"
  },
  "0x8e539e8c": {
    "contract": "GovernanceToken",
    "name": "getPastTotalSupply",
    "signature": "getPastTotalSupply(uint256 timepoint)"
  },
  "0x3a46b1a8": {
    "contract": "GovernanceToken",
    "name": "getPastVotes",
    "signature": "getPastVotes(address account,uint256 timepoint)"
  },
  "0x9ab24eb0": {
    "contract": "GovernanceToken",
    "name": "getVotes",
    "signature": "getVotes(address account)"
  },
  "0x40c10f19": {
    "contract": "GovernanceToken",
    "name": "mint",
    "signature": "mint(address to,uint256 amount)"
  },
  "0x4bf365df": {
    "contract": "GovernanceToken",
    "name": "mintable",
    "signature": "mintable()"
  },
  "0x6fcfff45": {
    "contract": "GovernanceToken",
    "name": "numCheckpoints",
    "signature": "numCheckpoints(address account)"
  },
  "0x8456cb59": {
    "contract": "GovernanceToken",
    "name": "pause",
    "signature": "pause()"
  },
  "0x5c975abb": {
    "contract": "GovernanceToken",
    "name": "paused",
    "signature": "paused()"
  },
  "0x715018a6": {
    "contract": "GovernanceToken",
    "name": "renounceOwnership",
    "signature": "renounceOwnership()"
  },
  "0x3f4ba83a": {
    "contract": "GovernanceToken",
    "name": "unpause",
    "signature": "unpause()"
  },
  "0xde9375f2": {
    "contract": "OrgAndDaoLauncher",
    "name": "auth",
    "signature": "auth()"
  },
  "0x48f7f2a3": {
    "contract": "OrgAndDaoLauncher",
    "name": "daoFactory",
    "signature": "daoFactory()"
  },
  "0xfff6a817": {
    "contract": "OrgAndDaoLauncher",
    "name": "launch",
    "signature": "launch(tuple cfg)"
  },
  "0xb62f7d8b": {
    "contract": "OrgAndDaoLauncher",
    "name": "launchFor",
    "signature": "launchFor(address owner,tuple cfg)"
  },
  "0x7d96da00": {
    "contract": "OrgAndDaoLauncher",
    "name": "orgManager",
    "signature": "orgManager()"
  },
  "0xe77772fe": {
    "contract": "OrgAndDaoLauncher",
    "name": "tokenFactory",
    "signature": "tokenFactory()"
  },
  "0xb08e51c0": {
    "contract": "TimelockController",
    "name": "CANCELLER_ROLE",
    "signature": "CANCELLER_ROLE()"
  },
  "0xa217fddf": {
    "contract": "TimelockController",
    "name": "DEFAULT_ADMIN_ROLE",
    "signature": "DEFAULT_ADMIN_ROLE()"
  },
  "0x07bd0265": {
    "contract": "TimelockController",
    "name": "EXECUTOR_ROLE",
    "signature": "EXECUTOR_ROLE()"
  },
  "0x8f61f4f5": {
    "contract": "TimelockController",
    "name": "PROPOSER_ROLE",
    "signature": "PROPOSER_ROLE()"
  },
  "0xc4d252f5": {
    "contract": "TimelockController",
    "name": "cancel",
    "signature": "cancel(bytes32 id)"
  },
  "0x134008d3": {
    "contract": "TimelockController",
    "name": "execute",
    "signature": "execute(address target,uint256 value,bytes payload,bytes32 predecessor,bytes32 salt)"
  },
  "0xe38335e5": {
    "contract": "TimelockController",
    "name": "executeBatch",
    "signature": "executeBatch(address[] targets,uint256[] values,bytes[] payloads,bytes32 predecessor,bytes32 salt)"
  },
  "0xf27a0c92": {
    "contract": "TimelockController",
    "name": "getMinDelay",
    "signature": "getMinDelay()"
  },
  "0x7958004c": {
    "contract": "TimelockController",
    "name": "getOperationState",
    "signature": "getOperationState(bytes32 id)"
  },
  "0x248a9ca3": {
    "contract": "TimelockController",
    "name": "getRoleAdmin",
    "signature": "getRoleAdmin(bytes32 role)"
  },
  "0xd45c4435": {
    "contract": "TimelockController",
    "name": "getTimestamp",
    "signature": "getTimestamp(bytes32 id)"
  },
  "0x2f2ff15d": {
    "contract": "TimelockController",
    "name": "grantRole",
    "signature": "grantRole(bytes32 role,address account)"
  },
  "0x91d14854": {
    "contract": "TimelockController",
    "name": "hasRole",
    "signature": "hasRole(bytes32 role,address account)"
  },
  "0x8065657f": {
    "contract": "TimelockController",
    "name": "hashOperation",
    "signature": "hashOperation(address target,uint256 value,bytes data,bytes32 predecessor,bytes32 salt)"
  },
  "0xb1c5f427": {
    "contract": "TimelockController",
    "name": "hashOperationBatch",
    "signature": "hashOperationBatch(address[] targets,uint256[] values,bytes[] payloads,bytes32 predecessor,bytes32 salt)"
  },
  "0x31d50750": {
    "contract": "TimelockController",
    "name": "isOperation",
    "signature": "isOperation(bytes32 id)"
  },
  "0x2ab0f529": {
    "contract": "TimelockController",
    "name": "isOperationDone",
    "signature": "isOperationDone(bytes32 id)"
  },
  "0x584b153e": {
    "contract": "TimelockController",
    "name": "isOperationPending",
    "signature": "isOperationPending(bytes32 id)"
  },
  "0x13bc9f20": {
    "contract": "TimelockController",
    "name": "isOperationReady",
    "signature": "isOperationReady(bytes32 id)"
  },
  "0x36568abe": {
    "contract": "TimelockController",
    "name": "renounceRole",
    "signature": "renounceRole(bytes32 role,address callerConfirmation)"
  },
  "0xd547741f": {
    "contract": "TimelockController",
    "name": "revokeRole",
    "signature": "revokeRole(bytes32 role,address account)"
  },
  "0x01d5062a": {
    "contract": "TimelockController",
    "name": "schedule",
    "signature": "schedule(address target,uint256 value,bytes data,bytes32 predecessor,bytes32 salt,uint256 delay)"
  },
  "0x8f2a0bb0": {
    "contract": "TimelockController",
    "name": "scheduleBatch",
    "signature": "scheduleBatch(address[] targets,uint256[] values,bytes[] payloads,bytes32 predecessor,bytes32 salt,uint256 delay)"
  },
  "0x64d62353": {
    "contract": "TimelockController",
    "name": "updateDelay",
    "signature": "updateDelay(uint256 newDelay)"
  },
  "0xf7c8e351": {
    "contract": "TokenFactory",
    "name": "deployFor",
    "signature": "deployFor(address owner,tuple cfg)"
  },
  "0x1fcb75ab": {
    "contract": "DiamondFactory",
    "name": "computeDiamondAddress",
    "signature": "computeDiamondAddress(address user,uint256 seed)"
  },
  "0x9bc0a1b7": {
    "contract": "DiamondFactory",
    "name": "deployDiamond",
    "signature": "deployDiamond(address defaultAuthorizer,bytes options,address diamondInitializer,bytes diamondInitializerOptions)"
  },
  "0xa9248e0d": {
    "contract": "DiamondFactory",
    "name": "userToNextWalletIndexMap",
    "signature": "userToNextWalletIndexMap(address user)"
  },
  "0x76d0e326": {
    "contract": "GlobalOrganizationRegistry",
    "name": "createOrganization",
    "signature": "createOrganization(bytes32 organizationId,address beacon)"
  },
  "0x4828da85": {
    "contract": "GlobalOrganizationRegistry",
    "name": "getBeacon",
    "signature": "getBeacon(bytes32 organizationId)"
  },
  "0xf304058b": {
    "contract": "GlobalOrganizationRegistry",
    "name": "getFacet",
    "signature": "getFacet(bytes32 organizationId,bytes32 facetId)"
  },
  "0x120b6107": {
    "contract": "GlobalOrganizationRegistry",
    "name": "getFacetIds",
    "signature": "getFacetIds(bytes32 organizationId)"
  },
  "0x22b3cd4e": {
    "contract": "GlobalOrganizationRegistry",
    "name": "getOrganization",
    "signature": "getOrganization(bytes32 organizationId)"
  },
  "0x6a64f2aa": {
    "contract": "GlobalOrganizationRegistry",
    "name": "hasFacet",
    "signature": "hasFacet(bytes32 organizationId,bytes32 facetId)"
  },
  "0x7dd56411": {
    "contract": "GlobalOrganizationRegistry",
    "name": "ownerOf",
    "signature": "ownerOf(bytes32 organizationId)"
  },
  "0xff240397": {
    "contract": "GlobalOrganizationRegistry",
    "name": "publishFacet",
    "signature": "publishFacet(bytes32 organizationId,bytes32 facetId,address facet,bytes4[] selectors)"
  },
  "0x6880cb5e": {
    "contract": "GlobalOrganizationRegistry",
    "name": "transferOrganization",
    "signature": "transferOrganization(bytes32 organizationId,address newOwner)"
  },
  "0x3c128045": {
    "contract": "GlobalOrganizationRegistry",
    "name": "updateBeacon",
    "signature": "updateBeacon(bytes32 organizationId,address newBeacon)"
  },
  "0x1e947467": {
    "contract": "NamespacedCreate3Factory",
    "name": "deploy",
    "signature": "deploy(address templateOwner,string templateName,bytes constructorParams,bytes initData)"
  },
  "0x3faa0dcd": {
    "contract": "NamespacedCreate3Factory",
    "name": "deployFor",
    "signature": "deployFor(address owner,address templateOwner,string templateName,bytes constructorParams,bytes initData)"
  },
  "0x451e5a1d": {
    "contract": "NamespacedCreate3Factory",
    "name": "deployForWithSig",
    "signature": "deployForWithSig(tuple req)"
  },
  "0x40fb838a": {
    "contract": "NamespacedCreate3Factory",
    "name": "deploymentCount",
    "signature": "deploymentCount(address arg0,bytes32 arg1)"
  },
  "0xd95b6371": {
    "contract": "NamespacedCreate3Factory",
    "name": "isOperatorFor",
    "signature": "isOperatorFor(address arg0,address arg1)"
  },
  "0x248f002e": {
    "contract": "NamespacedCreate3Factory",
    "name": "predictAddress",
    "signature": "predictAddress(address deployer,address templateOwner,string templateName,uint256 index)"
  },
  "0xd674af0f": {
    "contract": "NamespacedCreate3Factory",
    "name": "predictAddressFor",
    "signature": "predictAddressFor(address owner,address templateOwner,string templateName,uint256 index)"
  },
  "0x282e3eb9": {
    "contract": "NamespacedCreate3Factory",
    "name": "registerTemplate",
    "signature": "registerTemplate(string templateName,address provider)"
  },
  "0x558a7297": {
    "contract": "NamespacedCreate3Factory",
    "name": "setOperator",
    "signature": "setOperator(address operator,bool approved)"
  },
  "0x7ddd13b1": {
    "contract": "NamespacedCreate3Factory",
    "name": "templateProvider",
    "signature": "templateProvider(bytes32 arg0)"
  },
  "0xf1d84fe8": {
    "contract": "StateManipulatorDemo",
    "name": "getDemoState",
    "signature": "getDemoState()"
  },
  "0xe38ce47c": {
    "contract": "StateManipulatorDemo",
    "name": "setDemoValue",
    "signature": "setDemoValue(uint256 newValue)"
  },
  "0x7613e7ba": {
    "contract": "CaliburEntry",
    "name": "CUSTOM_STORAGE_ROOT",
    "signature": "CUSTOM_STORAGE_ROOT()"
  },
  "0x94430fa5": {
    "contract": "CaliburEntry",
    "name": "ENTRY_POINT",
    "signature": "ENTRY_POINT()"
  },
  "0x23d57886": {
    "contract": "CaliburEntry",
    "name": "approveNative",
    "signature": "approveNative(address spender,uint256 amount)"
  },
  "0x25e5c243": {
    "contract": "CaliburEntry",
    "name": "approveNativeTransient",
    "signature": "approveNativeTransient(address spender,uint256 amount)"
  },
  "0x6750aa5f": {
    "contract": "CaliburEntry",
    "name": "domainBytes",
    "signature": "domainBytes()"
  },
  "0xf698da25": {
    "contract": "CaliburEntry",
    "name": "domainSeparator",
    "signature": "domainSeparator()"
  },
  "0x99e1d016": {
    "contract": "CaliburEntry",
    "name": "execute",
    "signature": "execute(tuple batchedCall)"
  },
  "0xc3c16ee4": {
    "contract": "CaliburEntry",
    "name": "execute",
    "signature": "execute(tuple signedBatchedCall,bytes wrappedSignature)"
  },
  "0xe9ae5c53": {
    "contract": "CaliburEntry",
    "name": "execute",
    "signature": "execute(bytes32 mode,bytes executionData)"
  },
  "0x8dd7712f": {
    "contract": "CaliburEntry",
    "name": "executeUserOp",
    "signature": "executeUserOp(tuple userOp,bytes32 arg1)"
  },
  "0x12aaac70": {
    "contract": "CaliburEntry",
    "name": "getKey",
    "signature": "getKey(bytes32 keyHash)"
  },
  "0x0f3ebf6e": {
    "contract": "CaliburEntry",
    "name": "getKeySettings",
    "signature": "getKeySettings(bytes32 keyHash)"
  },
  "0x6a1ea88d": {
    "contract": "CaliburEntry",
    "name": "getSeq",
    "signature": "getSeq(uint256 key)"
  },
  "0x6575f6aa": {
    "contract": "CaliburEntry",
    "name": "hashTypedData",
    "signature": "hashTypedData(bytes32 hash)"
  },
  "0xb70e36f0": {
    "contract": "CaliburEntry",
    "name": "invalidateNonce",
    "signature": "invalidateNonce(uint256 newNonce)"
  },
  "0x27258b22": {
    "contract": "CaliburEntry",
    "name": "isRegistered",
    "signature": "isRegistered(bytes32 keyHash)"
  },
  "0x1626ba7e": {
    "contract": "CaliburEntry",
    "name": "isValidSignature",
    "signature": "isValidSignature(bytes32 digest,bytes wrappedSignature)"
  },
  "0x4223b5c2": {
    "contract": "CaliburEntry",
    "name": "keyAt",
    "signature": "keyAt(uint256 i)"
  },
  "0xfac750e0": {
    "contract": "CaliburEntry",
    "name": "keyCount",
    "signature": "keyCount()"
  },
  "0xb923614f": {
    "contract": "CaliburEntry",
    "name": "keyHashes",
    "signature": "keyHashes()"
  },
  "0xac9650d8": {
    "contract": "CaliburEntry",
    "name": "multicall",
    "signature": "multicall(bytes[] data)"
  },
  "0x28495877": {
    "contract": "CaliburEntry",
    "name": "namespaceAndVersion",
    "signature": "namespaceAndVersion()"
  },
  "0xe41dae2f": {
    "contract": "CaliburEntry",
    "name": "nativeAllowance",
    "signature": "nativeAllowance(address spender)"
  },
  "0x219a260d": {
    "contract": "CaliburEntry",
    "name": "nonceSequenceNumber",
    "signature": "nonceSequenceNumber(uint256 key)"
  },
  "0x30b1fa3b": {
    "contract": "CaliburEntry",
    "name": "register",
    "signature": "register(tuple key)"
  },
  "0xb75c7dc6": {
    "contract": "CaliburEntry",
    "name": "revoke",
    "signature": "revoke(bytes32 keyHash)"
  },
  "0xa4054c01": {
    "contract": "CaliburEntry",
    "name": "setExecutionAuthorityResolver",
    "signature": "setExecutionAuthorityResolver(address _authorityResolver)"
  },
  "0xd03c7914": {
    "contract": "CaliburEntry",
    "name": "supportsExecutionMode",
    "signature": "supportsExecutionMode(bytes32 mode)"
  },
  "0x789ff701": {
    "contract": "CaliburEntry",
    "name": "transferFromNative",
    "signature": "transferFromNative(address from,address recipient,uint256 amount)"
  },
  "0x786902f2": {
    "contract": "CaliburEntry",
    "name": "transferFromNativeTransient",
    "signature": "transferFromNativeTransient(address from,address recipient,uint256 amount)"
  },
  "0xbf7c5be9": {
    "contract": "CaliburEntry",
    "name": "transientNativeAllowance",
    "signature": "transientNativeAllowance(address spender)"
  },
  "0xa58bb84a": {
    "contract": "CaliburEntry",
    "name": "update",
    "signature": "update(bytes32 keyHash,uint256 settings)"
  },
  "0x1b71bb6e": {
    "contract": "CaliburEntry",
    "name": "updateEntryPoint",
    "signature": "updateEntryPoint(address entryPoint)"
  },
  "0x2abbf469": {
    "contract": "CaliburEntry",
    "name": "updateSalt",
    "signature": "updateSalt(uint96 prefix)"
  },
  "0x19822f7c": {
    "contract": "CaliburEntry",
    "name": "validateUserOp",
    "signature": "validateUserOp(tuple userOp,bytes32 userOpHash,uint256 missingAccountFunds)"
  },
  "0x1f931c1c": {
    "contract": "DiamondCutFacet",
    "name": "diamondCut",
    "signature": "diamondCut(tuple[] _diamondCut,address _init,bytes _calldata)"
  },
  "0xcdffacc6": {
    "contract": "DiamondLoupeFacet",
    "name": "facetAddress",
    "signature": "facetAddress(bytes4 _functionSelector)"
  },
  "0x52ef6b2c": {
    "contract": "DiamondLoupeFacet",
    "name": "facetAddresses",
    "signature": "facetAddresses()"
  },
  "0xadfca15e": {
    "contract": "DiamondLoupeFacet",
    "name": "facetFunctionSelectors",
    "signature": "facetFunctionSelectors(address _facet)"
  },
  "0x7a0ed627": {
    "contract": "DiamondLoupeFacet",
    "name": "facets",
    "signature": "facets()"
  },
  "0xc0845aed": {
    "contract": "DiamondLoupeFacet",
    "name": "setSupportedInterfaces",
    "signature": "setSupportedInterfaces(bytes4[] interfaceIds,bool supported)"
  },
  "0x1a833ee3": {
    "contract": "ExecuteFacet",
    "name": "batchExecute",
    "signature": "batchExecute(tuple[] calls)"
  },
  "0xb61d27f6": {
    "contract": "ExecuteFacet",
    "name": "execute",
    "signature": "execute(address to,uint256 value,bytes data)"
  },
  "0x38b64301": {
    "contract": "HookFacet",
    "name": "getFailureHook",
    "signature": "getFailureHook()"
  },
  "0x5cd2525e": {
    "contract": "HookFacet",
    "name": "getHooks",
    "signature": "getHooks()"
  },
  "0x17f33f6d": {
    "contract": "HookFacet",
    "name": "getPostHook",
    "signature": "getPostHook()"
  },
  "0xd4bdd21f": {
    "contract": "HookFacet",
    "name": "getPreHook",
    "signature": "getPreHook()"
  },
  "0xfe962f97": {
    "contract": "HookFacet",
    "name": "setFailureHook",
    "signature": "setFailureHook(address newFailureHook)"
  },
  "0x3d22c595": {
    "contract": "HookFacet",
    "name": "setPostHook",
    "signature": "setPostHook(address newPostHook)"
  },
  "0x6ed8b91a": {
    "contract": "HookFacet",
    "name": "setPreHook",
    "signature": "setPreHook(address newPreHook)"
  },
  "0xda7d64bc": {
    "contract": "OrganizationBeaconFacet",
    "name": "enrollOrganization",
    "signature": "enrollOrganization(bytes32 orgId)"
  },
  "0xe85dedac": {
    "contract": "OrganizationBeaconFacet",
    "name": "getOrganizationBeacon",
    "signature": "getOrganizationBeacon()"
  },
  "0xd45a5a36": {
    "contract": "OrganizationBeaconFacet",
    "name": "getOrganizationId",
    "signature": "getOrganizationId()"
  },
  "0x9aa054a5": {
    "contract": "OrganizationBeaconFacet",
    "name": "getOrganizationRegistry",
    "signature": "getOrganizationRegistry()"
  },
  "0x89ad48a9": {
    "contract": "OrganizationBeaconFacet",
    "name": "isOrganizationEnrolled",
    "signature": "isOrganizationEnrolled()"
  },
  "0x864f25ea": {
    "contract": "OrganizationBeaconFacet",
    "name": "setOrganizationRegistry",
    "signature": "setOrganizationRegistry(address registry)"
  },
  "0xe6e2240e": {
    "contract": "OrganizationBeaconFacet",
    "name": "unenrollOrganization",
    "signature": "unenrollOrganization()"
  },
  "0xa907fadc": {
    "contract": "SecureValueReserve",
    "name": "PERCENT_BIPS",
    "signature": "PERCENT_BIPS()"
  },
  "0xb64571ae": {
    "contract": "SecureValueReserve",
    "name": "cancelDefaultProposalDelayChange",
    "signature": "cancelDefaultProposalDelayChange()"
  },
  "0x7dcec51e": {
    "contract": "SecureValueReserve",
    "name": "cancelDefaultReleaseDelayChange",
    "signature": "cancelDefaultReleaseDelayChange()"
  },
  "0xbb0c4a7e": {
    "contract": "SecureValueReserve",
    "name": "cancelPolicyChange",
    "signature": "cancelPolicyChange(tuple scope)"
  },
  "0x434db2e1": {
    "contract": "SecureValueReserve",
    "name": "cancelWithdrawDestinationChange",
    "signature": "cancelWithdrawDestinationChange()"
  },
  "0x09ae1b29": {
    "contract": "SecureValueReserve",
    "name": "cancelWithdrawDestinationProposalDelayChange",
    "signature": "cancelWithdrawDestinationProposalDelayChange()"
  },
  "0x64044c65": {
    "contract": "SecureValueReserve",
    "name": "emergencyTransferOwnershipToWithdraw",
    "signature": "emergencyTransferOwnershipToWithdraw()"
  },
  "0x1f7ce811": {
    "contract": "SecureValueReserve",
    "name": "executeDefaultProposalDelayChange",
    "signature": "executeDefaultProposalDelayChange(uint32 newDelay)"
  },
  "0x76a653b3": {
    "contract": "SecureValueReserve",
    "name": "executeDefaultReleaseDelayChange",
    "signature": "executeDefaultReleaseDelayChange(uint32 newDelay)"
  },
  "0xe20705cd": {
    "contract": "SecureValueReserve",
    "name": "executePolicy",
    "signature": "executePolicy(tuple scope,tuple newPolicy)"
  },
  "0xa42fe6b5": {
    "contract": "SecureValueReserve",
    "name": "executeWithdrawDestinationChange",
    "signature": "executeWithdrawDestinationChange(address newDestination)"
  },
  "0xe77fd231": {
    "contract": "SecureValueReserve",
    "name": "executeWithdrawDestinationProposalDelayChange",
    "signature": "executeWithdrawDestinationProposalDelayChange(uint32 newDelay)"
  },
  "0x6bc07b2b": {
    "contract": "SecureValueReserve",
    "name": "getDelays",
    "signature": "getDelays()"
  },
  "0x0548e3f5": {
    "contract": "SecureValueReserve",
    "name": "getEffectiveLimitPolicy",
    "signature": "getEffectiveLimitPolicy(uint8 scopeKind,uint8 assetType,address asset,uint256 id)"
  },
  "0xbc5e0420": {
    "contract": "SecureValueReserve",
    "name": "policyKeyToReleaseUsageMap",
    "signature": "policyKeyToReleaseUsageMap(bytes32 arg0)"
  },
  "0x803d3dfe": {
    "contract": "SecureValueReserve",
    "name": "policyKeyTodelayReadyAtMap",
    "signature": "policyKeyTodelayReadyAtMap(bytes32 arg0)"
  },
  "0xf28682c1": {
    "contract": "SecureValueReserve",
    "name": "proposeDefaultProposalDelayChange",
    "signature": "proposeDefaultProposalDelayChange(uint32 newDelay)"
  },
  "0xf332eb42": {
    "contract": "SecureValueReserve",
    "name": "proposeDefaultReleaseDelayChange",
    "signature": "proposeDefaultReleaseDelayChange(uint32 newDelay)"
  },
  "0x6d6626aa": {
    "contract": "SecureValueReserve",
    "name": "proposePolicy",
    "signature": "proposePolicy(tuple scope,tuple newPolicy)"
  },
  "0x262582a2": {
    "contract": "SecureValueReserve",
    "name": "proposeWithdrawDestinationChange",
    "signature": "proposeWithdrawDestinationChange(address newDestination)"
  },
  "0x033d2305": {
    "contract": "SecureValueReserve",
    "name": "proposeWithdrawDestinationProposalDelayChange",
    "signature": "proposeWithdrawDestinationProposalDelayChange(uint32 newDelay)"
  },
  "0xace3ce7d": {
    "contract": "SecureValueReserve",
    "name": "release",
    "signature": "release(uint8 assetType,address asset,uint256 id,uint256 amount,address to)"
  },
  "0xec0c5c10": {
    "contract": "SecureValueReserve",
    "name": "withdraw",
    "signature": "withdraw(uint8 assetType,address asset,uint256 id,uint256 amount)"
  },
  "0xf930188a": {
    "contract": "SecureValueReserve",
    "name": "withdrawDestination",
    "signature": "withdrawDestination()"
  },
  "0xd14a6b6e": {
    "contract": "SecureValueReserveFactory",
    "name": "createReserve",
    "signature": "createReserve(address owner,address withdrawDestination,uint256 defaultProposalDelay,uint256 defaultReleaseDelay,uint256 defaultWithdrawAddressChangeDelay)"
  },
  "0x0a9839f3": {
    "contract": "CommissionRule",
    "name": "compute",
    "signature": "compute(tuple arg0,uint256 commissionBps,bytes config,bytes arg3)"
  },
  "0x918f8674": {
    "contract": "HoursThresholdRule",
    "name": "DENOMINATOR",
    "signature": "DENOMINATOR()"
  },
  "0xddbff5a9": {
    "contract": "PayrollManager",
    "name": "authorityResolver",
    "signature": "authorityResolver()"
  },
  "0xceec5032": {
    "contract": "PayrollManager",
    "name": "authorityResolverSetter",
    "signature": "authorityResolverSetter()"
  },
  "0x6982788a": {
    "contract": "PayrollManager",
    "name": "cancelPayroll",
    "signature": "cancelPayroll(bytes32 slug,uint256 payrollId)"
  },
  "0x801e7435": {
    "contract": "PayrollManager",
    "name": "configure",
    "signature": "configure(bytes32 slug,tuple[] ops)"
  },
  "0x1573063f": {
    "contract": "PayrollManager",
    "name": "configurePayBatch",
    "signature": "configurePayBatch(bytes32 slug,bytes32 payBatchCode,tuple[] actions)"
  },
  "0xd39921e3": {
    "contract": "PayrollManager",
    "name": "configurePayBatch",
    "signature": "configurePayBatch(bytes32 slug,bytes32 payBatchCode,uint256 payeeId,tuple[] assignments)"
  },
  "0x2500e308": {
    "contract": "PayrollManager",
    "name": "configurePayroll",
    "signature": "configurePayroll(bytes32 slug,uint256 payrollId,tuple[] actions)"
  },
  "0x6a1a7d3c": {
    "contract": "PayrollManager",
    "name": "configureSelf",
    "signature": "configureSelf(bytes32 slug,bytes[] calls)"
  },
  "0xce606ee0": {
    "contract": "PayrollManager",
    "name": "contractOwner",
    "signature": "contractOwner()"
  },
  "0xcb93d4ac": {
    "contract": "PayrollManager",
    "name": "createPayBatch",
    "signature": "createPayBatch(bytes32 slug,bytes32 payBatchCode)"
  },
  "0x62782533": {
    "contract": "PayrollManager",
    "name": "createPayroll",
    "signature": "createPayroll(bytes32 slug,bytes32 templateCode,uint256 startTime,uint256 endTime)"
  },
  "0xb622098d": {
    "contract": "PayrollManager",
    "name": "daoOf",
    "signature": "daoOf(bytes32 slug)"
  },
  "0xc4a91bdc": {
    "contract": "PayrollManager",
    "name": "finalizePayrollChunk",
    "signature": "finalizePayrollChunk(bytes32 slug,uint256 payrollId,uint256 limit)"
  },
  "0xb0329660": {
    "contract": "PayrollManager",
    "name": "getEarningsCode",
    "signature": "getEarningsCode(bytes32 slug,uint256 earningsCodeId)"
  },
  "0x408351a6": {
    "contract": "PayrollManager",
    "name": "getOrganizationEarningsCodes",
    "signature": "getOrganizationEarningsCodes(bytes32 slug,uint256 cursor,uint256 limit)"
  },
  "0xb8ff3ca0": {
    "contract": "PayrollManager",
    "name": "getOrganizationsByOwner",
    "signature": "getOrganizationsByOwner(address owner)"
  },
  "0x8e8fb58f": {
    "contract": "PayrollManager",
    "name": "getPayBatchCodes",
    "signature": "getPayBatchCodes(bytes32 slug)"
  },
  "0x20f8d5f5": {
    "contract": "PayrollManager",
    "name": "getPayBatchPayees",
    "signature": "getPayBatchPayees(bytes32 slug,bytes32 payBatchCode,uint256 cursor,uint256 limit)"
  },
  "0xccdef490": {
    "contract": "PayrollManager",
    "name": "getPayBatchPayeesWithDefaults",
    "signature": "getPayBatchPayeesWithDefaults(bytes32 slug,bytes32 payBatchCode,uint256 cursor,uint256 limit)"
  },
  "0xb3053d2c": {
    "contract": "PayrollManager",
    "name": "getPayrollGross",
    "signature": "getPayrollGross(bytes32 slug,uint256 payrollId,uint256 payeeId)"
  },
  "0x55f62bdb": {
    "contract": "PayrollManager",
    "name": "getPayrollGrosses",
    "signature": "getPayrollGrosses(bytes32 slug,uint256 payrollId,uint256 cursor,uint256 limit)"
  },
  "0xf01bdf47": {
    "contract": "PayrollManager",
    "name": "getPayrollInfo",
    "signature": "getPayrollInfo(bytes32 slug,uint256 payrollId)"
  },
  "0x375e26d6": {
    "contract": "PayrollManager",
    "name": "getPayrollNodeProgress",
    "signature": "getPayrollNodeProgress(bytes32 slug,uint256 payrollId)"
  },
  "0x98f99edc": {
    "contract": "PayrollManager",
    "name": "getPayrollPage",
    "signature": "getPayrollPage(bytes32 slug,uint256 payrollId,uint256 cursor,uint256 limit)"
  },
  "0x9690c496": {
    "contract": "PayrollManager",
    "name": "getPayrollRoster",
    "signature": "getPayrollRoster(bytes32 slug,uint256 payrollId)"
  },
  "0x26c92051": {
    "contract": "PayrollManager",
    "name": "getSystemEarningsCode",
    "signature": "getSystemEarningsCode(uint256 earningsCodeId)"
  },
  "0x1775ce3b": {
    "contract": "PayrollManager",
    "name": "getSystemEarningsCodes",
    "signature": "getSystemEarningsCodes(uint256 cursor,uint256 limit)"
  },
  "0x772d9657": {
    "contract": "PayrollManager",
    "name": "isPayeeInPayBatch",
    "signature": "isPayeeInPayBatch(bytes32 slug,bytes32 payBatchCode,uint256 payeeId)"
  },
  "0x714a9e38": {
    "contract": "PayrollManager",
    "name": "membersView",
    "signature": "membersView()"
  },
  "0xe532a034": {
    "contract": "PayrollManager",
    "name": "nameOf",
    "signature": "nameOf(bytes32 slug)"
  },
  "0xba51b14e": {
    "contract": "PayrollManager",
    "name": "organizations",
    "signature": "organizations(bytes32 arg0)"
  },
  "0x98de58b4": {
    "contract": "PayrollManager",
    "name": "payrollEngine",
    "signature": "payrollEngine()"
  },
  "0x63ac936e": {
    "contract": "PayrollManager",
    "name": "previewPayrollChunk",
    "signature": "previewPayrollChunk(bytes32 slug,uint256 payrollId,uint256 cursorOffset,uint256 limit)"
  },
  "0x3cee9170": {
    "contract": "PayrollManager",
    "name": "processPayrollChunk",
    "signature": "processPayrollChunk(bytes32 slug,uint256 payrollId,uint256 limit)"
  },
  "0xe5953479": {
    "contract": "PayrollManager",
    "name": "registerEarningsCode",
    "signature": "registerEarningsCode(bytes32 slug,bytes32 name,address rule,bytes config)"
  },
  "0x22dcdf68": {
    "contract": "PayrollManager",
    "name": "registerOrganization",
    "signature": "registerOrganization(string name)"
  },
  "0x4f67f3f8": {
    "contract": "PayrollManager",
    "name": "registerOrganizationFor",
    "signature": "registerOrganizationFor(address owner,string name)"
  },
  "0x1aeda2c2": {
    "contract": "PayrollManager",
    "name": "setAuthorityResolver",
    "signature": "setAuthorityResolver(address resolver)"
  },
  "0xfb2a0a87": {
    "contract": "PayrollManager",
    "name": "setEarningsCode",
    "signature": "setEarningsCode(bytes32 slug,uint256 earningsCodeId,bytes config,bool isActive)"
  },
  "0xd6aacfb6": {
    "contract": "PayrollManager",
    "name": "setMembersView",
    "signature": "setMembersView(address newView)"
  },
  "0xa7f072bc": {
    "contract": "PayrollManager",
    "name": "setOrganizationDao",
    "signature": "setOrganizationDao(bytes32 slug,address governor,address timelock)"
  },
  "0xd717bbd6": {
    "contract": "PayrollManager",
    "name": "slugOf",
    "signature": "slugOf(string name)"
  },
  "0x312e98a9": {
    "contract": "PayrollManager",
    "name": "slugToOrgInfoMap",
    "signature": "slugToOrgInfoMap(bytes32 arg0)"
  },
  "0xe7652cb9": {
    "contract": "PayrollManager",
    "name": "slugToPayrollToPayeeToTotalsMap",
    "signature": "slugToPayrollToPayeeToTotalsMap(bytes32 arg0,uint256 arg1,uint256 arg2)"
  },
  "0xd2c74346": {
    "contract": "PayrollManager",
    "name": "slugToPayrollToRunMap",
    "signature": "slugToPayrollToRunMap(bytes32 arg0,uint256 arg1)"
  },
  "0x61d027b3": {
    "contract": "PayrollManager",
    "name": "treasury",
    "signature": "treasury()"
  },
  "0x9711a543": {
    "contract": "PayrollManager",
    "name": "updateOwner",
    "signature": "updateOwner(bytes32 slug,address newOwner)"
  },
  "0x6c7f1542": {
    "contract": "PayrollTreasury",
    "name": "balanceOf",
    "signature": "balanceOf(bytes32 slug)"
  },
  "0x8909aa3f": {
    "contract": "PayrollTreasury",
    "name": "balances",
    "signature": "balances(bytes32 arg0)"
  },
  "0x1de26e16": {
    "contract": "PayrollTreasury",
    "name": "deposit",
    "signature": "deposit(bytes32 slug,uint256 amount)"
  },
  "0x9f4ed105": {
    "contract": "PayrollTreasury",
    "name": "organizationManager",
    "signature": "organizationManager()"
  },
  "0x97d4df67": {
    "contract": "PayrollTreasury",
    "name": "pay",
    "signature": "pay(bytes32 slug,address payee,uint256 amount)"
  },
  "0x3013ce29": {
    "contract": "PayrollTreasury",
    "name": "paymentToken",
    "signature": "paymentToken()"
  },
  "0x040cf020": {
    "contract": "PayrollTreasury",
    "name": "withdraw",
    "signature": "withdraw(bytes32 slug,uint256 amount)"
  },
  "0x211caeb7": {
    "contract": "SalaryPerSecondRule",
    "name": "compute",
    "signature": "compute(tuple arg0,uint256 ratePerPeriod,bytes arg2)"
  },
  "0xb09ecbbe": {
    "contract": "SimplePayrollEngine",
    "name": "compute",
    "signature": "compute(tuple ctx)"
  }
} as const;
