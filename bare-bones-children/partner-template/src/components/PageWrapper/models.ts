export interface PartMeta {
  x: number;
  y: number;
  scale: number;
}

export interface LogoProps {
  size?: number | string; // 👈 NEW
}

export const logoConfig = {
  bone: { x: 0, y: 0, scale: 1 } satisfies PartMeta,
  paw: { x: 0, y: 0, scale: 1 } satisfies PartMeta,
  fingers: [
    { x: 0, y: 0, scale: 1 },
    { x: 0, y: 0, scale: 1 },
    { x: 0, y: 0, scale: 1 },
  ] satisfies PartMeta[],
};
