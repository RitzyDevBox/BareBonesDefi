import { UniversalActionType } from "./models";

export const LazyActionSchemaRegistry = {
  [UniversalActionType.SEND]: () => import("./schemas/send.schema"),
  [UniversalActionType.RECEIVE]: () => import("./schemas/receive.schema"),
  [UniversalActionType.WRAP]: () => import("./schemas/wrap.schema"),
  [UniversalActionType.UNWRAP]: () => import("./schemas/unwrap.schema"),
  [UniversalActionType.SWAP]: () => import("./schemas/swap.schema"),
  [UniversalActionType.ADD_V2_LP]: () => import("./schemas/add-v2-lp.schema"),
  [UniversalActionType.REMOVE_V2_LP]: () => import("./schemas/remove-v2-lp.schema"),
} as const;
