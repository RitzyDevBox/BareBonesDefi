import { ReactNode } from "react";
import { Box } from "../BasicComponents";
import { useMediaQuery, ScreenSize } from "../../hooks/useMediaQuery";

export interface GridItem {
  id: string;
  content: ReactNode;
}

interface GridSelectorProps {
  items: GridItem[];
  onSelect: (item: GridItem, index: number) => void;
  footer?: ReactNode;
}

export function GridSelector({
  items,
  onSelect,
  footer,
}: GridSelectorProps) {
  const screen = useMediaQuery({ phoneMax: 520 });
  const isPhone = screen === ScreenSize.Phone;

  return (
    <Box>
      {items.length > 0 && (
        <Box
          style={{
            display: "grid",
            gridTemplateColumns: isPhone
              ? "repeat(2, 1fr)"
              : "repeat(3, 1fr)",
            gap: "var(--spacing-md)",
            marginBottom: "var(--spacing-lg)",
          }}
        >
          {items.map((item, index) => (
            <Box
              key={item.id}
              onClick={() => onSelect(item, index)}
              style={{
                padding: isPhone
                  ? "var(--spacing-sm)"
                  : "var(--spacing-md)",
                minHeight: isPhone ? 96 : 88,
                border: "1px solid var(--colors-border)",
                cursor: "pointer",
                textAlign: "center",
                borderRadius: "var(--radius-md)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                gap: "var(--spacing-xs)",
              }}
            >
              {item.content}
            </Box>
          ))}
        </Box>
      )}

      {footer}
    </Box>
  );
}
