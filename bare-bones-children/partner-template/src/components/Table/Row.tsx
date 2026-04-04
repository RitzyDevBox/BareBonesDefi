import React, { useState } from "react";
import { Stack } from "../Primitives";
import type { TableRowData, TableColumn } from "./Table";

interface TableRowProps {
  rowData: TableRowData;
  columns: TableColumn[];
  expandedContentRender?: (rowData: TableRowData) => React.ReactNode;
  rowStyle?: React.CSSProperties;
  cellStyle?: React.CSSProperties;
  rowIndex?: number;
  totalRows?: number;
}

export function TableRow({
  rowData,
  columns,
  expandedContentRender,
  rowStyle,
  cellStyle,
  rowIndex = 0,
  totalRows = 0,
}: TableRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasExpandable = !!expandedContentRender;

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
        {hasExpandable && (
          <td
            style={{
              padding: "var(--spacing-sm)",
              width: "30px",
              textAlign: "center",
              ...cellStyle,
            }}
          >
            <span
              style={{
                display: "inline-block",
                transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                transition: "transform 200ms ease",
                color: "var(--colors-text-muted)",
              }}
            >
              ▶
            </span>
          </td>
        )}
        {cells.map((cell, idx) => (
          <td
            key={idx}
            style={{
              padding: "var(--spacing-sm)",
              maxWidth: "250px",
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
          <td colSpan={cells.length + 1} style={{ padding: "var(--spacing-md)" }}>
            <Stack gap="md">{expandedContentRender(rowData)}</Stack>
          </td>
        </tr>
      )}
    </>
  );
}
