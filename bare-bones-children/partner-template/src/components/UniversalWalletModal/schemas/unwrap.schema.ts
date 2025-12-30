import { CHAIN_INFO_MAP } from "../../../constants/misc";
import { UserScope } from "../../TokenSelect/types";
import { ActionSchema, FieldComponent, ValuesFromSchema } from "../models";

export const UNWRAP_SCHEMA = {
  fields: [
    {
      id: "asset",
      component: FieldComponent.TOKEN_AMOUNT_PICKER,
      label: "ETH Amount",
      options: { 
        userScope: UserScope.SmartWallet,
        defaultTokenAddressResolver: (chainId: number | undefined) => chainId ? CHAIN_INFO_MAP[chainId].wethAddress : undefined,
        preventTokenChange: true
      }
    },
  ],
} as const satisfies ActionSchema;

export type UnwrapModalResponse = ValuesFromSchema<typeof UNWRAP_SCHEMA>;
export default UNWRAP_SCHEMA;