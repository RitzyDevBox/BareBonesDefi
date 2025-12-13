import { ActionSchema, FieldComponent, ValuesFromSchema } from "../models";

export const UNWRAP_SCHEMA = {
  fields: [
    {
      id: "amount",
      component: FieldComponent.AMOUNT,
      label: "WETH Amount",
    },
  ],
} as const satisfies ActionSchema;

export type UnwrapModalResponse = ValuesFromSchema<typeof UNWRAP_SCHEMA>;
export default UNWRAP_SCHEMA;