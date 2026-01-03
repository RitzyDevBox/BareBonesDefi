import React from "react";

/* ================= TYPES ================= */

export interface PartMeta {
  x: number;
  y: number;
  scale: number;
}

/* ================= CONFIG ================= */

export const logoConfig = {
  bone: { x: 0, y: 0, scale: 1 } satisfies PartMeta,
  paw: { x: 0, y: 0, scale: 1 } satisfies PartMeta,
  fingers: [
    { x: 0, y: 0, scale: 1 },
    { x: 0, y: 0, scale: 1 },
    { x: 0, y: 0, scale: 1 },
  ] satisfies PartMeta[],
};

/* ================= BONE GEOMETRY ================= */

const BONE_SCALE = 1.25;

const SHAFT_LEFT_X = 52;
const SHAFT_RIGHT_X = 76;
const SHAFT_TOP_Y = 36;
const SHAFT_BOTTOM_Y = 67;

// Colors
const BONE_COLOR   = "#ECEBE6"; // soft bone / porcelain
const BONE_STROKE  = "#B9B7AF"; // warm graphite

const PAW_COLOR    = "#4C5D73"; // slate blue-gray
const FINGER_COLOR = "#2F3A4A"; // deep charcoal-blue


/**
 * Cleaner, more intentional fracture
 * Symmetric, shallow, readable at small sizes
 */
const FRACTURE_OFFSETS = [
  { x: SHAFT_RIGHT_X, dy: 0 },
  { dx: -4, dy: 4 },
  { dx: -9, dy: 2 },
  { dx: -12, dy: 6 }, // center dip
  { dx: -15, dy: 2 },
  { dx: -20, dy: 4 },
  { x: SHAFT_LEFT_X, dy: 0 },
];

const FRACTURE_POINTS = FRACTURE_OFFSETS.map(p => {
  if ("x" in p) {
    return { x: p.x, y: SHAFT_BOTTOM_Y };
  }
  return {
    x: SHAFT_RIGHT_X + p.dx!,
    y: SHAFT_BOTTOM_Y + p.dy,
  };
});

/* ================= PAW GEOMETRY ================= */

const PAW_BASE = { x: 64, y: 52 };
const PAW_RADIUS = 13.5;

const FINGER_BASES = [
  { x: 47, y: 34 },
  { x: 64, y: 29 },
  { x: 81, y: 34 },
];

const FINGER_RADIUS = 7.5;

/* ================= LOGO ================= */

export function Logo() {
  const { bone, paw, fingers } = logoConfig;

  return (
    <svg width="100%" height="100%" viewBox="0 0 128 128">
      {/* ================= BONE ================= */}
      <g
        fill={BONE_COLOR}
        stroke={BONE_STROKE}
        strokeWidth={0.75}
        transform={`
          translate(64 64)
          translate(${bone.x} ${bone.y})
          scale(${BONE_SCALE})
          translate(-64 -64)
        `}
      >
        <path
          d={`
            M${SHAFT_LEFT_X} ${SHAFT_TOP_Y}
            L${SHAFT_RIGHT_X} ${SHAFT_TOP_Y}
            L${SHAFT_RIGHT_X + 1} ${SHAFT_BOTTOM_Y}
            ${FRACTURE_POINTS.map(p => `L${p.x} ${p.y}`).join(" ")}
            L${SHAFT_LEFT_X - 1} ${SHAFT_BOTTOM_Y}
            Z
          `}
        />

        {/* Top bone flares */}
        <circle cx={SHAFT_LEFT_X} cy={SHAFT_TOP_Y} r="14" />
        <circle cx={SHAFT_RIGHT_X} cy={SHAFT_TOP_Y} r="14" />
      </g>

      {/* ================= PAW PAD ================= */}
      <circle
        cx={PAW_BASE.x + paw.x}
        cy={PAW_BASE.y + paw.y}
        r={PAW_RADIUS}
        fill={PAW_COLOR}
      />

      {/* ================= FINGERS ================= */}
      {fingers.map((finger, i) => {
        const base = FINGER_BASES[i];
        return (
          <circle
            key={i}
            cx={base.x + finger.x}
            cy={base.y + finger.y}
            r={FINGER_RADIUS}
            fill={FINGER_COLOR}
          />
        );
      })}
    </svg>
  );
}

/* ================= TEST PAGE ================= */

export default function LogoTest() {
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#111",
      }}
    >
      <div style={{ width: "80vmin", height: "80vmin" }}>
        <Logo />
      </div>
    </div>
  );
}
