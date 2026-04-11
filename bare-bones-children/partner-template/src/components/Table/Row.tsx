import React, { useState } from "react";
import { Stack } from "../Primitives";
import type { TableRowData, TableColumn } from "./Table";
import { ScreenSize, useMediaQuery } from "../../hooks/useMediaQuery";

interface TableRowProps {
  rowData: TableRowData;
  columns: TableColumn[];
  expandedContentRender?: (rowData: TableRowData) => React.ReactNode;
  leadingCell?: React.ReactNode;
  rowStyle?: React.CSSProperties;
  cellStyle?: React.CSSProperties;
  rowIndex?: number;
  totalRows?: number;
}

export function TableRow({
  rowData,
  columns,
  expandedContentRender,
  leadingCell,
  rowStyle,
  cellStyle,
  rowIndex = 0,
  totalRows = 0,
}: TableRowProps) {
  const screenSize = useMediaQuery();
  const isPhone = screenSize === ScreenSize.Phone;
  const [isExpanded, setIsExpanded] = useState(false);
  const hasExpandable = !!expandedContentRender;
  const hasLeadingCell = hasExpandable || Boolean(leadingCell);

  const handleToggle = () => {
    if (hasExpandable) {
      setIsExpanded(!isExpanded);
    }
  };

  // Render cell values
  const cells = columns.map((col) => {
    const value = rowData.cells[col.key];
    return col.render ? col.render(value) : value;
  });

  return (
    <>
      <tr
        onClick={handleToggle}
        style={{
          borderBottom: "1px solid var(--colors-border)",
          cursor: hasExpandable ? "pointer" : "default",
          ...rowStyle,
        }}
      >
        {hasLeadingCell && (
          <td
            style={{
              padding: isPhone ? "var(--spacing-xs)" : "var(--spacing-sm)",
              width: isPhone ? "22px" : "30px",
              textAlign: "center",
              ...cellStyle,
            }}
          >
            {leadingCell ? (
              <div onClick={(e) => e.stopPropagation()}>{leadingCell}</div>
            ) : (
              <span
                style={{
                  display: "inline-block",
                  transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                  transition: "transform 200ms ease",
                  color: "var(--colors-text-muted)",
                  fontSize: isPhone ? 11 : 14,
                }}
              >
                ▶
              </span>
            )}
          </td>
        )}
        {cells.map((cell, idx) => (
          <td
            key={idx}
            style={{
              padding: isPhone ? "var(--spacing-xs)" : "var(--spacing-sm)",
              maxWidth: isPhone ? "170px" : "250px",
              overflow: columns[idx]?.allowOverflow ? "visible" : "hidden",
              textOverflow: columns[idx]?.allowOverflow ? "clip" : "ellipsis",
              color: "var(--colors-text-main)",
              position: columns[idx]?.allowOverflow ? "relative" : undefined,
              zIndex: columns[idx]?.allowOverflow ? totalRows - rowIndex + 50 : undefined,
              ...cellStyle,
            }}
          >
            {React.isValidElement(cell) ? cell : cell as React.ReactNode}
          </td>
        ))}
      </tr>
      {hasExpandable && isExpanded && (
        <tr
          style={{
            borderBottom: "1px solid var(--colors-border)",
          }}
        >
          <td colSpan={cells.length + 1} style={{ padding: isPhone ? "var(--spacing-sm)" : "var(--spacing-md)" }}>
            <Stack gap="md">{expandedContentRender(rowData)}</Stack>
          </td>
        </tr>
      )}
    </>
  );
}
