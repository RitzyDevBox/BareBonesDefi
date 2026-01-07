### UNIVERSAL MODAL OVERVIEW

## 1. Add new enum value to UniversalActionType
```ts
export enum UniversalActionType {
  WITHDRAW = "WITHDRAW",
  DEPOSIT = "DEPOSIT",
  WRAP = "WRAP",
  UNWRAP = "UNWRAP",
  SWAP = "SWAP",
  ADD_V2_LP = "ADD_V2_LP",
  REMOVE_V2_LP = "REMOVE_V2_LP",
  NEW_ACTION = "NEW_ACTION", // ← add this
}
```
## 2. Create a schema file: /schemas/<action>.schema.ts

```ts
export const NewActionSchema = {
  fields: [
    { id: "asset", component: FieldComponent.TOKEN_PICKER, label: "Asset" },
    { id: "amount", component: FieldComponent.AMOUNT, label: "Amount" },
    // etc...
  ]
};

export type NewActionModalResponse = ActionValues<
  UniversalActionType.NEW_ACTION
>;

export default NewActionSchema;

```

## 3. Register schema in LazyActionSchemaRegistry
```ts
export const LazyActionSchemaRegistry = {
  [UniversalActionType.WITHDRAW]: () => import("./schemas/withdraw.schema"),
  [UniversalActionType.DEPOSIT]: () => import("./schemas/deposit.schema"),
  [UniversalActionType.WRAP]: () => import("./schemas/wrap.schema"),
  [UniversalActionType.UNWRAP]: () => import("./schemas/unwrap.schema"),
  [UniversalActionType.SWAP]: () => import("./schemas/swap.schema"),
  [UniversalActionType.ADD_V2_LP]: () => import("./schemas/add-v2-lp.schema"),
  [UniversalActionType.REMOVE_V2_LP]: () => import("./schemas/remove-v2-lp.schema"),

  [UniversalActionType.NEW_ACTION]: () =>
    import("./schemas/new-action.schema"),  // ← add this
};
```
## 4. Create Action Handler Component: /<ActionName>ActionHandler.tsx
```ts
export default function NewActionHandler({ values, walletAddress, onDone }) {
  // handle values submitted from the modal
  console.log("NEW_ACTION submitted:", values);

  // perform async logic...
  // await something();

  onDone();
}
```
## 5. Register handler in LazyActionHandlerRegistry

```ts
export const LazyActionHandlerRegistry = {
  [UniversalActionType.WITHDRAW]: lazy(() => import("./WithdrawActionHandler")),
  [UniversalActionType.DEPOSIT]: lazy(() => import("./DepositActionHandler")),

  [UniversalActionType.NEW_ACTION]: lazy(
    () => import("./NewActionHandler")     // ← add this
  ),
};
```

### Dev Notes: 

Discovered issues to be fixed:

1. Universal wallet triggers duplicate actions because the ethers event if fire from useEffect instead of properly triggering it with an event.