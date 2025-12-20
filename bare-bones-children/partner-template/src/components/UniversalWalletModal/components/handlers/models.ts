import { TxOpts } from "../../../../utils/transactionUtils";

export interface ActionHandlerProps<T> {
  values: T;
  walletAddress: string;
  onDone: () => void;
  lifeCycle?: TxOpts;
}
