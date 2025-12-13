import {
  FieldComponent,
  ActionNodeType,
} from "../models";
import { ActionSchema } from "./types";


export const SEND_SCHEMA = {
  fields: [
    {
      id: "asset",
      component: FieldComponent.TOKEN_PICKER,
      label: "Asset",
    },
    {
      id: "amount",
      component: FieldComponent.AMOUNT,
      label: "Amount",
    },
    {
      id: "recipient",
      component: FieldComponent.ADDRESS,
      label: "Recipient Address",
    },
    {
      id: "assetInfo",
      type: ActionNodeType.Resolver,
      component: FieldComponent.USE_TOKEN_INFO,
      deps: ["asset"],
    },
  ],
} as const satisfies ActionSchema;
