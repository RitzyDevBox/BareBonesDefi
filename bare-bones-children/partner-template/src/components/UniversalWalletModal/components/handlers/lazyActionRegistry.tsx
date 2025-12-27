import { lazy, LazyExoticComponent } from "react";
import { UniversalActionType } from "../../models";
import { ActionHandlerProps } from "./models";

export type ActionHandlerComponent = LazyExoticComponent<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (props: ActionHandlerProps<any>) => JSX.Element | null
>;


export const LazyActionHandlerRegistry: Partial<
  Record<UniversalActionType, ActionHandlerComponent>
> = {
  [UniversalActionType.WITHDRAW]: lazy(() => import("./WithdrawActionHandler")),
  [UniversalActionType.DEPOSIT]: lazy(() => import("./DepositActionHandler")),
  [UniversalActionType.WRAP]: lazy(() => import("./WrapActionHandler")),
  [UniversalActionType.UNWRAP]: lazy(() => import("./UnwrapActionHandler")),
};
