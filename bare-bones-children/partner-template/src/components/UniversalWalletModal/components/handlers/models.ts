import { TxOpts } from "../../../../utils/transactionUtils";

export interface ActionHandlerProps<T> {
  values: T;
  walletAddress: string;
  lifeCycle?: TxOpts;
  children: (execute: () => Promise<void>) => React.ReactNode;
}

