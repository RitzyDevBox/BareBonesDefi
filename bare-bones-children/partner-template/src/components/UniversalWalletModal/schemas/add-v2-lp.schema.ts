import { ActionSchema, FieldComponent, ValuesFromSchema } from "../models";


export const ADD_V2_LP_SCHEMA = {
  fields: [
    {
      id: "tokenA",
      component: FieldComponent.TOKEN_PICKER,
      label: "Token A",
    },
    {
      id: "amountA",
      component: FieldComponent.AMOUNT,
      label: "Amount A",
    },
    {
      id: "tokenB",
      component: FieldComponent.TOKEN_PICKER,
      label: "Token B",
    },
    {
      id: "amountB",
      component: FieldComponent.AMOUNT,
      label: "Amount B",
    },
  ],
} as const satisfies ActionSchema;

export type AddLiquidityModalResponse = ValuesFromSchema<typeof ADD_V2_LP_SCHEMA>;
export default ADD_V2_LP_SCHEMA;
