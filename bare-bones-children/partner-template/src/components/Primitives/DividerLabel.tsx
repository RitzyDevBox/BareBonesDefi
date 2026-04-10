import { Row } from "../Primitives";
import { Text } from "./Text";

interface DividerLabelProps {
  label: string;
}

export function DividerLabel({ label }: DividerLabelProps) {
  return (
    <Row gap="sm" align="center" wrap={false} style={{ width: "100%" }}>
      <div style={{ flex: 1, height: 1, background: "var(--colors-border)" }} />
      <Text.Label style={{ whiteSpace: "nowrap", lineHeight: 1 }}>{label}</Text.Label>
      <div style={{ flex: 1, height: 1, background: "var(--colors-border)" }} />
    </Row>
  );
}
