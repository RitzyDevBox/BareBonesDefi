import { ActionSchema, FieldComponent, ValuesFromSchema } from "../models";

export const SWAP_SCHEMA = {
  fields: [
    {
      id: "tokenA",
      component: FieldComponent.TOKEN_PICKER,
      label: "From Token",
    },
    {
      id: "tokenB",
      component: FieldComponent.TOKEN_PICKER,
      label: "To Token",
    },
    {
      id: "amountIn",
      component: FieldComponent.AMOUNT,
      label: "Amount In",
    },
    {
      id: "slippage",
      component: FieldComponent.PERCENT,
      label: "Slippage",
    },
  ],
} as const satisfies ActionSchema;

export type SwapModalResponse = ValuesFromSchema<typeof SWAP_SCHEMA>;
export default SWAP_SCHEMA;