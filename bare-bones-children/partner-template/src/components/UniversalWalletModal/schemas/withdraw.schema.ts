
import { UserScope } from "../../TokenSelect/types";
import {
  FieldComponent,
  //ActionNodeType,
  ActionSchema,
  ValuesFromSchema,
} from "../models";

export const WITHDRAW_SCHEMA = {
  fields: [
    {
      id: "asset",
      component: FieldComponent.TOKEN_AMOUNT_PICKER,
      label: "Asset",
      options: { userScope: UserScope.SmartWallet }
    },
    {
      id: "recipient",
      component: FieldComponent.ADDRESS,
      label: "Recipient Address",
    },
    // {
    //   id: "assetInfo",
    //   type: ActionNodeType.Resolver,
    //   component: FieldComponent.USE_TOKEN_INFO,
    //   deps: ["asset"],
    // },
  ],
} as const satisfies ActionSchema;

export type WithdrawModalResponse = ValuesFromSchema<typeof WITHDRAW_SCHEMA>;

export default WITHDRAW_SCHEMA;