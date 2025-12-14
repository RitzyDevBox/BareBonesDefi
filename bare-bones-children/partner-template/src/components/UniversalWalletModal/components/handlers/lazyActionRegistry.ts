import { lazy, LazyExoticComponent } from "react";
import { UniversalActionType } from "../../models";

type ActionHandlerComponent = LazyExoticComponent<
  (props: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    values: any;
    walletAddress: string;
    onDone: () => void;
  }) => JSX.Element | null
>;

// ⬇️ THIS annotation is the important part
export const LazyActionHandlerRegistry: Partial<
  Record<UniversalActionType, ActionHandlerComponent>
> = {
  [UniversalActionType.SEND]: lazy(
    () => import("./SendActionHandler")
  ),

  [UniversalActionType.RECEIVE]: lazy(
    () => import("./ReceiveActionHandler")
  ),
};
