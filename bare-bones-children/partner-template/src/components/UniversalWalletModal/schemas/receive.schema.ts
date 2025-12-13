import { ActionSchema, FieldComponent, ValuesFromSchema } from "../models";


export const RECEIVE_SCHEMA = {
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
  ],
} as const satisfies ActionSchema;

export type ReceiveModalResponse = ValuesFromSchema<typeof RECEIVE_SCHEMA>;
export default RECEIVE_SCHEMA;