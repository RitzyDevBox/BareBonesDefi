import { Input } from "../BasicComponents";
import { Row } from "../Primitives";

interface TableSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function TableSearch({
  value,
  onChange,
  placeholder = "Search...",
}: TableSearchProps) {
  return (
    <Row style={{ marginBottom: "var(--spacing-md)" }}>
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ flex: 1 }}
      />
    </Row>
  );
}
