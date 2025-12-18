import { useState, useCallback } from "react";

export interface NavigationOptions<T> {
  items: T[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (item: T) => void;
}

export function useListNavigation<T>({
  items,
  isOpen,
  onOpenChange,
  onSelect,
}: NavigationOptions<T>) {
  const [highlightIndex, setHighlightIndex] = useState(-1);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) {
        if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
          e.preventDefault();
          onOpenChange(true);
          setHighlightIndex(0);
        }
        return;
      }

      switch (e.key) {
        case "Escape":
          onOpenChange(false);
          break;

        case "ArrowDown":
          e.preventDefault();
          setHighlightIndex((i) =>
            i + 1 < items.length ? i + 1 : items.length - 1
          );
          break;

        case "ArrowUp":
          e.preventDefault();
          setHighlightIndex((i) => (i - 1 >= 0 ? i - 1 : 0));
          break;

        case "Enter":
          e.preventDefault();
          if (highlightIndex >= 0 && highlightIndex < items.length) {
            onSelect(items[highlightIndex]);
            onOpenChange(false);
          }
          break;
      }
    },
    [isOpen, items, highlightIndex, onOpenChange, onSelect]
  );

  return {
    highlightIndex,
    setHighlightIndex,
    handleKeyDown,
  };
}
