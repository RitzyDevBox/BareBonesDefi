import { ActionSchema, FieldComponent, ValuesFromSchema } from "../models";

export const WRAP_SCHEMA = {
  fields: [
    {
      id: "amount",
      component: FieldComponent.AMOUNT,
      label: "ETH Amount",
    },
  ],
} as const satisfies ActionSchema;

export type WrapModalResponse = ValuesFromSchema<typeof WRAP_SCHEMA>;
export default WRAP_SCHEMA;