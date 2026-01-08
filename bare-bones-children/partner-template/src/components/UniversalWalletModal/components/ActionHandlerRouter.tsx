import { Suspense } from "react";
import { UniversalActionType } from "../models";
import { LazyActionHandlerRegistry } from "./handlers/lazyActionRegistry";
import { useToastActionLifecycle } from "../hooks/useToastActionLifeCycle";

export function ActionHandlerRouter({
  action,
  values,
  walletAddress,
  children,
}: {
  action: UniversalActionType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  values: any;
  walletAddress: string;
  onDone: () => void;
  children: (execute: () => Promise<void>) => React.ReactNode;
}) {
  const lifecycle = useToastActionLifecycle();
  const Handler = LazyActionHandlerRegistry[action];

  if (!Handler) return null;

  return (
    <Suspense fallback={null}>
      <Handler
        values={values}
        walletAddress={walletAddress}
        lifeCycle={lifecycle}
      >
        {children}
      </Handler>
    </Suspense>
  );
}
