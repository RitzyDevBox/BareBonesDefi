// hooks/useMediaQuery.ts
import { useEffect, useState } from "react";

export enum ScreenSize {
  Phone = "phone",
  Tablet = "tablet",
  Desktop = "desktop",
}

const PHONE_MAX = 480;
const TABLET_MAX = 900;

function getScreenSize(): ScreenSize {
  const w = window.innerWidth;
  if (w <= PHONE_MAX) return ScreenSize.Phone;
  if (w <= TABLET_MAX) return ScreenSize.Tablet;
  return ScreenSize.Desktop;
}

export function useMediaQuery() {
  const [size, setSize] = useState<ScreenSize>(() => getScreenSize());

  useEffect(() => {
    const handler = () => setSize(getScreenSize());
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return size;
}
