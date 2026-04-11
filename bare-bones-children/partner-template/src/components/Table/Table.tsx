import React, { useMemo } from "react";
import { Stack } from "../Primitives";
import { Text } from "../Primitives/Text";
import { Loader } from "../Loader/Loader";
import { TableRow } from "./Row";
import { TableSearch } from "./Search";
import { ScreenSize, useMediaQuery } from "../../hooks/useMediaQuery";

export interface TableColumn {
  key: string;
  header: string;
  render?: (value: any) => React.ReactNode;
  width?: string;
  allowOverflow?: boolean;
}

export interface TableRowData {
  id: string | number;
  cells: Record<string, any>;
  expandedContent?: (rowData: TableRowData) => React.ReactNode;
  leadingCell?: React.ReactNode;
  rowStyle?: React.CSSProperties;
}

export interface TableProps {
  columns: TableColumn[];
  data: TableRowData[];
  showSearch?: boolean;
  searchPlaceholder?: string;
  onSearch?: (searchTerm: string) => void;
  searchValue?: string;
  style?: React.CSSProperties;
  loading?: boolean;
  loadingLabel?: string;
}

export function Table({
  columns,
  data,
  showSearch = true,
  searchPlaceholder = "Search...",
  onSearch,
  searchValue = "",
  style,
  loading = false,
  loadingLabel = "Loading...",
}: TableProps) {
  const screenSize = useMediaQuery();
  const isPhone = screenSize === ScreenSize.Phone;
  const [internalSearchValue, setInternalSearchValue] =
    React.useState(searchValue);

  // Handle controlled/uncontrolled search
  const search = searchValue !== undefined ? searchValue : internalSearchValue;

  const handleSearch = (value: string) => {
    setInternalSearchValue(value);
    onSearch?.(value);
  };

  // Filter data based on search (simple substring match across all cells)
  const filteredData = useMemo(() => {
    if (!search.trim()) return data;
    const lowerSearch = search.toLowerCase();
    return data.filter((row) =>
      columns.some((col) => {
        const value = row.cells[col.key];
        return String(value).toLowerCase().includes(lowerSearch);
      })
    );
  }, [data, search, columns]);

  const hasLeadingCells = useMemo(
    () => data.some((row) => row.expandedContent || row.leadingCell),
    [data]
  );

  return (
    <Stack gap="md" style={style}>
      {showSearch && (
        <TableSearch
          value={search}
          onChange={handleSearch}
          placeholder={searchPlaceholder}
        />
      )}

      <div style={{ overflowX: "auto", overflowY: "visible" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            borderSpacing: 0,
          }}
        >
          <thead>
            <tr style={{ borderBottom: "2px solid var(--colors-border)" }}>
              {/* Expand column header (if any row has expandable content) */}
              {hasLeadingCells && (
                <th
                  style={{
                    textAlign: "left",
                    padding: isPhone ? "var(--spacing-xs)" : "var(--spacing-sm)",
                    color: "var(--colors-text-muted)",
                    fontWeight: 600,
                    fontSize: "0.875rem",
                    width: "30px",
                  }}
                />
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{
                    textAlign: "left",
                    padding: isPhone ? "var(--spacing-xs)" : "var(--spacing-sm)",
                    color: "var(--colors-text-muted)",
                    fontWeight: 600,
                    fontSize: "0.875rem",
                    width: col.width,
                  }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.length > 0 ? (
              filteredData.map((row, idx) => (
                <TableRow
                  key={row.id}
                  rowData={row}
                  columns={columns}
                  expandedContentRender={row.expandedContent}
                  leadingCell={row.leadingCell}
                  rowIndex={idx}
                  totalRows={filteredData.length}
                  rowStyle={row.rowStyle}
                />
              ))
            ) : loading ? (
              <tr>
                <td
                  colSpan={columns.length + (hasLeadingCells ? 1 : 0)}
                  style={{
                    padding: 0,
                    textAlign: "center",
                  }}
                >
                  <Loader kind="table" label={loadingLabel} />
                </td>
              </tr>
            ) : (
              <tr>
                <td
                  colSpan={columns.length + (hasLeadingCells ? 1 : 0)}
                  style={{
                    padding: "var(--spacing-lg)",
                    textAlign: "center",
                  }}
                >
                  <Text.Body color="muted">No results found</Text.Body>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Stack>
  );
}

export { TableRow } from "./Row";
export { TableSearch } from "./Search";

