/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";

export function useWalletConnectSession() {
  const [pendingProposal, setPendingProposal] = useState<any | null>(null);

  function onSessionProposal(proposal: any) {
    setPendingProposal(proposal);
  }

  function clearProposal() {
    setPendingProposal(null);
  }

  return {
    pendingProposal,
    onSessionProposal,
    clearProposal,
  };
}
