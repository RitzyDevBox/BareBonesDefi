import React, { useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Box, Input } from "../BasicComponents";


export interface VirtualizedListProps<T> {
  items: readonly T[];
  estimateItemHeight: number;
  renderRow: (item: T) => React.ReactNode;
  filterFn?: (item: T, query: string) => boolean;
  searchPlaceholder?: string;
}

export interface VirtualizedListProps<T> {
  items: readonly T[];
  estimateItemHeight: number;
  renderRow: (item: T) => React.ReactNode;
  filterFn?: (item: T, query: string) => boolean;
  searchPlaceholder?: string;
}

export function VirtualizedList<T>({
  items,
  estimateItemHeight,
  renderRow,
  filterFn,
  searchPlaceholder = "Search...",
}: VirtualizedListProps<T>) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState("");

  const filteredItems = useMemo(() => {
    if (!filterFn || query.trim() === "") return items;
    const q = query.toLowerCase();
    return items.filter((item) => filterFn(item, q));
  }, [items, filterFn, query]);

  const virtualizer = useVirtualizer({
    count: filteredItems.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimateItemHeight,
    overscan: 8,
  });

  return (
    <Box
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        overflowX: "hidden",
        overflowY: "hidden", // ⛔ parent never scrolls
      }}
    >
      {filterFn && (
        <Box style={{ flexShrink: 0 }}>
          <Input
            placeholder={searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </Box>
      )}

      <Box
        ref={scrollRef}
        style={{
          flex: 1,
          position: "relative",
          overflowX: "hidden",
          overflowY: "auto", // ✅ ONLY scrollbar
        }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            position: "relative",
          }}
        >
          {virtualizer.getVirtualItems().map((row) => (
            <div
              key={row.key}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${row.size}px`,
                transform: `translateY(${row.start}px)`,
              }}
            >
              {renderRow(filteredItems[row.index])}
            </div>
          ))}
        </div>
      </Box>
    </Box>
  );
}


