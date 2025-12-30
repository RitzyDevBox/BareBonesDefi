import { NATIVE_ADDRESS } from "../../../constants/misc";
import { UserScope } from "../../TokenSelect/types";
import { ActionSchema, FieldComponent, ValuesFromSchema } from "../models";

export const WRAP_SCHEMA = {
  fields: [
    {
      id: "asset",
      component: FieldComponent.TOKEN_AMOUNT_PICKER,
      label: "ETH Amount",
      options: { 
        userScope: UserScope.SmartWallet,
        defaultTokenAddressResolver: () => NATIVE_ADDRESS,
        preventTokenChange: true
      }
    },
  ],
} as const satisfies ActionSchema;

export type WrapModalResponse = ValuesFromSchema<typeof WRAP_SCHEMA>;
export default WRAP_SCHEMA;