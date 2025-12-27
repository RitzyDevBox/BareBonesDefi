import { UserScope } from "../../TokenSelect/TokenSelectFieldDisplay";
import { ActionSchema, FieldComponent, ValuesFromSchema } from "../models";


export const DEPOSIT_SCHEMA = {
  fields: [
    {
      id: "asset",
      component: FieldComponent.TOKEN_PICKER,
      label: "Asset",
      options: { userScope: UserScope.Account }
    },
    {
      id: "amount",
      component: FieldComponent.AMOUNT,
      label: "Amount",
    },
    // {
    //     id: "assetInfo",
    //     type: ActionNodeType.Resolver,
    //     component: FieldComponent.USE_TOKEN_INFO,
    //     deps: ["asset"],
    // }
  ],
} as const satisfies ActionSchema;

export type DepositModalResponse = ValuesFromSchema<typeof DEPOSIT_SCHEMA>;
export default DEPOSIT_SCHEMA;