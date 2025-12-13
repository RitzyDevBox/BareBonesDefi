import { UniversalActionType } from "../models";
import { SEND_SCHEMA } from "./send.schema";

export const ActionSchemas = {
  [UniversalActionType.SEND]: SEND_SCHEMA,
} as const;
