import { useEffect, useRef, useState } from "react";
import { ethers } from "ethers";
import DAOGovernorABI from "../../abis/dao/DAOGovernor.abi.json";
import { useGlobalTick } from "../useGlobalTick";

type Params = {
  governorAddress: string;
  account: string | null | undefined;
  provider: ethers.providers.Web3Provider | null | undefined;
  version: number;
};

type Result = {
  canPropose: boolean;
  eligibilityMessage: string | null;
  checkingEligibility: boolean;
};

export function useDaoProposerEligibility({ governorAddress, account, provider, version }: Params): Result {
  const [canPropose, setCanPropose] = useState(false);
  const [eligibilityMessage, setEligibilityMessage] = useState<string | null>(null);
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  // Periodic refresh — between txs blocks still advance (under
  // --block-time), so eligibility can flip from "not enough votes" to
  // "enough votes" once the chain progresses past the delegation block.
  // Tied to the shared global tick so we don't spin up a per-component
  // setInterval.
  const periodicRefresh = useGlobalTick(5);

  // SWR: only flip `checkingEligibility = true` on user-meaningful loads
  // (DAO/account/version changed). Background ticks recompute silently
  // and only swap state values when the new answer arrives — otherwise
  // every 5s the button flashes "Checking…" then back to its real label.
  const lastFreshKeyRef = useRef<string>("");

  useEffect(() => {
    let isActive = true;
    const governorInterface = new ethers.utils.Interface(DAOGovernorABI as any);

    function explainError(step: string, err: unknown): string {
      const anyErr = err as any;
      const code = anyErr?.code ? ` (${String(anyErr.code)})` : "";
      const reason = anyErr?.reason || anyErr?.shortMessage || anyErr?.message;
      const data = typeof anyErr?.data === "string" ? anyErr.data
        : typeof anyErr?.error?.data === "string" ? anyErr.error.data : null;

      if (data && data !== "0x") {
        try {
          const parsed = governorInterface.parseError(data);
          const argsText = parsed.args?.length ? `(${parsed.args.map((a) => String(a)).join(", ")})` : "";
          return `Eligibility check failed at ${step}: ${parsed.name}${argsText}${code}`;
        } catch { /* fall through */ }
      }
      if (data === "0x") {
        return `Eligibility check failed at ${step}: empty revert data${code}. This usually means this address is not the governor contract.`;
      }
      return `Eligibility check failed at ${step}: ${reason ? String(reason) : "unknown error"}${code}`;
    }

    async function checkEligibility() {
      if (!provider || !governorAddress || !account) {
        if (!isActive) return;
        setCanPropose(false);
        setEligibilityMessage("Connect your wallet to create proposals.");
        lastFreshKeyRef.current = "";
        return;
      }

      // Fresh load = something the user (or a tx) actually changed.
      // Silent refresh = the periodic tick fired. Only flip the loading
      // flag on the former; the latter recomputes quietly so the
      // Create-Proposal button doesn't flash "Checking…" every 5s.
      const freshKey = `${governorAddress}::${account}::${version}`;
      const isFreshLoad = lastFreshKeyRef.current !== freshKey;
      lastFreshKeyRef.current = freshKey;
      if (isFreshLoad) setCheckingEligibility(true);

      try {
        const codeAtAddress = await provider.getCode(governorAddress);
        if (codeAtAddress === "0x") {
          if (!isActive) return;
          setCanPropose(false);
          setEligibilityMessage("Governor address has no contract code.");
          return;
        }

        const governor = new ethers.Contract(governorAddress, DAOGovernorABI as any, provider);

        let threshold: ethers.BigNumber;
        let currentClock: ethers.BigNumber;

        try {
          threshold = ethers.BigNumber.from(await governor.proposalThreshold());
        } catch (err) {
          throw new Error(explainError("proposalThreshold()", err));
        }

        try {
          currentClock = ethers.BigNumber.from(await governor.clock());
        } catch (err) {
          throw new Error(explainError("clock()", err));
        }

        const timepoint = currentClock.gt(0) ? currentClock.sub(1) : ethers.BigNumber.from(0);
        let votingPower: ethers.BigNumber;
        let votingPowerAtCurrentClock: ethers.BigNumber = ethers.BigNumber.from(0);

        try {
          votingPower = ethers.BigNumber.from(await governor.getVotes(account, timepoint));
        } catch (err) {
          throw new Error(explainError("getVotes(account, timepoint)", err));
        }

        // "Current" voting power is queried on the token directly via
        // IVotes.getVotes(address) — the no-timepoint variant. Going
        // through Governor.getVotes(addr, currentClock) always reverts
        // with ERC5805FutureLookup ("0xecd3f81e: GG") because OZ
        // disallows querying votes at the live clock value. We fall back
        // to the historical value if the token call fails for any other
        // reason.
        try {
          const tokenAddress: string = await governor.token();
          if (ethers.utils.isAddress(tokenAddress) && tokenAddress !== ethers.constants.AddressZero) {
            const token = new ethers.Contract(
              tokenAddress,
              ["function getVotes(address) view returns (uint256)"],
              provider,
            );
            votingPowerAtCurrentClock = ethers.BigNumber.from(await token.getVotes(account));
          } else {
            votingPowerAtCurrentClock = votingPower;
          }
        } catch {
          votingPowerAtCurrentClock = votingPower;
        }

        if (!isActive) return;

        if (votingPower.lt(threshold)) {
          const needed = ethers.utils.formatUnits(threshold, 18);
          const have = ethers.utils.formatUnits(votingPower, 18);

          if (votingPowerAtCurrentClock.gte(threshold)) {
            setCanPropose(false);
            setEligibilityMessage("Delegation detected. You have enough votes at the current block, but proposer eligibility activates on the next block.");
            return;
          }

          setCanPropose(false);
          setEligibilityMessage(`Insufficient voting power: you have ${have} votes but need at least ${needed}. Self-delegate governance tokens first.`);
          return;
        }

        setCanPropose(true);
        setEligibilityMessage(null);
      } catch (err) {
        if (!isActive) return;
        setCanPropose(false);
        setEligibilityMessage(err instanceof Error ? err.message : "Unable to verify proposer eligibility for this DAO.");
      } finally {
        // Always clear when the active run finishes. Silent refreshes never
        // *set* the flag (the isFreshLoad guard above), so this is a no-op
        // for them. Gating the clear on isFreshLoad caused a stuck-true bug
        // when the effect re-fired mid-await: the cancelled run skipped
        // the clear (isActive=false), and the new run saw isFreshLoad=false
        // (ref already mutated) and skipped it too.
        if (isActive) setCheckingEligibility(false);
      }
    }

    void checkEligibility();
    return () => { isActive = false; };
  }, [provider, governorAddress, account, version, periodicRefresh]);

  return { canPropose, eligibilityMessage, checkingEligibility };
}
