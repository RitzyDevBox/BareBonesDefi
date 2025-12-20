import { Suspense } from "react";
import { UniversalActionType } from "../models";
import { LazyActionHandlerRegistry } from "./handlers/lazyActionRegistry";
import DefaultActionHandler from "./handlers/DefaultActionHandler";
import { useToastActionLifecycle } from "../hooks/useToastActionLifeCycle";

export function ActionHandlerRouter({
  action,
  values,
  walletAddress,
  onDone,
}: {
  action: UniversalActionType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  values: any;
  walletAddress: string;
  onDone: () => void;
}) {
  const lifecycle = useToastActionLifecycle();
  const Handler = LazyActionHandlerRegistry[action];

  if (!Handler) {
    return (
      <DefaultActionHandler
        action={action}
        onDone={onDone}
      />
    );
  }

  return (
    <Suspense fallback={null}>
      <Handler
        values={values}
        walletAddress={walletAddress}
        onDone={onDone}
        lifeCycle={lifecycle}
      />
    </Suspense>
  );
}
