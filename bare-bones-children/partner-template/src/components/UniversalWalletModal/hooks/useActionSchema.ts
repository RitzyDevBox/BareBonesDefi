import { useEffect, useState } from "react";
import { ActionSchema, UniversalActionType } from "../models";
import { LazyActionSchemaRegistry } from "../registry";


const cache: Partial<Record<UniversalActionType, ActionSchema>> = {};

export function useActionSchema(action: UniversalActionType) {
  const [schema, setSchema] = useState<ActionSchema | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (cache[action]) {
        setSchema(cache[action]!);
        return;
      }

      const mod = await LazyActionSchemaRegistry[action]();
      cache[action] = mod.default;

      if (!cancelled) {
        setSchema(mod.default);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [action]);

  return schema;
}
