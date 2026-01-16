// hooks/useMediaQuery.ts
import { useEffect, useState } from "react";

export enum ScreenSize {
  Phone = "phone",
  Tablet = "tablet",
  Desktop = "desktop",
}

type MediaQueryOptions = {
  phoneMax?: number;
  tabletMax?: number;
};

const DEFAULT_PHONE_MAX = 480;
const DEFAULT_TABLET_MAX = 900;

function getScreenSize(
  phoneMax: number,
  tabletMax: number
): ScreenSize {
  const w = window.innerWidth;
  if (w <= phoneMax) return ScreenSize.Phone;
  if (w <= tabletMax) return ScreenSize.Tablet;
  return ScreenSize.Desktop;
}

export function useMediaQuery(options?: MediaQueryOptions) {
  const phoneMax = options?.phoneMax ?? DEFAULT_PHONE_MAX;
  const tabletMax = options?.tabletMax ?? DEFAULT_TABLET_MAX;

  const [size, setSize] = useState<ScreenSize>(() =>
    getScreenSize(phoneMax, tabletMax)
  );

  useEffect(() => {
    const handler = () =>
      setSize(getScreenSize(phoneMax, tabletMax));

    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [phoneMax, tabletMax]);

  return size;
}
