import { ReactNode } from "react";

type HexGridItem = {
  id: string;
  content: ReactNode;
};

type Props = {
  items: HexGridItem[];
  columns: number;
  hexSize?: number;   // radius, same as background meaning
  spacing?: number;   // 1 = touching, >1 = spaced
};

export function HexGridFlow({
  items,
  columns,
  hexSize = 160,
  spacing = 1,
}: Props) {
  const size = hexSize;

  // Base geometry
  const hexHeight = Math.sqrt(3) * size;

  // Apply spacing multiplier
  const stepX = size * 1.5 * spacing;
  const stepY = hexHeight * spacing;
  const offsetY = (hexHeight / 2) * spacing;

  // Used to center grid horizontally
  const gridWidth = (columns - 1) * stepX + size * 2;

  // Convert flat item index to hex grid index (evens first, then odds)
  const itemIndexToHexPosition = (itemIndex: number) => {
    const col = itemIndex % columns;
    const row = Math.floor(itemIndex / columns);
    return { col, row };
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        minHeight: "600px",
      }}
    >
      {items.map((item, itemIndex) => {
        const { col, row } = itemIndexToHexPosition(itemIndex);

        // SAME coordinate system as AppBackground, with spacing
        const x = col * stepX;
        const y = row * stepY + (col % 2) * offsetY;

        return (
          <div
            key={item.id}
            style={{
              position: "absolute",
              left: "50%",
              top: 0,
              transform: `translate(${x - gridWidth / 2}px, ${y}px)`,
              width: size * 2,
              height: hexHeight,
            }}
          >
            {item.content}
          </div>
        );
      })}
    </div>
  );
}