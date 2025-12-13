import { ActionSchema, FieldComponent, ValuesFromSchema } from "../models";

export const REMOVE_V2_LP_SCHEMA = {
  fields: [
    {
      id: "lpAmount",
      component: FieldComponent.AMOUNT,
      label: "LP Amount",
    },
  ],
} as const satisfies ActionSchema;

export type RemoveLiquidityModalResponse = ValuesFromSchema<typeof REMOVE_V2_LP_SCHEMA>;
export default REMOVE_V2_LP_SCHEMA;