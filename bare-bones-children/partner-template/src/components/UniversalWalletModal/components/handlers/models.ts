export interface ActionHandlerProps<T> {
  values: T;
  walletAddress: string;
  onDone: () => void;
}