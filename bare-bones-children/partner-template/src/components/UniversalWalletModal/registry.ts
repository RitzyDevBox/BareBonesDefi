import { UniversalActionType } from "./models";


export type LazySchemaImport = () => Promise<{
  default: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fields: readonly any[];
  };
}>;

export const LazyActionSchemaRegistry: Partial<
  Record<UniversalActionType, LazySchemaImport>
> = {
  [UniversalActionType.SEND]: () => import("./schemas/send.schema"),
  [UniversalActionType.RECEIVE]: () => import("./schemas/receive.schema"),
  [UniversalActionType.WRAP]: () => import("./schemas/wrap.schema"),
  [UniversalActionType.UNWRAP]: () => import("./schemas/unwrap.schema"),
  [UniversalActionType.SWAP]: () => import("./schemas/swap.schema"),
  [UniversalActionType.ADD_V2_LP]: () => import("./schemas/add-v2-lp.schema"),
  [UniversalActionType.REMOVE_V2_LP]: () => import("./schemas/remove-v2-lp.schema"),
};
